'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2, Send, Save, Copy, ExternalLink, FileText, Check, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatarMoeda, formatarData, somarDias, hojeISO } from '@/lib/constantes'

const SITUACAO = {
  rascunho: { nome: 'Rascunho', cor: 'bg-slate-100 text-slate-600 ring-slate-200' },
  enviado: { nome: 'Aguardando cliente', cor: 'bg-sky-50 text-sky-700 ring-sky-200' },
  aprovado: { nome: 'Aprovado', cor: 'bg-marca-50 text-marca-700 ring-marca-200' },
  recusado: { nome: 'Recusado', cor: 'bg-red-50 text-red-600 ring-red-200' },
}

export function totalDe(itens, desconto) {
  const soma = (itens || []).reduce((t, i) => t + (Number(i.qtd) || 0) * (Number(i.valor) || 0), 0)
  return Math.max(soma - (Number(desconto) || 0), 0)
}

function novoForm(orc) {
  return {
    itens: orc?.itens?.length ? orc.itens : [{ descricao: '', qtd: 1, valor: '' }],
    desconto: orc?.desconto || '',
    validade: orc?.validade || somarDias(hojeISO(), 15),
    prazo: orc?.prazo || '',
    condicoes: orc?.condicoes || '',
    observacoes: orc?.observacoes || '',
  }
}

