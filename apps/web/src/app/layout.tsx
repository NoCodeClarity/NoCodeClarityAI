import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NoCodeClarity AI',
  description: 'AI agent swarm for Bitcoin on Stacks',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
