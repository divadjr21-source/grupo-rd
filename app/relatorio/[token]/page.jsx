'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Printer, Leaf, CheckCircle2, Circle, Clock, MapPin, Users, CalendarDays } from 'lucide-react'
import Carregando from '@/components/Carregando'
import { supabase } from '@/lib/supabase'
import { SERVICOS, formatarData } from '@/lib/constantes'

function hora(iso) {
  return iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'
}
function duracao(a, b) {
  if (!a || !b) return null
  const min = Math.round((new Date(b) - new Date(a)) / 60000)
  if (min < 1) return null
  const h = Math.floor(min / 60), m = min % 60
  return h ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m} min`
}
function mapa(local) {
  return local ? `https://www.google.com/maps?q=${local.lat},${local.lng}` : null
}

function Fotos({ titulo, links }) {
  if (!links?.length) return null
  return (
    <div className="break-inside-avoid">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</h3>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 print:grid-cols-3">
        {links.map((l) => (
          <a key={l} href={l} target="_blank" rel="noreferrer" className="block aspect-[4/3] overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
            <img src={l} alt="" className="h-full w-full object-cover" />
          </a>
        ))}
      </div>
    </div>
  )
}

// Relatório do serviço concluído (link para o cliente / síndico; imprime em PDF)
export default function RelatorioServico() {
  const { token } = useParams()
  const [r, setR] = useState(undefined)

  useEffect(() => {
    supabase.rpc('ver_relatorio', { p_token: token }).then(({ data }) => setR(data || null))
  }, [token])

  if (r === undefined) return <Carregando />
  if (r === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
        <div><h1 className="text-lg font-semibold text-slate-900">Relatório não encontrado</h1>
          <p className="mt-1 text-sm text-slate-500">O relatório fica disponível depois que o serviço é concluído.</p></div>
      </div>
    )
  }

  const emp = r.empresa || {}
  const feitos = (r.checklist || []).filter((i) => i.feito).length
  const tempo = duracao(r.checkin_em, r.checkout_em)

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-6 print:bg-white print:p-0 sm:py-10">
      <div className="mx-auto max-w-2xl print:max-w-none">
        <div className="mb-3 flex justify-end print:hidden">
          <button onClick={() => window.print()} className="btn-primario"><Printer size={16} /> Salvar em PDF / Imprimir</button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 print:rounded-none print:shadow-none print:ring-0">
          {/* Cabeçalho */}
          <div className="flex flex-wrap items-start justify-between gap-4 bg-marca-600 px-6 py-5 text-white print:bg-white print:px-0 print:text-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 print:bg-marca-600 print:text-white"><Leaf size={22} /></div>
              <div>
                <div className="text-lg font-semibold">{emp.nome || 'Grupo RD'}</div>
                <div className="text-xs opacity-80">{[emp.cnpj && `CNPJ ${emp.cnpj}`, emp.cidade].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
            <div className="text-sm sm:text-right">
              <div className="text-xs uppercase tracking-wide opacity-80">Relatório de serviço</div>
              <div className="text-xl font-semibold">#{r.protocolo}</div>
            </div>
          </div>

          <div className="space-y-6 p-6 print:px-0">
            {/* Resumo */}
            <div className="flex items-center gap-2 rounded-xl bg-marca-50 px-4 py-3 text-sm font-medium text-marca-800 ring-1 ring-marca-200">
              <CheckCircle2 size={18} /> {SERVICOS[r.servico]} concluído em {formatarData(r.checkout_em || r.data_agendada)}
            </div>

            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Cliente</div>
                <div className="mt-1 font-medium text-slate-900">{r.cliente}</div>
                <div className="flex items-start gap-1 text-slate-500"><MapPin size={13} className="mt-0.5 shrink-0" /> {r.endereco}</div>
              </div>
              <div className="space-y-1 text-slate-600">
                <div className="flex items-center gap-1.5"><CalendarDays size={14} className="text-slate-400" /> {formatarData(r.checkin_em || r.data_agendada)}</div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" />
                  Chegada {hora(r.checkin_em)} · Saída {hora(r.checkout_em)}{tempo ? ` · ${tempo}` : ''}
                </div>
                {r.equipe?.length > 0 && <div className="flex items-center gap-1.5"><Users size={14} className="text-slate-400" /> {r.equipe.join(', ')}</div>}
                {(r.checkin_local || r.checkout_local) && (
                  <div className="text-xs">
                    Localização registrada:{' '}
                    {r.checkin_local && <a href={mapa(r.checkin_local)} target="_blank" rel="noreferrer" className="text-marca-700 underline">chegada</a>}
                    {r.checkin_local && r.checkout_local && ' · '}
                    {r.checkout_local && <a href={mapa(r.checkout_local)} target="_blank" rel="noreferrer" className="text-marca-700 underline">saída</a>}
                  </div>
                )}
              </div>
            </div>

            {r.descricao && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Serviço solicitado</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{r.descricao}</p>
              </div>
            )}

            {r.checklist?.length > 0 && (
              <div className="break-inside-avoid">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Checklist ({feitos}/{r.checklist.length})</h3>
                <ul className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
                  {r.checklist.map((i, idx) => (
                    <li key={idx} className={`flex items-center gap-2 ${i.feito ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                      {i.feito ? <CheckCircle2 size={16} className="shrink-0 text-marca-600" /> : <Circle size={16} className="shrink-0" />} {i.item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {r.relatorio && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Observações da equipe</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{r.relatorio}</p>
              </div>
            )}

            <Fotos titulo="Antes" links={r.fotos_antes} />
            <Fotos titulo="Depois" links={r.fotos_depois} />

            {/* Assinatura */}
            <div className="break-inside-avoid border-t border-slate-100 pt-6">
              {r.assinatura_url ? (
                <div className="mx-auto w-72 text-center">
                  <img src={r.assinatura_url} alt="Assinatura" className="mx-auto h-24 object-contain" />
                  <div className="border-t border-slate-400 pt-1.5 text-sm text-slate-700">{r.assinatura_nome || 'Responsável'}</div>
                  <div className="text-xs text-slate-400">Assinado no local em {formatarData(r.checkout_em, true)}</div>
                </div>
              ) : (
                <p className="text-center text-xs text-slate-400">Responsável não estava no local no momento da conclusão.</p>
              )}
            </div>

            <p className="border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
              {[emp.nome, emp.endereco, emp.cidade, emp.whatsapp && `WhatsApp ${emp.whatsapp}`, emp.email].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
