// ── Wallet Context (Stacks Connect) ──────────────────────────────────────────
import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { showConnect } from '@stacks/connect'

type Network = 'mainnet' | 'testnet'

interface WalletState {
  address: string
  publicKey: string
  strategyId: string
  network: Network
  connected: boolean
  connect: () => void
  disconnect: () => void
  setStrategyId: (id: string) => void
  setNetwork: (network: Network) => void
}

const WalletContext = createContext<WalletState | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState(() => localStorage.getItem('ncc_address') || '')
  const [publicKey, setPublicKey] = useState(() => localStorage.getItem('ncc_pubkey') || '')
  const [strategyId, setStrategyIdState] = useState(() => localStorage.getItem('ncc_strategy') || '')
  const [network, setNetworkState] = useState<Network>(
    () => (localStorage.getItem('ncc_network') as Network) || 'mainnet'
  )

  // Track cleanup callbacks for disconnect
  const cleanupCallbacks = useRef<Set<() => void>>(new Set())

  const connect = useCallback(() => {
    showConnect({
      appDetails: {
        name: 'NoCodeClarity AI',
        icon: '/logo.svg',
      },
      onFinish: (payload) => {
        const userData = payload.userSession.loadUserData()
        const addr = network === 'mainnet'
          ? userData.profile.stxAddress.mainnet
          : userData.profile.stxAddress.testnet
        const pubkey = userData.appPrivateKey || ''
        setAddress(addr)
        setPublicKey(pubkey)
        localStorage.setItem('ncc_address', addr)
        localStorage.setItem('ncc_pubkey', pubkey)
      },
      onCancel: () => {},
      userSession: undefined as any,
    })
  }, [network])

  const disconnect = useCallback(() => {
    // Run cleanup callbacks (SSE, pending approvals, etc.)
    cleanupCallbacks.current.forEach(cb => {
      try { cb() } catch {}
    })
    cleanupCallbacks.current.clear()

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

  const setNetwork = useCallback((n: Network) => {
    setNetworkState(n)
    localStorage.setItem('ncc_network', n)
    // Re-derive address for the new network if wallet was connected
    // User will need to reconnect to get the correct network address
    if (address) {
      disconnect()
    }
  }, [address, disconnect])

  return (
    <WalletContext.Provider value={{
      address,
      publicKey,
      strategyId,
      network,
      connected: !!address,
      connect,
      disconnect,
      setStrategyId,
      setNetwork,
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
