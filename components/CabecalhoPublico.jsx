import Link from 'next/link'
import { UserRound } from 'lucide-react'
import Logo from './Logo'
import { BotaoInstalar } from './AppInstalavel'

export default function CabecalhoPublico() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/"><Logo compacto /></Link>
        <div className="flex items-center gap-2">
        <BotaoInstalar className="btn-primario px-3 py-2" />
        <Link href="/login" className="btn-secundario px-3 py-2">
          <UserRound size={16} className="shrink-0" /> <span className="whitespace-nowrap">Área da Equipe</span>
        </Link>
        </div>
      </div>
    </header>
  )
}
