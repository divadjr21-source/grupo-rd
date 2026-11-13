export default function Logo({ subtitulo = 'Limpeza · Jardinagem · Reforma · Segurança', compacto = false }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-marca-600 text-white">
        <span className="text-sm font-extrabold tracking-tight">RD</span>
      </div>
      <div className="leading-tight">
        <div className="whitespace-nowrap font-semibold text-slate-900">Grupo RD</div>
        {subtitulo && <div className={`text-xs text-slate-500 ${compacto ? 'hidden sm:block' : ''}`}>{subtitulo}</div>}
      </div>
    </div>
  )
}
