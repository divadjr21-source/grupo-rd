'use client'

import Link from 'next/link'
import { LogOut } from 'lucide-react'
import Logo from '@/components/Logo'
import Carregando from '@/components/Carregando'
import { useSessao, sair } from '@/lib/useSessao'

export default function LayoutEquipe({ children }) {
  const perfil = useSessao('funcionario')
  if (!perfil) return <Carregando />

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/equipe"><Logo subtitulo={`Olá, ${perfil.nome.split(' ')[0]}`} /></Link>
          <button onClick={sair} className="btn-secundario px-3 py-2"><LogOut size={16} /> Sair</button>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  )
}
