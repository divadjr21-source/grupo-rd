// Configuração do app instalável (PWA)
export default function manifest() {
  return {
    name: 'Grupo RD — Limpeza, Jardinagem, Reforma e Segurança',
    short_name: 'Grupo RD',
    description: 'Solicite e acompanhe serviços de limpeza, jardinagem, reforma e segurança eletrônica.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#178a49',
    lang: 'pt-BR',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Solicitar serviço', url: '/chamado', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Área da Equipe', url: '/login', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    ],
  }
}
