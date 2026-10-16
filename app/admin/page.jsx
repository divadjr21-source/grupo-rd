'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Inbox, CalendarDays, Hammer, CheckCircle2, Plus } from 'lucide-react'
import Carregando from '@/components/Carregando'
import ListaChamados from '@/components/ListaChamados'
import { supabase } from '@/lib/supabase'

function hojeISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export default function Dashboard() {
  const [chamados, setChamados] = useState(null)

  useEffect(() => {
    supabase
      .from('chamados')
      .select('id, protocolo, nome_solicitante, servico, status, data_agendada, data_desejada, periodo_desejado, criado_em, concluido_em, clientes(nome)')
      .order('criado_em', { ascending: false })
      .limit(500)
      .then(({ data }) => setChamados(data || []))
  }, [])

  if (!chamados) return <Carregando />

  const hoje = hojeISO()
  const inicioMes = hoje.slice(0, 8) + '01'
  const abertos = chamados.filter((c) => c.status === 'aberto')
  const deHoje = chamados.filter((c) => c.data_agendada === hoje && !['concluido', 'cancelado'].includes(c.status))
  const andamento = chamados.filter((c) => c.status === 'em_andamento')
  const concluidosMes = chamados.filter((c) => c.status === 'concluido' && c.concluido_em && c.concluido_em.slice(0, 10) >= inicioMes)

  const cartoes = [
    { nome: 'Novos (aguardando)', valor: abertos.length, icone: Inbox, cor: 'bg-amber-50 text-amber-600' },
    { nome: 'Agendados para hoje', valor: deHoje.length, icone: CalendarDays, cor: 'bg-sky-50 text-sky-600' },
    { nome: 'Em andamento', valor: andamento.length, icone: Hammer, cor: 'bg-violet-50 text-violet-600' },
    { nome: 'Concluídos no mês', valor: concluidosMes.length, icone: CheckCircle2, cor: 'bg-marca-50 text-marca-600' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="titulo-pagina">Início</h1>
          <p className="text-sm text-slate-500">Visão geral dos atendimentos</p>
        </div>
        <Link href="/admin/chamados/novo" className="btn-primario"><Plus size={17} /> Novo chamado</Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cartoes.map(({ nome, valor, icone: Icone, cor }) => (
          <div key={nome} className="card p-4">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cor}`}><Icone size={18} /></div>
            <div className="mt-3 text-2xl font-semibold text-slate-900">{valor}</div>
            <div className="text-sm text-slate-500">{nome}</div>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-slate-900">Aguardando atendimento</h2>
        <ListaChamados chamados={abertos.slice(0, 10)} vazio="Nenhum chamado novo. Tudo em dia!" />
      </section>

      {deHoje.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold text-slate-900">Serviços de hoje</h2>
          <ListaChamados chamados={deHoje} />
        </section>
      )}
    </div>
  )
}
