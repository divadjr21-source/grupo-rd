'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowLeft } from 'lucide-react'
import Logo from '@/components/Logo'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('erro') === 'acesso') {
      setErro('Seu acesso está desativado ou não foi configurado. Fale com o administrador.')
    }
    // Se já estiver logado, vai direto para a área certa
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) redirecionar(session.user.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function redirecionar(id) {
    const { data } = await supabase.from('perfis').select('papel, ativo').eq('id', id).single()
    if (!data || !data.ativo) {
      await supabase.auth.signOut()
      setErro('Seu acesso está desativado ou não foi configurado. Fale com o administrador.')
      setEntrando(false)
      return
    }
    router.replace(data.papel === 'admin' ? '/admin' : '/equipe')
  }

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setEntrando(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    if (error) {
      setErro('E-mail ou senha incorretos.')
      setEntrando(false)
      return
    }
    redirecionar(data.user.id)
  }

  return (
    <div className="bg-foto bg-foto-capa flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><div className="rounded-2xl bg-white px-4 py-2.5 shadow-lg"><Logo subtitulo="Área da Equipe" /></div></div>
        <form onSubmit={entrar} className="card space-y-4 p-6 shadow-2xl">
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" type="email" className="input" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="senha">Senha</label>
            <input id="senha" type="password" className="input" required autoComplete="current-password"
              value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          <button className="btn-primario w-full py-3" disabled={entrando}>
            {entrando ? <Loader2 size={18} className="animate-spin" /> : null} Entrar
          </button>
        </form>
        <Link href="/" className="mt-4 flex items-center justify-center gap-1 text-sm text-slate-200 hover:text-white">
          <ArrowLeft size={15} /> Voltar ao início
        </Link>
      </div>
    </div>
  )
}
