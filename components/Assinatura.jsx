'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

// Quadro para assinar com o dedo (ou mouse)
const Assinatura = forwardRef(function Assinatura(_, ref) {
  const canvas = useRef(null)
  const desenhando = useRef(false)
  const [vazio, setVazio] = useState(true)

  function preparar() {
    const c = canvas.current
    if (!c) return
    const escala = window.devicePixelRatio || 1
    const { width, height } = c.getBoundingClientRect()
    c.width = width * escala
    c.height = height * escala
    const ctx = c.getContext('2d')
    ctx.scale(escala, escala)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
  }

  useEffect(() => { preparar() }, [])

  function ponto(e) {
    const r = canvas.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  function inicio(e) {
    e.preventDefault()
    canvas.current.setPointerCapture(e.pointerId)
    desenhando.current = true
    const ctx = canvas.current.getContext('2d')
    const p = ponto(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }
  function mover(e) {
    if (!desenhando.current) return
    const ctx = canvas.current.getContext('2d')
    const p = ponto(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    if (vazio) setVazio(false)
  }
  function fim() { desenhando.current = false }

  function limpar() {
    const c = canvas.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
    setVazio(true)
  }

  useImperativeHandle(ref, () => ({
    vazio: () => vazio,
    limpar,
    // Devolve a assinatura como arquivo PNG
    arquivo: () => new Promise((ok) => canvas.current.toBlob((b) => ok(b ? new File([b], 'assinatura.png', { type: 'image/png' }) : null), 'image/png')),
  }))

  return (
    <div>
      <div className="relative">
        <canvas
          ref={canvas}
          onPointerDown={inicio}
          onPointerMove={mover}
          onPointerUp={fim}
          onPointerCancel={fim}
          className="h-40 w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white"
        />
        {vazio && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-300">
            Assine aqui com o dedo
          </span>
        )}
        <div className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-slate-200" />
      </div>
      <button type="button" onClick={limpar} className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
        <Eraser size={13} /> Limpar assinatura
      </button>
    </div>
  )
})

export default Assinatura
