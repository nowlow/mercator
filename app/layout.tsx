import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mercator map projector',
  description: 'View the classic mercator projection from an other angle',
  generator: 'v0.dev',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    images: '/cover.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
