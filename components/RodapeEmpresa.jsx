'use client'

import { ShieldCheck, MessageCircle } from 'lucide-react'
import { useEmpresa } from '@/lib/useEmpresa'
import { linkWhatsApp } from '@/lib/constantes'

export default function RodapeEmpresa() {
  const empresa = useEmpresa()
  const nome = empresa?.nome || 'Grupo RD'
  return (
    <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
      {empresa?.whatsapp && (
        <a href={linkWhatsApp(empresa.whatsapp, 'Olá! Vim pelo site e gostaria de um orçamento.')} target="_blank" rel="noreferrer"
          className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-marca-50 px-3 py-1.5 text-sm font-medium text-marca-700 hover:bg-marca-100">
          <MessageCircle size={15} /> Fale com a gente no WhatsApp
        </a>
      )}
      <div><span className="inline-flex items-center gap-1"><ShieldCheck size={13} /> Seus dados são usados apenas para o atendimento.</span></div>
      <div className="mt-1">
        © {new Date().getFullYear()} {nome}
        {empresa?.cidade ? ` · ${empresa.cidade}` : ''}
        {empresa?.cnpj ? ` · CNPJ ${empresa.cnpj}` : ''}
      </div>
    </footer>
  )
}
