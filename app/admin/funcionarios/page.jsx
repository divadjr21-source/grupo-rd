'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Carregando from '@/components/Carregando'

// Endereço antigo: a tela agora se chama "Usuários"
export default function Redirecionar() {
  const router = useRouter()
  useEffect(() => { router.replace('/admin/usuarios') }, [router])
  return <Carregando />
}
