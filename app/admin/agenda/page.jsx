'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, MapPin, Users, AlertTriangle, CalendarDays, Inbox } from 'lucide-react'
import Carregando from '@/components/Carregando'
import StatusBadge from '@/components/StatusBadge'
import { supabase } from '@/lib/supabase'
import { SERVICOS, PERIODOS_AGENDA, hojeISO, somarDias, periodosConflitam } from '@/lib/constantes'

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const ORDEM_PERIODO = { manha: 0, integral: 1, tarde: 2 }

function inicioDaSemana(iso) {
  const d = new Date(iso + 'T12:00:00')
  const dia = d.getDay() // 0 = domingo
  return somarDias(iso, dia === 0 ? -6 : 1 - dia) // começa na segunda
}

function rotuloDia(iso) {
  const d = new Date(iso + 'T12:00:00')
  return { semana: DIAS[d.getDay()], data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }
}

export default function Agenda() {
  const hoje = hojeISO()
  const [inicio, setInicio] = useState(inicioDaSemana(hoje))
  const [servicos, setServicos] = useState(null)
  const [semData, setSemData] = useState(0)
  const [funcionarios, setFuncionarios] = useState([])
  const [filtro, setFiltro] = useState('')

  const fim = somarDias(inicio, 6)

  useEffect(() => {
    setServicos(null)
    supabase
      .from('chamados')
      .select('id, protocolo, nome_solicitante, endereco, servico, status, data_agendada, periodo_agendado, clientes(nome), chamado_equipe(funcionario_id, perfis(nome))')
      .gte('data_agendada', inicio)
      .lte('data_agendada', fim)
      .neq('status', 'cancelado')
      .then(({ data }) => setServicos(data || []))
  }, [inicio, fim])

  useEffect(() => {
    supabase.from('perfis').select('id, nome').eq('papel', 'funcionario').eq('ativo', true).order('nome')
      .then(({ data }) => setFuncionarios(data || []))
    supabase.from('chamados').select('id', { count: 'exact', head: true }).is('data_agendada', null).eq('status', 'aberto')
      .then(({ count }) => setSemData(count || 0))
  }, [])

  // Conflitos: mesmo funcionário em dois serviços no mesmo dia e período
  const conflitos = useMemo(() => {
    const mapa = {}
    if (!servicos) return mapa
    const ativos = servicos.filter((s) => s.status !== 'concluido')
    for (const a of ativos) {
      for (const b of ativos) {
        if (a.id >= b.id || a.data_agendada !== b.data_agendada) continue
        if (!periodosConflitam(a.periodo_agendado, b.periodo_agendado)) continue
        const idsB = new Set(b.chamado_equipe.map((e) => e.funcionario_id))
        for (const e of a.chamado_equipe) {
          if (!idsB.has(e.funcionario_id)) continue
          const nome = e.perfis?.nome || 'Funcionário'
          ;(mapa[a.id] ||= new Set()).add(nome)
          ;(mapa[b.id] ||= new Set()).add(nome)
        }
      }
    }
    return mapa
  }, [servicos])

  const dias = Array.from({ length: 7 }, (_, i) => somarDias(inicio, i))
  const visiveis = (servicos || []).filter((s) => !filtro || s.chamado_equipe.some((e) => e.funcionario_id === filtro))
  const totalConflitos = Object.keys(conflitos).length

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="titulo-pagina">Agenda</h1>
          <p className="text-sm text-slate-500">Serviços da semana e equipes de cada endereço</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setInicio(somarDias(inicio, -7))} className="btn-secundario px-2.5 py-2" aria-label="Semana anterior"><ChevronLeft size={18} /></button>
          <button onClick={() => setInicio(inicioDaSemana(hoje))} className="btn-secundario px-3 py-2">Hoje</button>
          <button onClick={() => setInicio(somarDias(inicio, 7))} className="btn-secundario px-2.5 py-2" aria-label="Próxima semana"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="text-sm font-medium text-slate-700">
          {rotuloDia(inicio).data} a {rotuloDia(fim).data}
        </div>
        <select className="input w-auto py-2 text-sm" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todos os funcionários</option>
          {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
        {semData > 0 && (
          <Link href="/admin/chamados" className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-800 ring-1 ring-amber-200">
            <Inbox size={14} /> {semData} {semData === 1 ? 'chamado sem data' : 'chamados sem data'}
          </Link>
        )}
      </div>

      {totalConflitos > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          <AlertTriangle size={17} className="mt-0.5 shrink-0" />
          Há funcionários escalados em dois serviços no mesmo dia e período. Veja os cartões marcados em vermelho.
        </div>
      )}

      {!servicos ? <Carregando /> : (
        <div className="mt-5 space-y-5">
          {dias.map((dia) => {
            const doDia = visiveis
              .filter((s) => s.data_agendada === dia)
              .sort((a, b) => (ORDEM_PERIODO[a.periodo_agendado] ?? 1) - (ORDEM_PERIODO[b.periodo_agendado] ?? 1))
            const r = rotuloDia(dia)
            const ehHoje = dia === hoje
            return (
              <section key={dia}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`text-sm font-semibold ${ehHoje ? 'text-marca-700' : 'text-slate-900'}`}>{r.semana}</span>
                  <span className="text-sm text-slate-400">{r.data}</span>
                  {ehHoje && <span className="rounded-full bg-marca-600 px-2 py-0.5 text-[11px] font-medium text-white">Hoje</span>}
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                {doDia.length === 0 ? (
                  <p className="pl-1 text-sm text-slate-300">Livre</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {doDia.map((s) => {
                      const conflito = conflitos[s.id]
                      return (
                        <Link key={s.id} href={`/admin/chamados/${s.id}`}
                          className={`card block p-3.5 transition hover:shadow-md ${conflito ? 'border-red-300 bg-red-50/40' : ''}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                              {s.periodo_agendado ? PERIODOS_AGENDA[s.periodo_agendado] : 'Sem período'}
                            </span>
                            <StatusBadge status={s.status} />
                          </div>
                          <div className="mt-2 truncate font-medium text-slate-900">{s.clientes?.nome || s.nome_solicitante}</div>
                          <div className="text-xs text-slate-500">#{s.protocolo} · {SERVICOS[s.servico]}</div>
                          <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                            <MapPin size={13} className="mt-0.5 shrink-0" /> <span className="line-clamp-2">{s.endereco}</span>
                          </div>
                          <div className="mt-1.5 flex items-start gap-1.5 text-xs">
                            <Users size={13} className="mt-0.5 shrink-0 text-slate-400" />
                            {s.chamado_equipe.length
                              ? <span className="text-slate-700">{s.chamado_equipe.map((e) => e.perfis?.nome).join(', ')}</span>
                              : <span className="font-medium text-amber-700">Sem equipe</span>}
                          </div>
                          {conflito && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-700">
                              <AlertTriangle size={13} /> Conflito: {[...conflito].join(', ')}
                            </div>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
          {visiveis.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-400"><CalendarDays size={16} /> Nenhum serviço agendado nesta semana.</div>
          )}
        </div>
      )}
    </div>
  )
}
