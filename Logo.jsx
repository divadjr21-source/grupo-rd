import { Leaf } from 'lucide-react'

export default function Logo({ subtitulo = 'Limpeza · Jardinagem · Reforma' }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-marca-600 text-white">
        <Leaf size={19} strokeWidth={2.2} />
      </div>
      <div className="leading-tight">
        <div className="font-semibold text-slate-900">Grupo RD</div>
        {subtitulo && <div className="text-xs text-slate-500">{subtitulo}</div>}
      </div>
    </div>
  )
}
