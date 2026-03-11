'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

export type WalletProvider = 'leather' | 'xverse'

export interface WalletAccount {
  address: string
  publicKey: string
  provider: WalletProvider
  network: 'mainnet' | 'testnet'
}

interface WalletState {
  connected: boolean
  connecting: boolean
  accounts: WalletAccount[]
  activeAccount: WalletAccount | null
  provider: WalletProvider | null
  connect: (provider: WalletProvider) => Promise<void>
  disconnect: () => void
  switchAccount: (address: string) => void
}

const WalletContext = createContext<WalletState | null>(null)

// ── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'nocodeclarity:wallet'

function loadSession(): { accounts: WalletAccount[]; provider: WalletProvider; activeAddress: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSession(accounts: WalletAccount[], provider: WalletProvider, activeAddress: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ accounts, provider, activeAddress }))
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function WalletProviderComponent({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [accounts, setAccounts] = useState<WalletAccount[]>([])
  const [activeAccount, setActiveAccount] = useState<WalletAccount | null>(null)
  const [provider, setProvider] = useState<WalletProvider | null>(null)

  // Restore session on mount
  useEffect(() => {
    const session = loadSession()
    if (session) {
      setAccounts(session.accounts)
      setProvider(session.provider)
      setActiveAccount(session.accounts.find(a => a.address === session.activeAddress) ?? session.accounts[0] ?? null)
      setConnected(true)
    }
  }, [])

  const connect = useCallback(async (walletProvider: WalletProvider) => {
    setConnecting(true)
    try {
      const { showConnect } = await import('@stacks/connect')
      const network = (process.env.NEXT_PUBLIC_STACKS_NETWORK ?? 'testnet') as 'mainnet' | 'testnet'

      await new Promise<void>((resolve, reject) => {
        showConnect({
          appDetails: {
            name: 'NoCodeClarity AI',
            icon: '/logo.png',
          },
          onFinish: (data: any) => {
            // Extract addresses from all available accounts
            const userData = data?.authResponsePayload ?? data
            const addresses: WalletAccount[] = []

            // Primary address (works for both Leather and Xverse)
            if (userData?.profile?.stxAddress) {
              const stxAddr = network === 'mainnet'
                ? userData.profile.stxAddress.mainnet
                : userData.profile.stxAddress.testnet
              if (stxAddr) {
                addresses.push({
                  address: stxAddr,
                  publicKey: '', // NOTE: do NOT store appPrivateKey here
                  provider: walletProvider,
                  network,
                })
              }
            }

            if (addresses.length === 0) {
              reject(new Error('No Stacks address found in wallet response'))
              return
            }

            setAccounts(addresses)
            setActiveAccount(addresses[0]!)
            setProvider(walletProvider)
            setConnected(true)
            saveSession(addresses, walletProvider, addresses[0]!.address)

            // Register wallet with orchestrator (non-blocking)
            fetch('/api/wallet/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                address: addresses[0]!.address,
                provider: walletProvider,
                network,
              }),
            }).catch(() => {}) // non-fatal

            resolve()
          },
          onCancel: () => reject(new Error('User cancelled wallet connection')),
        })
      })
    } catch (e: any) {
      if (e.message !== 'User cancelled wallet connection') {
        console.error('Wallet connection failed:', e)
      }
      throw e
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setConnected(false)
    setAccounts([])
    setActiveAccount(null)
    setProvider(null)
    clearSession()
  }, [])

  const switchAccount = useCallback((address: string) => {
    const account = accounts.find(a => a.address === address)
    if (account) {
      setActiveAccount(account)
      saveSession(accounts, provider!, address)
    }
  }, [accounts, provider])

  return (
    <WalletContext.Provider value={{
      connected, connecting, accounts, activeAccount, provider,
      connect, disconnect, switchAccount,
    }}>
      {children}
    </WalletContext.Provider>
  )
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within <WalletProviderComponent>')
  return ctx
}
