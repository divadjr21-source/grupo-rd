import Link from 'next/link'
import { UserRound } from 'lucide-react'
import Logo from './Logo'

export default function CabecalhoPublico() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/"><Logo /></Link>
        <Link href="/login" className="btn-secundario px-3 py-2">
          <UserRound size={16} /> <span className="hidden sm:inline">Área da Equipe</span><span className="sm:hidden">Entrar</span>
        </Link>
      </div>
    </header>
  )
}
