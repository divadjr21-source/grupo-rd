'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'

// Garante que a pessoa está logada e tem o papel certo.
// papel: 'admin' ou 'funcionario'
export function useSessao(papel) {
  const router = useRouter()
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    let ativo = true

    async function verificar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }
      const { data } = await supabase.from('perfis').select('*').eq('id', session.user.id).single()
      if (!ativo) return
      if (!data || !data.ativo) {
        await supabase.auth.signOut()
        router.replace('/login?erro=acesso')
        return
      }
      if (papel && data.papel !== papel) {
        router.replace(data.papel === 'admin' ? '/admin' : '/equipe')
        return
      }
      setPerfil(data)
    }

    verificar()
    const { data: escuta } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') router.replace('/login')
    })
    return () => {
      ativo = false
      escuta.subscription.unsubscribe()
    }
  }, [papel, router])

  return perfil
}

export async function sair() {
  await supabase.auth.signOut()
}
