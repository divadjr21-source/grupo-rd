'use client'

import { useEffect, useState } from 'react'
import Carregando from '@/components/Carregando'
import ListaChamados from '@/components/ListaChamados'
import { supabase } from '@/lib/supabase'

export default function MeusServicos() {
  const [chamados, setChamados] = useState(null)
  const [aba, setAba] = useState('ativos')

  useEffect(() => {
    // As regras do banco já garantem que só aparecem os chamados da equipe deste funcionário
    supabase
      .from('chamados')
      .select('id, protocolo, nome_solicitante, servico, status, data_agendada, periodo_agendado, concluido_em')
      .order('data_agendada', { ascending: true, nullsFirst: false })
      .limit(300)
      .then(({ data }) => setChamados(data || []))
  }, [])

  if (!chamados) return <Carregando />

  const ativos = chamados.filter((c) => !['concluido', 'cancelado'].includes(c.status))
  const concluidos = chamados
    .filter((c) => c.status === 'concluido')
    .sort((a, b) => (b.concluido_em || '').localeCompare(a.concluido_em || ''))

  return (
    <div>
      <h1 className="titulo-pagina">Meus serviços</h1>
      <div className="mt-4 inline-flex rounded-xl bg-slate-200/60 p-1">
        {[['ativos', `A fazer (${ativos.length})`], ['concluidos', 'Concluídos']].map(([chave, nome]) => (
          <button key={chave} onClick={() => setAba(chave)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              aba === chave ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
            {nome}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <ListaChamados
          chamados={aba === 'ativos' ? ativos : concluidos.slice(0, 50)}
          base="/equipe"
          vazio={aba === 'ativos' ? 'Nenhum serviço atribuído a você no momento.' : 'Nenhum serviço concluído ainda.'}
        />
      </div>
    </div>
  )
}
