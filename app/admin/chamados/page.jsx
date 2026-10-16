'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import Carregando from '@/components/Carregando'
import ListaChamados from '@/components/ListaChamados'
import { supabase } from '@/lib/supabase'
import { STATUS } from '@/lib/constantes'

export default function Chamados() {
  const [chamados, setChamados] = useState(null)
  const [filtro, setFiltro] = useState('ativos')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    supabase
      .from('chamados')
      .select('id, protocolo, nome_solicitante, telefone, endereco, servico, status, data_agendada, data_desejada, periodo_desejado, criado_em, clientes(nome)')
      .order('criado_em', { ascending: false })
      .limit(1000)
      .then(({ data }) => setChamados(data || []))
  }, [])

  const lista = useMemo(() => {
    if (!chamados) return []
    const termo = busca.trim().toLowerCase()
    return chamados.filter((c) => {
      if (filtro === 'ativos' && ['concluido', 'cancelado'].includes(c.status)) return false
      if (filtro !== 'ativos' && filtro !== 'todos' && c.status !== filtro) return false
      if (!termo) return true
      return [c.protocolo, c.nome_solicitante, c.telefone, c.endereco, c.clientes?.nome]
        .some((v) => (v || '').toLowerCase().includes(termo))
    })
  }, [chamados, filtro, busca])

  const filtros = [['ativos', 'Ativos'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label]), ['todos', 'Todos']]

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="titulo-pagina">Chamados</h1>
        <Link href="/admin/chamados/novo" className="btn-primario"><Plus size={17} /> Novo</Link>
      </div>

      <div className="relative mt-5">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-10" placeholder="Buscar por protocolo, nome, telefone ou endereço"
          value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {filtros.map(([chave, nome]) => (
          <button key={chave} onClick={() => setFiltro(chave)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${
              filtro === chave ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            {nome}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {chamados ? <ListaChamados chamados={lista} vazio="Nenhum chamado encontrado." /> : <Carregando />}
      </div>
    </div>
  )
}
