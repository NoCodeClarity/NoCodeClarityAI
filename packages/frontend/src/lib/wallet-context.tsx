// ── Wallet Context (Stacks Connect) ──────────────────────────────────────────
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { showConnect } from '@stacks/connect'
import { StacksMainnet } from '@stacks/network'

interface WalletState {
  address: string
  publicKey: string
  strategyId: string
  connected: boolean
  connect: () => void
  disconnect: () => void
  setStrategyId: (id: string) => void
}

const WalletContext = createContext<WalletState | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState(() => localStorage.getItem('ncc_address') || '')
  const [publicKey, setPublicKey] = useState(() => localStorage.getItem('ncc_pubkey') || '')
  const [strategyId, setStrategyIdState] = useState(() => localStorage.getItem('ncc_strategy') || '')

  const connect = useCallback(() => {
    showConnect({
      appDetails: {
        name: 'NoCodeClarity AI',
        icon: '/logo.svg',
      },
      onFinish: (payload) => {
        const addr = payload.userSession.loadUserData().profile.stxAddress.mainnet
        const pubkey = payload.userSession.loadUserData().appPrivateKey || ''
        setAddress(addr)
        setPublicKey(pubkey)
        localStorage.setItem('ncc_address', addr)
        localStorage.setItem('ncc_pubkey', pubkey)
      },
      onCancel: () => {},
      userSession: undefined as any,
    })
  }, [])

  const disconnect = useCallback(() => {
    setAddress('')
    setPublicKey('')
    setStrategyIdState('')
    localStorage.removeItem('ncc_address')
    localStorage.removeItem('ncc_pubkey')
    localStorage.removeItem('ncc_strategy')
  }, [])

  const setStrategyId = useCallback((id: string) => {
    setStrategyIdState(id)
    localStorage.setItem('ncc_strategy', id)
  }, [])

  return (
    <WalletContext.Provider value={{
      address,
      publicKey,
      strategyId,
      connected: !!address,
      connect,
      disconnect,
      setStrategyId,
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
