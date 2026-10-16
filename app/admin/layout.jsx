'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Building2, Users, LogOut } from 'lucide-react'
import Logo from '@/components/Logo'
import Carregando from '@/components/Carregando'
import { useSessao, sair } from '@/lib/useSessao'

const MENU = [
  { href: '/admin', nome: 'Início', icone: LayoutDashboard },
  { href: '/admin/chamados', nome: 'Chamados', icone: ClipboardList },
  { href: '/admin/clientes', nome: 'Clientes', icone: Building2 },
  { href: '/admin/funcionarios', nome: 'Equipe', icone: Users },
]

export default function LayoutAdmin({ children }) {
  const perfil = useSessao('admin')
  const caminho = usePathname()

  if (!perfil) return <Carregando />

  const ativo = (href) => (href === '/admin' ? caminho === '/admin' : caminho.startsWith(href))

  return (
    <div className="min-h-screen md:flex">
      {/* Menu lateral (computador) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-100 p-4"><Logo subtitulo="Painel Admin" /></div>
        <nav className="flex-1 space-y-1 p-3">
          {MENU.map(({ href, nome, icone: Icone }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                ativo(href) ? 'bg-marca-50 text-marca-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Icone size={18} /> {nome}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <div className="px-3 pb-2 text-xs text-slate-400">{perfil.nome}</div>
          <button onClick={sair} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      {/* Topo (celular) */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo subtitulo="Painel Admin" />
          <button onClick={sair} className="rounded-lg p-2 text-slate-500" aria-label="Sair"><LogOut size={19} /></button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {MENU.map(({ href, nome, icone: Icone }) => (
            <Link key={href} href={href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                ativo(href) ? 'bg-marca-50 text-marca-700' : 'text-slate-600'}`}>
              <Icone size={16} /> {nome}
            </Link>
          ))}
        </nav>
      </header>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
