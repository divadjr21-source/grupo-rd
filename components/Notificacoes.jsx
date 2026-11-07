'use client'

import { useEffect, useState } from 'react'
import { Bell, BellRing, BellOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { VAPID_PUBLICA } from '@/lib/push'

function chaveParaBytes(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const bruto = atob(b64)
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)))
}

// Botão "Ativar avisos": pede permissão e registra este aparelho para receber notificações
export function BotaoNotificacoes({ perfilId, compacto = false, className = '' }) {
  const [estado, setEstado] = useState('carregando') // 'sem-suporte' | 'iphone-instalar' | 'ativo' | 'bloqueado' | 'desativado'
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const instalado = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setEstado(iphone && !instalado ? 'iphone-instalar' : 'sem-suporte')
      return
    }
    if (Notification.permission === 'denied') return setEstado('bloqueado')
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEstado(sub && Notification.permission === 'granted' ? 'ativo' : 'desativado'))
      .catch(() => setEstado('desativado'))
  }, [])

  async function ativar() {
    if (estado === 'iphone-instalar') {
      return alert('No iPhone, os avisos funcionam com o app instalado.\n\nNo Safari, toque em Compartilhar → "Adicionar à Tela de Início", abra o app pelo ícone e toque em "Ativar avisos" de novo.')
    }
    if (estado === 'bloqueado') {
      return alert('Os avisos estão bloqueados neste aparelho.\n\nToque no cadeado ao lado do endereço do site (ou nas configurações do app) e permita as notificações.')
    }
    if (estado === 'ativo') {
      if (!confirm('Desativar os avisos neste aparelho?')) return
      setOcupado(true)
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await supabase.from('push_inscricoes').delete().eq('endpoint', sub.endpoint)
        await sub.unsubscribe()
      }
      setOcupado(false)
      return setEstado('desativado')
    }

    setOcupado(true)
    try {
      const permissao = await Notification.requestPermission()
      if (permissao !== 'granted') {
        setEstado(permissao === 'denied' ? 'bloqueado' : 'desativado')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(VAPID_PUBLICA) }))
      const json = sub.toJSON()
      await supabase.from('push_inscricoes').delete().eq('endpoint', json.endpoint)
      const { error } = await supabase.from('push_inscricoes').insert({ endpoint: json.endpoint, perfil_id: perfilId, inscricao: json })
      if (error) throw error
      setEstado('ativo')
      reg.showNotification('Avisos ativados ✅', { body: 'Você vai receber os avisos do Grupo RD neste aparelho.', icon: '/icon-192.png' })
    } catch (e) {
      alert('Não foi possível ativar os avisos neste aparelho.')
      setEstado('desativado')
    } finally {
      setOcupado(false)
    }
  }

  if (estado === 'carregando' || estado === 'sem-suporte') return null

  const Icone = estado === 'ativo' ? BellRing : estado === 'bloqueado' ? BellOff : Bell
  const texto = estado === 'ativo' ? 'Avisos ativados' : 'Ativar avisos'
  const destaque = estado !== 'ativo' ? 'text-marca-700' : ''

  return (
    <button type="button" onClick={ativar} disabled={ocupado} className={`${className} ${compacto ? '' : destaque}`}
      title={texto} aria-label={texto}>
      <Icone size={compacto ? 18 : 18} className={estado !== 'ativo' ? 'text-marca-600' : ''} />
      {!compacto && <span>{texto}</span>}
    </button>
  )
}
