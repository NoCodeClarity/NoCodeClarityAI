import type { Metadata } from 'next'
import { WalletProviderComponent } from '@/lib/WalletProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'NoCodeClarity AI',
  description: 'AI agent swarm for Bitcoin on Stacks — non-custodial, risk-gated, fully auditable.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProviderComponent>
          {children}
        </WalletProviderComponent>
      </body>
    </html>
  )
}
