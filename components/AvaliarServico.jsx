'use client'

import { useState } from 'react'
import { Star, Loader2, Heart } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const ROTULOS = ['', 'Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente']

export function Estrelas({ nota, tamanho = 18 }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${nota} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={tamanho} className={n <= nota ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
      ))}
    </span>
  )
}

// Formulário de avaliação do cliente (nota + comentário + autorização para o site)
export default function AvaliarServico({ token, notaAtual, onAvaliado }) {
  const [nota, setNota] = useState(0)
  const [passando, setPassando] = useState(0)
  const [comentario, setComentario] = useState('')
  const [autoriza, setAutoriza] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [feito, setFeito] = useState(!!notaAtual)

  if (feito) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-amber-50 p-5 text-center ring-1 ring-amber-200">
        <Heart size={24} className="fill-rose-400 text-rose-400" />
        <div className="font-semibold text-slate-900">Obrigado pela sua avaliação!</div>
        <Estrelas nota={notaAtual || nota} tamanho={22} />
      </div>
    )
  }

  async function enviar() {
    if (!nota) return setErro('Toque nas estrelas para dar sua nota.')
    setErro('')
    setEnviando(true)
    const { error } = await supabase.rpc('avaliar_servico', { p_token: token, p_nota: nota, p_comentario: comentario, p_autoriza: autoriza })
    setEnviando(false)
    if (error) return setErro(error.message)
    fetch('/api/notificar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'avaliacao', token }) }).catch(() => {})
    setFeito(true)
    onAvaliado?.(nota)
  }

  const mostrada = passando || nota

  return (
    <div className="rounded-2xl bg-amber-50/60 p-5 ring-1 ring-amber-200">
      <div className="text-center">
        <div className="font-semibold text-slate-900">Como foi o nosso serviço?</div>
        <p className="text-sm text-slate-500">Sua opinião ajuda a gente a melhorar.</p>
        <div className="mt-3 flex justify-center gap-1" onMouseLeave={() => setPassando(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setNota(n)} onMouseEnter={() => setPassando(n)}
              className="p-1 transition active:scale-90" aria-label={`${n} estrela${n > 1 ? 's' : ''}`}>
              <Star size={36} className={n <= mostrada ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
            </button>
          ))}
        </div>
        <div className="h-5 text-sm font-medium text-amber-700">{ROTULOS[mostrada]}</div>
      </div>

      {nota > 0 && (
        <div className="mt-3 space-y-3">
          <textarea className="input min-h-[80px] bg-white" maxLength={1000} value={comentario} onChange={(e) => setComentario(e.target.value)}
            placeholder={nota >= 4 ? 'Conte o que você mais gostou (opcional)' : 'O que podemos melhorar? (opcional)'} />
          <label className="flex items-start gap-2.5 text-sm text-slate-600">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-marca-600" checked={autoriza} onChange={(e) => setAutoriza(e.target.checked)} />
            Autorizo mostrar meu comentário no site (aparece só o primeiro nome ou o nome do condomínio).
          </label>
        </div>
      )}

      {erro && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      <button onClick={enviar} disabled={enviando} className="btn-primario mt-4 w-full py-3">
        {enviando && <Loader2 size={17} className="animate-spin" />} Enviar avaliação
      </button>
    </div>
  )
}
