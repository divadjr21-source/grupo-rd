'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, FileText, Plus } from 'lucide-react'
import Carregando from '@/components/Carregando'
import { totalDe } from '@/components/EditorOrcamento'
import NovoOrcamento from '@/components/NovoOrcamento'
import { supabase } from '@/lib/supabase'
import { formatarData, formatarMoeda } from '@/lib/constantes'

const FILTROS = [
  ['todos', 'Todos'],
  ['enviado', 'Aguardando cliente'],
  ['aprovado', 'Aprovados'],
  ['recusado', 'Recusados'],
  ['rascunho', 'Rascunhos'],
]
const COR = {
  rascunho: 'bg-slate-100 text-slate-600 ring-slate-200',
  enviado: 'bg-sky-50 text-sky-700 ring-sky-200',
  aprovado: 'bg-marca-50 text-marca-700 ring-marca-200',
  recusado: 'bg-red-50 text-red-600 ring-red-200',
}
const NOME = { rascunho: 'Rascunho', enviado: 'Aguardando', aprovado: 'Aprovado', recusado: 'Recusado' }

export default function Orcamentos() {
  const [lista, setLista] = useState(null)
  const [filtro, setFiltro] = useState('todos')
  const [criando, setCriando] = useState(false)

  useEffect(() => {
    supabase
      .from('orcamentos')
      .select('id, status, itens, desconto, enviado_em, respondido_em, atualizado_em, chamados(id, protocolo, nome_solicitante, status, clientes(nome))')
      .order('atualizado_em', { ascending: false })
      .limit(500)
      .then(({ data }) => setLista(data || []))
  }, [])

  const visiveis = (lista || []).filter((o) => filtro === 'todos' || o.status === filtro)
  const soma = (status) => (lista || []).filter((o) => o.status === status).reduce((t, o) => t + totalDe(o.itens, o.desconto), 0)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="titulo-pagina">Orçamentos</h1>
          <p className="text-sm text-slate-500">Monte, envie e acompanhe a resposta dos clientes.</p>
        </div>
        <button onClick={() => setCriando(true)} className="btn-primario"><Plus size={17} /> Novo orçamento</button>
      </div>
      {criando && <NovoOrcamento onFechar={() => setCriando(false)} />}

      {lista && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="card p-4"><div className="text-sm text-slate-500">Aguardando resposta</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{formatarMoeda(soma('enviado'))}</div></div>
          <div className="card p-4"><div className="text-sm text-slate-500">Aprovados</div>
            <div className="mt-1 text-xl font-semibold text-marca-700">{formatarMoeda(soma('aprovado'))}</div></div>
        </div>
      )}

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
        {FILTROS.map(([k, n]) => (
          <button key={k} onClick={() => setFiltro(k)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${filtro === k ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
            {n}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {!lista ? <Carregando /> : visiveis.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-8 text-center text-sm text-slate-400">
            <FileText size={22} /> Nenhum orçamento aqui.
            <button onClick={() => setCriando(true)} className="btn-primario mt-2"><Plus size={16} /> Criar o primeiro</button>
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100 overflow-hidden">
            {visiveis.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/chamados/${o.chamados.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">#{o.chamados.protocolo}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${COR[o.status]}`}>{NOME[o.status]}</span>
                    </div>
                    <div className="mt-1 truncate font-medium text-slate-900">{o.chamados.clientes?.nome || o.chamados.nome_solicitante}</div>
                    <div className="text-xs text-slate-500">
                      {o.respondido_em ? `Respondido em ${formatarData(o.respondido_em)}` : o.enviado_em ? `Enviado em ${formatarData(o.enviado_em)}` : `Editado em ${formatarData(o.atualizado_em)}`}
                    </div>
                  </div>
                  <div className="text-right font-semibold text-slate-900">{formatarMoeda(totalDe(o.itens, o.desconto))}</div>
                  <ChevronRight size={18} className="text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