// Orçamento do chamado: montar, enviar o link e ver a resposta do cliente
export default function EditorOrcamento({ chamadoId, orcamento, onAlterado, onEnviarWhatsApp, iniciarEditando = false }) {
  const [editando, setEditando] = useState(iniciarEditando && !orcamento)
  const [form, setForm] = useState(() => novoForm(orcamento))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)

  const link = orcamento?.token && typeof window !== 'undefined' ? `${window.location.origin}/orcamento/${orcamento.token}` : ''
  const situacao = orcamento ? SITUACAO[orcamento.status] : null

  function abrirEdicao() {
    setForm(novoForm(orcamento))
    setErro('')
    setEditando(true)
  }

  function alterarItem(i, campo, valor) {
    const itens = form.itens.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it))
    setForm({ ...form, itens })
  }

  async function salvar(enviar) {
    setErro('')
    const itens = form.itens
      .filter((i) => i.descricao.trim())
      .map((i) => ({ descricao: i.descricao.trim(), qtd: Number(i.qtd) || 1, valor: Number(String(i.valor).replace(',', '.')) || 0 }))
    if (!itens.length) return setErro('Adicione pelo menos um item com descrição.')

    setSalvando(true)
    const dados = {
      chamado_id: chamadoId,
      itens,
      desconto: Number(String(form.desconto).replace(',', '.')) || 0,
      validade: form.validade || null,
      prazo: form.prazo.trim() || null,
      condicoes: form.condicoes.trim() || null,
      observacoes: form.observacoes.trim() || null,
    }
    if (enviar) {
      dados.status = 'enviado'
      dados.enviado_em = new Date().toISOString()
      dados.respondido_em = null
      dados.resposta_obs = null
    } else if (!orcamento || orcamento.status === 'rascunho') {
      dados.status = 'rascunho'
    }
    const { data, error } = await supabase.from('orcamentos').upsert(dados, { onConflict: 'chamado_id' }).select('*').single()
    setSalvando(false)
    if (error) return setErro('Não foi possível salvar: ' + error.message)
    setEditando(false)
    onAlterado(data)
    if (enviar) onEnviarWhatsApp?.(data)
  }

  async function salvarDireto() {
    setSalvando(true)
    const { data, error } = await supabase.from('orcamentos')
      .update({ status: 'enviado', enviado_em: new Date().toISOString() })
      .eq('id', orcamento.id).select('*').single()
    setSalvando(false)
    if (error) return alert('Não foi possível enviar: ' + error.message)
    onAlterado(data)
    onEnviarWhatsApp?.(data)
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      prompt('Copie o link:', link)
    }
  }

  // ---- Sem orçamento ----
  if (!orcamento && !editando) {
    return (
      <section className="card p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FileText size={16} /> Orçamento</h3>
        <p className="mt-1 text-sm text-slate-500">Monte o orçamento e envie um link para o cliente aprovar com um clique.</p>
        <button onClick={abrirEdicao} className="btn-primario mt-4"><Plus size={16} /> Criar orçamento</button>
      </section>
    )
  }

  // ---- Visualização ----
  if (!editando) {
    return (
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FileText size={16} /> Orçamento</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${situacao.cor}`}>{situacao.nome}</span>
        </div>

        <table className="mt-4 w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {orcamento.itens.map((i, idx) => (
              <tr key={idx}>
                <td className="py-1.5 pr-2 text-slate-700">{i.descricao}{i.qtd !== 1 && <span className="text-slate-400"> × {i.qtd}</span>}</td>
                <td className="py-1.5 text-right text-slate-700">{formatarMoeda(i.qtd * i.valor)}</td>
              </tr>
            ))}
            {Number(orcamento.desconto) > 0 && (
              <tr><td className="py-1.5 text-slate-500">Desconto</td><td className="py-1.5 text-right text-slate-500">− {formatarMoeda(orcamento.desconto)}</td></tr>
            )}
            <tr><td className="pt-2.5 font-semibold text-slate-900">Total</td><td className="pt-2.5 text-right text-base font-semibold text-slate-900">{formatarMoeda(totalDe(orcamento.itens, orcamento.desconto))}</td></tr>
          </tbody>
        </table>

        <div className="mt-3 space-y-0.5 text-xs text-slate-500">
          {orcamento.validade && <div>Válido até {formatarData(orcamento.validade)}</div>}
          {orcamento.enviado_em && <div>Enviado em {formatarData(orcamento.enviado_em, true)}</div>}
          {orcamento.respondido_em && <div>Respondido em {formatarData(orcamento.respondido_em, true)}</div>}
        </div>

        {orcamento.resposta_obs && (
          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="font-medium">Comentário do cliente:</span> {orcamento.resposta_obs}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {orcamento.status === 'rascunho' ? (
            <button onClick={() => salvarDireto()} disabled={salvando} className="btn-primario"><Send size={15} /> Enviar ao cliente</button>
          ) : (
            <>
              <button onClick={() => onEnviarWhatsApp?.(orcamento)} className="btn-primario"><Send size={15} /> Enviar no WhatsApp</button>
              <button onClick={copiar} className="btn-secundario">{copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? 'Copiado' : 'Copiar link'}</button>
              <a href={link} target="_blank" rel="noreferrer" className="btn-secundario"><ExternalLink size={15} /> Ver como cliente</a>
            </>
          )}
          <button onClick={abrirEdicao} className="btn-secundario"><Pencil size={15} /> {orcamento.status === 'rascunho' ? 'Editar' : 'Editar e reenviar'}</button>
        </div>
      </section>
    )

  }

  // ---- Edição ----
  const total = totalDe(
    form.itens.map((i) => ({ qtd: i.qtd, valor: String(i.valor).replace(',', '.') })),
    String(form.desconto).replace(',', '.'),
  )

  return (
    <section id="orcamento" className="card scroll-mt-4 p-5 ring-2 ring-marca-100">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FileText size={16} /> {orcamento ? 'Editar orçamento' : 'Novo orçamento'}</h3>
      {orcamento && orcamento.status !== 'rascunho' && (
        <p className="mt-1 text-xs text-amber-700">Ao reenviar, o cliente precisará aprovar novamente pelo mesmo link.</p>
      )}

      <div className="mt-4 space-y-2">
        <div className="hidden grid-cols-[1fr_70px_110px_32px] gap-2 text-xs font-medium text-slate-500 sm:grid">
          <span>Descrição</span><span>Qtd</span><span>Valor unit. (R$)</span><span />
        </div>
        {form.itens.map((item, i) => (
          <div key={i} className="grid grid-cols-[1fr_32px] gap-2 rounded-xl bg-slate-50 p-2 sm:grid-cols-[1fr_70px_110px_32px] sm:bg-transparent sm:p-0">
            <input className="input py-2" placeholder="Ex.: Pintura da sala (paredes e teto)" value={item.descricao}
              onChange={(e) => alterarItem(i, 'descricao', e.target.value)} />
            <button type="button" onClick={() => setForm({ ...form, itens: form.itens.filter((_, idx) => idx !== i) })}
              className="row-span-2 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 sm:order-last sm:row-span-1" aria-label="Remover item">
              <Trash2 size={16} />
            </button>
            <div className="grid grid-cols-2 gap-2 sm:contents">
              <input className="input py-2" inputMode="decimal" placeholder="Qtd" value={item.qtd}
                onChange={(e) => alterarItem(i, 'qtd', e.target.value)} />
              <input className="input py-2" inputMode="decimal" placeholder="0,00" value={item.valor}
                onChange={(e) => alterarItem(i, 'valor', e.target.value)} />
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setForm({ ...form, itens: [...form.itens, { descricao: '', qtd: 1, valor: '' }] })}
          className="btn-secundario py-2"><Plus size={15} /> Adicionar item</button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Desconto (R$)</label>
          <input className="input" inputMode="decimal" placeholder="0,00" value={form.desconto}
            onChange={(e) => setForm({ ...form, desconto: e.target.value })} />
        </div>
        <div>
          <label className="label">Válido até</label>
          <input type="date" className="input" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })} />
        </div>
        <div>
          <label className="label">Prazo de execução</label>
          <input className="input" placeholder="Ex.: 3 dias úteis" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
        </div>
        <div>
          <label className="label">Forma de pagamento</label>
          <input className="input" placeholder="Ex.: 50% na aprovação, 50% na entrega (Pix)" value={form.condicoes}
            onChange={(e) => setForm({ ...form, condicoes: e.target.value })} />
        </div>
      </div>
      <div className="mt-3">
        <label className="label">Observações</label>
        <textarea className="input min-h-[70px]" placeholder="Ex.: Material incluso. Não inclui remoção de entulho."
          value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-marca-50 px-4 py-3">
        <span className="text-sm font-medium text-marca-900">Total</span>
        <span className="text-lg font-semibold text-marca-900">{formatarMoeda(total)}</span>
      </div>

      {erro && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button onClick={() => setEditando(false)} className="btn-secundario" disabled={salvando}>Cancelar</button>
        {(!orcamento || orcamento.status === 'rascunho') && (
          <button onClick={() => salvar(false)} className="btn-secundario" disabled={salvando}><Save size={15} /> Salvar rascunho</button>
        )}
        <button onClick={() => salvar(true)} className="btn-primario" disabled={salvando}>
          {salvando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Salvar e enviar
        </button>
      </div>
    </section>
  )
}
