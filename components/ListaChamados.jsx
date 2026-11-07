import Link from 'next/link'
import { ChevronRight, CalendarDays } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { SERVICOS, PERIODOS, PERIODOS_AGENDA, formatarData } from '@/lib/constantes'

export default function ListaChamados({ chamados, base = '/admin/chamados', vazio = 'Nenhum chamado.' }) {
  if (!chamados.length) {
    return <div className="card p-8 text-center text-sm text-slate-400">{vazio}</div>
  }
  return (
    <ul className="card divide-y divide-slate-100 overflow-hidden">
      {chamados.map((c) => (
        <li key={c.id}>
          <Link href={`${base}/${c.id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">#{c.protocolo}</span>
                <StatusBadge status={c.status} />
              </div>
              <div className="mt-1 truncate font-medium text-slate-900">
                {c.clientes?.nome || c.nome_solicitante}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
                <span>{SERVICOS[c.servico]}</span>
                {c.data_agendada ? (
                  <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {formatarData(c.data_agendada)}{c.periodo_agendado ? ` · ${PERIODOS_AGENDA[c.periodo_agendado]}` : ''}</span>
                ) : c.data_desejada ? (
                  <span className="inline-flex items-center gap-1 text-amber-700">
                    <CalendarDays size={13} /> Cliente quer: {formatarData(c.data_desejada)}
                    {c.periodo_desejado && c.periodo_desejado !== 'qualquer' ? ` (${PERIODOS[c.periodo_desejado]})` : ''}
                  </span>
                ) : null}
              </div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-slate-300" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
