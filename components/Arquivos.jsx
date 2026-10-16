'use client'

import { useRef } from 'react'
import { ImagePlus, X, Film } from 'lucide-react'
import { ehVideo } from '@/lib/upload'

// Seletor de fotos/vídeos com pré-visualização
export function SeletorArquivos({ arquivos, onChange, maximo = 10, texto = 'Toque para anexar fotos ou vídeos' }) {
  const entrada = useRef(null)

  function adicionar(e) {
    const novos = Array.from(e.target.files || [])
    onChange([...arquivos, ...novos].slice(0, maximo))
    e.target.value = ''
  }

  function remover(i) {
    onChange(arquivos.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => entrada.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 transition hover:border-marca-500 hover:bg-marca-50 hover:text-marca-700"
      >
        <ImagePlus size={22} />
        {texto}
        <span className="text-xs text-slate-400">Até {maximo} arquivos, 50 MB cada</span>
      </button>
      <input ref={entrada} type="file" accept="image/*,video/*" multiple hidden onChange={adicionar} />

      {arquivos.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {arquivos.map((a, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {a.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(a)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-500"><Film size={22} /></div>
              )}
              <button
                type="button"
                onClick={() => remover(i)}
                className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-slate-700 shadow"
                aria-label="Remover"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Exibe fotos/vídeos já enviados
export function Galeria({ links }) {
  if (!links || links.length === 0) return <p className="text-sm text-slate-400">Nenhum arquivo.</p>
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {links.map((link) => (
        <a key={link} href={link} target="_blank" rel="noreferrer"
          className="block aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
          {ehVideo(link) ? (
            <video src={link} className="h-full w-full object-cover" muted />
          ) : (
            <img src={link} alt="" className="h-full w-full object-cover" />
          )}
        </a>
      ))}
    </div>
  )
}
