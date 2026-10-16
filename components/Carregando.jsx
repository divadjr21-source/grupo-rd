import { Loader2 } from 'lucide-react'

export default function Carregando({ texto = 'Carregando…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Loader2 size={18} className="animate-spin" /> {texto}
    </div>
  )
}
