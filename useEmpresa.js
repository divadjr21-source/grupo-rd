'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Dados públicos da empresa (nome, WhatsApp, cidade, CNPJ) cadastrados em Admin > Empresa
export function useEmpresa() {
  const [empresa, setEmpresa] = useState(null)
  useEffect(() => {
    supabase.rpc('contato_empresa').then(({ data }) => {
      if (data && data[0]) setEmpresa(data[0])
    })
  }, [])
  return empresa
}
