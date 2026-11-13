'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Share, PlusSquare, X } from 'lucide-react'

// Registra o service worker (necessário para instalar o app)
export function RegistrarApp() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}

// Botão "Instalar app": no Android/PC abre a instalação; no iPhone mostra o passo a passo
export function BotaoInstalar({ className = '' }) {
  const [pedido, setPedido] = useState(null)
  const [iphone, setIphone] = useState(false)
  const [instalado, setInstalado] = useState(true)
  const [ajuda, setAjuda] = useState(false)

  useEffect(() => {
    const modoApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    setInstalado(!!modoApp)
    setIphone(/iphone|ipad|ipod/i.test(navigator.userAgent))

    const aoPedir = (e) => { e.preventDefault(); setPedido(e) }
    const aoInstalar = () => { setInstalado(true); setPedido(null) }
    window.addEventListener('beforeinstallprompt', aoPedir)
    window.addEventListener('appinstalled', aoInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', aoPedir)
      window.removeEventListener('appinstalled', aoInstalar)
    }
  }, [])

  if (instalado || (!pedido && !iphone)) return null

  async function instalar() {
    if (pedido) {
      pedido.prompt()
      const { outcome } = await pedido.userChoice
      if (outcome === 'accepted') setInstalado(true)
      setPedido(null)
    } else {
      setAjuda(true)
    }
  }

  return (
    <>
      <button type="button" onClick={instalar} aria-label="Instalar app" title="Instalar app" className={className || 'btn-primario px-3 py-2'}>
        <Download size={16} className="shrink-0" /> <span className="hidden whitespace-nowrap sm:inline">Instalar app</span>
      </button>

      {ajuda && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={() => setAjuda(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-t-2xl bg-white p-6 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Instalar no iPhone</h2>
              <button onClick={() => setAjuda(false)} className="rounded-lg p-1 text-slate-400"><X size={20} /></button>
            </div>
            <ol className="mt-4 space-y-4 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marca-600 text-xs font-semibold text-white">1</span>
                <span>Abra este site no <strong>Safari</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marca-600 text-xs font-semibold text-white">2</span>
                <span>Toque em <Share size={15} className="inline align-text-bottom text-sky-600" /> <strong>Compartilhar</strong>, na barra de baixo.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marca-600 text-xs font-semibold text-white">3</span>
                <span>Escolha <PlusSquare size={15} className="inline align-text-bottom" /> <strong>Adicionar à Tela de Início</strong> e toque em <strong>Adicionar</strong>.</span>
              </li>
            </ol>
            <button onClick={() => setAjuda(false)} className="btn-primario mt-6 w-full py-3">Entendi</button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
