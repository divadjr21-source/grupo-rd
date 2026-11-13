'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, Printer, MessageCircle, Clock } from 'lucide-react'
import Carregando from '@/components/Carregando'
import { supabase } from '@/lib/supabase'
import { SERVICOS, formatarData, formatarMoeda, linkWhatsApp, hojeISO } from '@/lib/constantes'

export default function OrcamentoPublico() {
  const { token } = useParams()
  const [orc, setOrc] = useState(undefined)
  const [respondendo, setRespondendo] = useState(null) // 'aprovar' | 'recusar'
  const [obs, setObs] = useState('')
  const [recusando, setRecusando] = useState(false)
  const [erro, setErro] = useState('')

  async function carregar() {
    const { data } = await supabase.rpc('ver_orcamento', { p_token: token })
    setOrc(data || null)
  }
  useEffect(() => { carregar() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  if (orc === undefined) return <Carregando />
  if (orc === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
        <div><h1 className="text-lg font-semibold text-slate-900">Orçamento não encontrado</h1>
          <p className="mt-1 text-sm text-slate-500">Confira o link recebido ou fale com a empresa.</p></div>
      </div>
    )
  }

  const emp = orc.empresa || {}
  const vencido = orc.validade && orc.validade < hojeISO() && orc.status === 'enviado'

  async function responder(aprovar) {
    setErro('')
    setRespondendo(aprovar ? 'aprovar' : 'recusar')
    const { error } = await supabase.rpc('responder_orcamento', { p_token: token, p_aprovar: aprovar, p_obs: obs })
    setRespondendo(null)
    if (error) return setErro(error.message)
    // Avisa a empresa no celular (se ela ativou as notificações)
    fetch('/api/notificar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'orcamento', token }) }).catch(() => {})
    setRecusando(false)
    carregar()
  }

  const mensagemEmpresa = orc.status === 'aprovado'
    ? `Olá! Aprovei o orçamento do pedido #${orc.protocolo}. Podemos combinar a data?`
    : `Olá! Tenho uma dúvida sobre o orçamento do pedido #${orc.protocolo}.`

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-6 print:bg-white print:p-0 sm:py-10">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 print:shadow-none print:ring-0">
        {/* Cabeçalho da empresa */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-marca-600 px-6 py-5 text-white print:bg-white print:text-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 print:bg-marca-600 print:text-white"><span className="text-[15px] font-extrabold tracking-tight">RD</span></div>
            <div>
              <div className="text-lg font-semibold">{emp.nome || 'Grupo RD'}</div>
              <div className="text-xs opacity-80">
                {[emp.cnpj && `CNPJ ${emp.cnpj}`, emp.cidade].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          <div className="text-sm sm:text-right">
            <div className="text-xs uppercase tracking-wide opacity-80">Orçamento</div>
            <div className="text-xl font-semibold">#{orc.protocolo}</div>
            {orc.enviado_em && <div className="text-xs opacity-80">{formatarData(orc.enviado_em)}</div>}
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Situação */}
          {orc.status === 'aprovado' && (
            <div className="flex items-start gap-3 rounded-xl bg-marca-50 p-4 text-marca-900 ring-1 ring-marca-200">
              <CheckCircle2 size={22} className="shrink-0 text-marca-600" />
              <div><div className="font-semibold">Orçamento aprovado</div>
                <div className="text-sm">Em {formatarData(orc.respondido_em, true)}. A empresa vai entrar em contato para confirmar a data.</div></div>
            </div>
          )}
          {orc.status === 'recusado' && (
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-slate-700 ring-1 ring-slate-200">
              <XCircle size={22} className="shrink-0 text-slate-400" />
              <div><div className="font-semibold">Orçamento recusado</div>
                <div className="text-sm">Em {formatarData(orc.respondido_em, true)}. Se mudar de ideia, fale com a empresa.</div></div>
            </div>
          )}
          {vencido && (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
              <Clock size={22} className="shrink-0" />
              <div className="text-sm">Este orçamento venceu em {formatarData(orc.validade)}. Peça uma atualização à empresa.</div>
            </div>
          )}

          {/* Cliente */}
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Cliente</div>
              <div className="mt-1 font-medium text-slate-900">{orc.nome}</div>
              <div className="text-slate-500">{orc.endereco}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Serviço</div>
              <div className="mt-1 font-medium text-slate-900">{SERVICOS[orc.servico]}</div>
              <div className="line-clamp-3 text-slate-500">{orc.descricao}</div>
            </div>
          </div>

          {/* Itens */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 font-medium">Descrição</th>
                <th className="py-2 text-center font-medium">Qtd</th>
                <th className="hidden py-2 text-right font-medium sm:table-cell">Unitário</th>
                <th className="py-2 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orc.itens.map((i, idx) => (
                <tr key={idx}>
                  <td className="py-2.5 pr-2 text-slate-800">{i.descricao}</td>
                  <td className="py-2.5 text-center text-slate-600">{i.qtd}</td>
                  <td className="hidden py-2.5 text-right text-slate-600 sm:table-cell">{formatarMoeda(i.valor)}</td>
                  <td className="py-2.5 text-right text-slate-800">{formatarMoeda(i.qtd * i.valor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {Number(orc.desconto) > 0 && (
                <tr><td colSpan={2} className="pt-3 text-slate-500 sm:hidden">Desconto</td>
                  <td colSpan={3} className="hidden pt-3 text-slate-500 sm:table-cell">Desconto</td>
                  <td className="pt-3 text-right text-slate-500">− {formatarMoeda(orc.desconto)}</td></tr>
              )}
              <tr className="border-t border-slate-200">
                <td colSpan={2} className="pt-3 text-base font-semibold text-slate-900 sm:hidden">Total</td>
                <td colSpan={3} className="hidden pt-3 text-base font-semibold text-slate-900 sm:table-cell">Total</td>
                <td className="pt-3 text-right text-xl font-semibold text-marca-700">{formatarMoeda(orc.total)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Condições */}
          <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-slate-400">Prazo de execução</dt><dd className="font-medium text-slate-800">{orc.prazo || 'A combinar'}</dd></div>
            <div><dt className="text-xs text-slate-400">Pagamento</dt><dd className="font-medium text-slate-800">{orc.condicoes || 'A combinar'}</dd></div>
            <div><dt className="text-xs text-slate-400">Validade</dt><dd className="font-medium text-slate-800">{orc.validade ? formatarData(orc.validade) : '—'}</dd></div>
          </dl>
          {orc.observacoes && <p className="whitespace-pre-wrap text-sm text-slate-600">{orc.observacoes}</p>}

          {/* Ações */}
          <div className="space-y-3 print:hidden">
            {orc.status === 'enviado' && !vencido && !recusando && (
              <>
                <textarea className="input min-h-[70px]" placeholder="Comentário para a empresa (opcional)" value={obs} onChange={(e) => setObs(e.target.value)} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <button onClick={() => responder(true)} disabled={!!respondendo} className="btn-primario py-3.5 text-base">
                    {respondendo === 'aprovar' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} Aprovar orçamento
                  </button>
                  <button onClick={() => setRecusando(true)} disabled={!!respondendo} className="btn-secundario py-3.5 text-base">Recusar</button>
                </div>
              </>
            )}
            {recusando && (
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-800">Quer contar o motivo? Ajuda a empresa a melhorar.</p>
                <textarea className="input mt-2 min-h-[70px]" placeholder="Ex.: achei o valor alto, quero mudar o prazo…" value={obs} onChange={(e) => setObs(e.target.value)} />
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => setRecusando(false)} className="btn-secundario">Voltar</button>
                  <button onClick={() => responder(false)} disabled={!!respondendo} className="btn-perigo">
                    {respondendo === 'recusar' && <Loader2 size={16} className="animate-spin" />} Confirmar recusa
                  </button>
                </div>
              </div>
            )}
            {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <button onClick={() => window.print()} className="btn-secundario"><Printer size={16} /> Salvar em PDF / Imprimir</button>
              {emp.whatsapp && (
                <a href={linkWhatsApp(emp.whatsapp, mensagemEmpresa)} target="_blank" rel="noreferrer" className="btn-secundario">
                  <MessageCircle size={16} /> Falar com a empresa
                </a>
              )}
            </div>
          </div>

          <p className="border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
            {[emp.nome, emp.endereco, emp.cidade, emp.email].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
    </div>
  )
}
