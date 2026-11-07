import './globals.css'
import { RegistrarApp } from '@/components/AppInstalavel'

export const metadata = {
  title: 'Grupo RD — Limpeza, Jardinagem, Reforma e Segurança',
  description: 'Solicite serviços de limpeza, jardinagem, reforma e segurança eletrônica para sua casa, condomínio ou empresa.',
  applicationName: 'Grupo RD',
  appleWebApp: { capable: true, title: 'Grupo RD', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#178a49',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <RegistrarApp />
        {children}
      </body>
    </html>
  )
}
