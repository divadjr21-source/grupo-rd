import './globals.css'

export const metadata = {
  title: 'Grupo RD — Limpeza, Jardinagem e Reforma',
  description: 'Solicite serviços de limpeza, jardinagem e reforma para sua casa, condomínio ou empresa.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#178a49',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
