'use client'

import { useEffect, useState } from 'react'
import { Quote } from 'lucide-react'
import { Estrelas } from './AvaliarServico'
import { supabase } from '@/lib/supabase'
import { SERVICOS } from '@/lib/constantes'

// Depoimentos de clientes (só os autorizados pelo cliente e destacados pelo admin)
export default function Depoimentos() {
  const [lista, setLista] = useState([])
  useEffect(() => {
    supabase.rpc('avaliacoes_publicas').then(({ data }) => setLista(data || []))
  }, [])

  if (!lista.length) return null

  return (
    <section className="border-t border-slate-100 bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">O que dizem nossos clientes</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((d, i) => (
            <figure key={i} className="card relative p-5">
              <Quote size={28} className="absolute right-4 top-4 text-slate-100" />
              <Estrelas nota={d.nota} />
              <blockquote className="mt-3 text-sm leading-relaxed text-slate-700">"{d.comentario}"</blockquote>
              <figcaption className="mt-4 text-sm">
                <span className="font-medium text-slate-900">{d.nome}</span>
                <span className="text-slate-400"> · {SERVICOS[d.servico]}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
