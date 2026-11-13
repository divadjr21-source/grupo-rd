'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import Carregando from '@/components/Carregando'
import Logo from '@/components/Logo'
import AvaliarServico from '@/components/AvaliarServico'
import { supabase } from '@/lib/supabase'
import { SERVICOS, formatarData } from '@/lib/constantes'

// Página curta para o cliente avaliar o serviço (link enviado pelo WhatsApp)
export default function Avaliar() {
  const { token } = useParams()
  const [r, setR] = useState(undefined)

  useEffect(() => {
    supabase.rpc('ver_relatorio', { p_token: token }).then(({ data }) => setR(data || null))
  }, [token])

  if (r === undefined) return <Carregando />

  return (
    <div className="bg-foto bg-foto-capa flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 flex justify-center"><div className="rounded-2xl bg-white px-4 py-2.5 shadow-lg"><Logo /></div></div>
        <div className="card p-6 shadow-2xl">
          {r === null ? (
            <p className="text-center text-sm text-slate-500">Link inválido ou serviço ainda não concluído.</p>
          ) : (
            <>
              <div className="mb-5 text-center">
                <div className="text-xs font-semibold text-slate-400">Pedido #{r.protocolo}</div>
                <div className="font-semibold text-slate-900">{SERVICOS[r.servico]} — {r.cliente}</div>
                <div className="text-sm text-slate-500">Concluído em {formatarData(r.checkout_em)}{r.equipe?.length ? ` · Equipe: ${r.equipe.join(', ')}` : ''}</div>
              </div>
              <AvaliarServico token={token} notaAtual={r.avaliacao_nota} />
              <Link href={`/relatorio/${token}`} className="mt-4 flex items-center justify-center gap-1.5 text-sm text-marca-700 hover:underline">
                <FileText size={15} /> Ver o relatório do serviço
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
