'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Plus, X, Loader2, CheckCircle2, MessageCircle, Receipt, Pencil, Trash2, AlertTriangle, Wallet, Clock, ExternalLink } from 'lucide-react'
import Carregando from '@/components/Carregando'
import { supabase } from '@/lib/supabase'
import { formatarMoeda, formatarData, hojeISO, linkWhatsApp, mascaraTelefone, FORMAS_PAGAMENTO } from '@/lib/constantes'

const FILTROS = [
  ['aberto', 'Em aberto'],
  ['atrasado', 'Atrasadas'],
  ['pago', 'Recebidas'],
  ['cancelado', 'Canceladas'],
  ['todos', 'Todas'],
]

function Janela({ titulo, onFechar, children }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
          <button type="button" onClick={onFechar} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}

export default function Financeiro() {
  const hoje = hojeISO()
  const [cobrancas, setCobrancas] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [clientes, setClientes] = useState([])
  const [filtro, setFiltro] = useState('aberto')
  const [mes, setMes] = useState(hoje.slice(0, 7))
  const [janela, setJanela] = useState(null) // { tipo: 'pagar'|'editar'|'nova', dados }
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function carregar() {
    const { data } = await supabase.from('cobrancas').select('*, chamados(id, protocolo)').order('vencimento', { ascending: true }).limit(2000)
    setCobrancas(data || [])
  }

  useEffect(() => {
    // Gera as cobranças novas (serviços concluídos e mensalidades) e carrega
    supabase.rpc('gerar_cobrancas').then(carregar)
    supabase.from('empresa').select('*').eq('id', 1).maybeSingle().then(({ data }) => setEmpresa(data))
    supabase.from('clientes').select('id, nome, telefone').order('nome').then(({ data }) => setClientes(data || []))
  }, [])

  const resumo = useMemo(() => {
    const l = cobrancas || []
    const abertas = l.filter((c) => c.status === 'pendente')
    const atrasadas = abertas.filter((c) => c.vencimento < hoje)
    const recebidas = l.filter((c) => c.status === 'pago' && (c.pago_em || '').slice(0, 7) === mes)
    const soma = (x) => x.reduce((t, c) => t + Number(c.valor), 0)
    return { aReceber: soma(abertas), atrasado: soma(atrasadas), nAtrasadas: atrasadas.length, recebido: soma(recebidas) }
  }, [cobrancas, hoje, mes])

  const lista = (cobrancas || []).filter((c) => {
    if (filtro === 'aberto') return c.status === 'pendente'
    if (filtro === 'atrasado') return c.status === 'pendente' && c.vencimento < hoje
    if (filtro === 'pago') return c.status === 'pago' && (c.pago_em || '').slice(0, 7) === mes
    if (filtro === 'cancelado') return c.status === 'cancelado'
    return true
  })
  if (filtro === 'pago') lista.sort((a, b) => (b.pago_em || '').localeCompare(a.pago_em || ''))

  function cobrar(c) {
    if (!c.telefone) return alert('Esta cobrança não tem telefone. Edite e informe o WhatsApp do cliente.')
    const nome = c.cliente_nome.split(/[—-]/)[0].trim()
    const venceu = c.vencimento < hoje
    const texto =
      `Olá, ${nome}! Tudo bem?\n\n` +
      `${venceu ? 'Consta em aberto' : 'Passando para lembrar'} o pagamento de *${c.descricao}*, ` +
      `no valor de *${formatarMoeda(c.valor)}*, ${venceu ? 'que venceu' : 'com vencimento'} em ${formatarData(c.vencimento)}.` +
      (empresa?.chave_pix ? `\n\nChave Pix: *${empresa.chave_pix}*\n(${empresa.nome || 'Grupo RD'}${empresa.cnpj ? ' · CNPJ ' + empresa.cnpj : ''})` : '') +
      `\n\nSe já pagou, por favor desconsidere. Obrigado!\n${empresa?.nome || 'Grupo RD'}`
    window.open(linkWhatsApp(c.telefone, texto), '_blank')
  }

  function abrir(tipo, c) {
    setErro('')
    if (tipo === 'pagar') setJanela({ tipo, dados: { ...c, pago_em: hoje, forma_pagamento: c.forma_pagamento || 'Pix' } })
    else if (tipo === 'editar') setJanela({ tipo, dados: { ...c, valor: String(c.valor).replace('.', ','), telefone: c.telefone || '', observacoes: c.observacoes || '' } })
    else setJanela({ tipo, dados: { cliente_nome: '', telefone: '', descricao: '', valor: '', vencimento: hoje, observacoes: '' } })
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    const d = janela.dados
    let res
    if (janela.tipo === 'pagar') {
      res = await supabase.from('cobrancas').update({ status: 'pago', pago_em: d.pago_em, forma_pagamento: d.forma_pagamento }).eq('id', d.id)
    } else {
      const dados = {
        cliente_nome: d.cliente_nome.trim(),
        telefone: d.telefone || null,
        descricao: d.descricao.trim(),
        valor: Number(String(d.valor).replace(/\./g, '').replace(',', '.')) || 0,
        vencimento: d.vencimento,
        observacoes: d.observacoes?.trim() || null,
      }
      res = janela.tipo === 'nova'
        ? await supabase.from('cobrancas').insert(dados)
        : await supabase.from('cobrancas').update({ ...dados, status: d.status, pago_em: d.status === 'pago' ? (d.pago_em || hoje) : null }).eq('id', d.id)
    }
    setSalvando(false)
    if (res.error) return setErro(res.error.message)
    setJanela(null)
    carregar()
  }

  async function excluir(c) {
    const aviso = c.contrato_id ? '\n\nObs.: mensalidades de contrato não voltam a ser criadas para o mesmo mês. Prefira "Cancelada" se não for cobrar.' : ''
    if (!confirm(`Excluir a cobrança "${c.descricao}" (${formatarMoeda(c.valor)})?${aviso}`)) return
    await supabase.from('cobrancas').delete().eq('id', c.id)
    setJanela(null)
    carregar()
  }

  const alterar = (campo) => (e) => setJanela({
    ...janela, dados: { ...janela.dados, [campo]: campo === 'telefone' ? mascaraTelefone(e.target.value) : e.target.value },
  })
  const d = janela?.dados

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="titulo-pagina">Financeiro</h1>
          <p className="text-sm text-slate-500">Cobranças de serviços e mensalidades de contratos</p>
        </div>
        <button onClick={() => abrir('nova')} className="btn-primario"><Plus size={17} /> Nova cobrança</button>
      </div>

      {!cobrancas ? <Carregando /> : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <button onClick={() => setFiltro('aberto')} className="card p-4 text-left hover:shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500"><Wallet size={15} /> A receber</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{formatarMoeda(resumo.aReceber)}</div>
            </button>
            <button onClick={() => setFiltro('atrasado')} className={`card p-4 text-left hover:shadow-sm ${resumo.nAtrasadas ? 'border-red-200 bg-red-50/50' : ''}`}>
              <div className="flex items-center gap-2 text-sm text-slate-500"><AlertTriangle size={15} className={resumo.nAtrasadas ? 'text-red-600' : ''} /> Em atraso</div>
              <div className={`mt-1 text-xl font-semibold ${resumo.nAtrasadas ? 'text-red-700' : 'text-slate-900'}`}>{formatarMoeda(resumo.atrasado)}</div>
              {resumo.nAtrasadas > 0 && <div className="text-xs text-red-600">{resumo.nAtrasadas} cobrança(s)</div>}
            </button>
            <div className="card p-4">
              <div className="flex items-center justify-between gap-2 text-sm text-slate-500">
                <span className="flex items-center gap-2"><CheckCircle2 size={15} /> Recebido em</span>
                <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="rounded-md border border-slate-200 px-1.5 py-0.5 text-xs" />
              </div>
              <div className="mt-1 text-xl font-semibold text-marca-700">{formatarMoeda(resumo.recebido)}</div>
            </div>
          </div>

          <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
            {FILTROS.map(([k, n]) => (
              <button key={k} onClick={() => setFiltro(k)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${filtro === k ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
                {n}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {lista.length === 0 ? (
              <div className="card p-8 text-center text-sm text-slate-400">Nada por aqui.</div>
            ) : lista.map((c) => {
              const atrasada = c.status === 'pendente' && c.vencimento < hoje
              return (
                <div key={c.id} className={`card flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${atrasada ? 'border-red-200' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-900">{c.cliente_nome}</div>
                    <div className="truncate text-sm text-slate-500">
                      {c.descricao}
                      {c.chamados && <Link href={`/admin/chamados/${c.chamados.id}`} className="ml-1 inline-flex items-center text-marca-700"><ExternalLink size={12} /></Link>}
                    </div>
                    <div className={`mt-0.5 flex items-center gap-1 text-xs ${atrasada ? 'font-medium text-red-600' : 'text-slate-400'}`}>
                      <Clock size={12} />
                      {c.status === 'pago'
                        ? `Recebido em ${formatarData(c.pago_em)}${c.forma_pagamento ? ' · ' + c.forma_pagamento : ''}`
                        : c.status === 'cancelado' ? 'Cancelada'
                        : `${atrasada ? 'Venceu' : 'Vence'} em ${formatarData(c.vencimento)}`}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className={`text-lg font-semibold ${c.status === 'pago' ? 'text-marca-700' : c.status === 'cancelado' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {formatarMoeda(c.valor)}
                    </span>
                    {c.status === 'pendente' && (
                      <>
                        <button onClick={() => abrir('pagar', c)} className="btn-primario px-3 py-1.5"><CheckCircle2 size={14} /> Recebido</button>
                        <button onClick={() => cobrar(c)} className="btn-secundario px-3 py-1.5"><MessageCircle size={14} className="text-marca-600" /> Cobrar</button>
                      </>
                    )}
                    {c.status === 'pago' && (
                      <Link href={`/admin/financeiro/recibo/${c.id}`} target="_blank" className="btn-secundario px-3 py-1.5"><Receipt size={14} /> Recibo</Link>
                    )}
                    <button onClick={() => abrir('editar', c)} className="btn-secundario px-2.5 py-1.5" aria-label="Editar"><Pencil size={14} /></button>
                  </div>
                </div>
              )
            })}
          </div>
          {!empresa?.chave_pix && (
            <p className="mt-4 text-xs text-slate-400">Dica: cadastre a <Link href="/admin/empresa" className="underline">chave Pix</Link> para ela ir junto na mensagem de cobrança e no recibo.</p>
          )}
        </>
      )}

      {janela?.tipo === 'pagar' && (
        <Janela titulo="Registrar recebimento" onFechar={() => setJanela(null)}>
          <form onSubmit={salvar} className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="font-medium text-slate-900">{d.cliente_nome}</div>
              <div className="text-slate-500">{d.descricao}</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{formatarMoeda(d.valor)}</div>
            </div>
            <div>
              <label className="label">Data do pagamento</label>
              <input type="date" className="input" required value={d.pago_em} onChange={alterar('pago_em')} />
            </div>
            <div>
              <span className="label">Forma de pagamento</span>
              <div className="flex flex-wrap gap-1.5">
                {FORMAS_PAGAMENTO.map((f) => (
                  <button key={f} type="button" onClick={() => setJanela({ ...janela, dados: { ...d, forma_pagamento: f } })}
                    className={`rounded-full border px-3 py-1.5 text-sm ${d.forma_pagamento === f ? 'border-marca-500 bg-marca-50 text-marca-800' : 'border-slate-200 text-slate-600'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            <button className="btn-primario w-full py-3" disabled={salvando}>
              {salvando ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />} Confirmar recebimento
            </button>
          </form>
        </Janela>
      )}

      {(janela?.tipo === 'nova' || janela?.tipo === 'editar') && (
        <Janela titulo={janela.tipo === 'nova' ? 'Nova cobrança' : 'Editar cobrança'} onFechar={() => setJanela(null)}>
          <form onSubmit={salvar} className="space-y-4">
            {janela.tipo === 'nova' && clientes.length > 0 && (
              <div>
                <label className="label">Cliente cadastrado (opcional)</label>
                <select className="input" defaultValue="" onChange={(e) => {
                  const c = clientes.find((x) => x.id === e.target.value)
                  if (c) setJanela({ ...janela, dados: { ...d, cliente_nome: c.nome, telefone: c.telefone || '' } })
                }}>
                  <option value="">— Escolha ou digite abaixo —</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">Cliente</label>
              <input className="input" required value={d.cliente_nome} onChange={alterar('cliente_nome')} />
            </div>
            <div>
              <label className="label">WhatsApp</label>
              <input className="input" inputMode="tel" value={d.telefone} onChange={alterar('telefone')} placeholder="(71) 99999-9999" />
            </div>
            <div>
              <label className="label">Referente a</label>
              <input className="input" required value={d.descricao} onChange={alterar('descricao')} placeholder="Ex.: Limpeza pós-obra — apto 302" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Valor (R$)</label>
                <input className="input" required inputMode="decimal" value={d.valor} onChange={alterar('valor')} placeholder="0,00" />
              </div>
              <div>
                <label className="label">Vencimento</label>
                <input type="date" className="input" required value={d.vencimento} onChange={alterar('vencimento')} />
              </div>
            </div>
            {janela.tipo === 'editar' && (
              <div>
                <span className="label">Situação</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[['pendente', 'Em aberto'], ['pago', 'Recebida'], ['cancelado', 'Cancelada']].map(([k, n]) => (
                    <button key={k} type="button" onClick={() => setJanela({ ...janela, dados: { ...d, status: k } })}
                      className={`rounded-lg border py-2 text-sm font-medium ${d.status === k ? 'border-marca-500 bg-marca-50 text-marca-700' : 'border-slate-200 text-slate-600'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="label">Observações</label>
              <textarea className="input min-h-[60px]" value={d.observacoes} onChange={alterar('observacoes')} />
            </div>
            {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            <div className="flex items-center justify-between gap-2">
              {janela.tipo === 'editar' ? (
                <button type="button" onClick={() => excluir(d)} className="btn-perigo"><Trash2 size={15} /> Excluir</button>
              ) : <span />}
              <button className="btn-primario" disabled={salvando}>
                {salvando && <Loader2 size={16} className="animate-spin" />} Salvar
              </button>
            </div>
          </form>
        </Janela>
      )}
    </div>
  )
}
