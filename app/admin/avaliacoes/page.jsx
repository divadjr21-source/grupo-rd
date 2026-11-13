'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Star, MessageSquareQuote, ChevronRight, Globe, Lock } from 'lucide-react'
import Carregando from '@/components/Carregando'
import { Estrelas } from '@/components/AvaliarServico'
import { supabase } from '@/lib/supabase'
import { SERVICOS, formatarData } from '@/lib/constantes'

export default function Avaliacoes() {
  const [lista, setLista] = useState(null)
  const [semAvaliacao, setSemAvaliacao] = useState(0)

  async function carregar() {
    const { data } = await supabase
      .from('chamados')
      .select('id, protocolo, nome_solicitante, servico, avaliacao_nota, avaliacao_comentario, avaliacao_em, avaliacao_autoriza, avaliacao_destaque, clientes(nome), chamado_equipe(funcionario_id, perfis(nome))')
      .not('avaliacao_nota', 'is', null)
      .order('avaliacao_em', { ascending: false })
      .limit(1000)
    setLista(data || [])
    const { count } = await supabase.from('chamados').select('id', { count: 'exact', head: true }).eq('status', 'concluido').is('avaliacao_nota', null)
    setSemAvaliacao(count || 0)
  }
  useEffect(() => { carregar() }, [])

  const resumo = useMemo(() => {
    const l = lista || []
    const media = l.length ? l.reduce((t, a) => t + a.avaliacao_nota, 0) / l.length : 0
    const dist = [5, 4, 3, 2, 1].map((n) => ({ n, q: l.filter((a) => a.avaliacao_nota === n).length }))
    const porFunc = {}
    for (const a of l) {
      for (const e of a.chamado_equipe || []) {
        const nome = e.perfis?.nome || '—'
        porFunc[nome] ||= { soma: 0, q: 0 }
        porFunc[nome].soma += a.avaliacao_nota
        porFunc[nome].q += 1
      }
    }
    const funcionarios = Object.entries(porFunc).map(([nome, v]) => ({ nome, media: v.soma / v.q, q: v.q })).sort((a, b) => b.media - a.media)
    return { media, dist, funcionarios, total: l.length }
  }, [lista])

  async function alternarDestaque(a) {
    await supabase.from('chamados').update({ avaliacao_destaque: !a.avaliacao_destaque }).eq('id', a.id)
    setLista(lista.map((x) => (x.id === a.id ? { ...x, avaliacao_destaque: !a.avaliacao_destaque } : x)))
  }

  if (!lista) return <Carregando />

  return (
    <div>
      <h1 className="titulo-pagina">Avaliações</h1>
      <p className="text-sm text-slate-500">O que os clientes acharam dos serviços concluídos</p>

      <div className="mt-5 grid gap-3 md:grid-cols-[220px_1fr_1fr]">
        <div className="card flex flex-col items-center justify-center p-5 text-center">
          <div className="text-4xl font-semibold text-slate-900">{resumo.total ? resumo.media.toFixed(1).replace('.', ',') : '—'}</div>
          <Estrelas nota={Math.round(resumo.media)} tamanho={20} />
          <div className="mt-1 text-sm text-slate-500">{resumo.total} avaliação(ões)</div>
        </div>
        <div className="card space-y-1.5 p-5">
          {resumo.dist.map(({ n, q }) => (
            <div key={n} className="flex items-center gap-2 text-sm">
              <span className="w-3 text-slate-600">{n}</span><Star size={13} className="fill-amber-400 text-amber-400" />
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${resumo.total ? (q / resumo.total) * 100 : 0}%` }} />
              </div>
              <span className="w-6 text-right text-slate-500">{q}</span>
            </div>
          ))}
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-slate-900">Média por funcionário</div>
          {resumo.funcionarios.length === 0 ? <p className="mt-2 text-sm text-slate-400">Sem dados ainda.</p> : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {resumo.funcionarios.map((f) => (
                <li key={f.nome} className="flex items-center justify-between gap-2">
                  <span className="truncate text-slate-700">{f.nome}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-slate-600">
                    <Star size={13} className="fill-amber-400 text-amber-400" /> {f.media.toFixed(1).replace('.', ',')}
                    <span className="text-xs text-slate-400">({f.q})</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {semAvaliacao > 0 && (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-600 ring-1 ring-slate-200">
          {semAvaliacao} serviço(s) concluído(s) ainda sem avaliação. No chamado, use a mensagem pronta <strong>"Pedir avaliação"</strong> para mandar o link no WhatsApp.
        </p>
      )}

      <div className="mt-5 space-y-3">
        {lista.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-400">
            <MessageSquareQuote size={24} /> Nenhuma avaliação ainda.
          </div>
        ) : lista.map((a) => (
          <div key={a.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Estrelas nota={a.avaliacao_nota} />
                <div className="mt-1 font-medium text-slate-900">{a.clientes?.nome || a.nome_solicitante}</div>
                <div className="text-xs text-slate-500">
                  #{a.protocolo} · {SERVICOS[a.servico]} · {formatarData(a.avaliacao_em)}
                  {a.chamado_equipe?.length ? ` · Equipe: ${a.chamado_equipe.map((e) => e.perfis?.nome).join(', ')}` : ''}
                </div>
              </div>
              <Link href={`/admin/chamados/${a.id}`} className="text-slate-300 hover:text-slate-500"><ChevronRight size={18} /></Link>
            </div>
            {a.avaliacao_comentario && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">"{a.avaliacao_comentario}"</p>}
            <div className="mt-3">
              {a.avaliacao_autoriza && a.avaliacao_comentario && a.avaliacao_nota >= 4 ? (
                <button onClick={() => alternarDestaque(a)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition ${
                    a.avaliacao_destaque ? 'bg-marca-600 text-white ring-marca-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}>
                  <Globe size={13} /> {a.avaliacao_destaque ? 'Aparecendo no site' : 'Mostrar no site'}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <Lock size={12} /> {!a.avaliacao_autoriza ? 'Cliente não autorizou mostrar no site' : !a.avaliacao_comentario ? 'Sem comentário' : 'Só notas 4 e 5 vão para o site'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
