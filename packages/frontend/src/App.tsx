import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Router, Route, Switch } from 'wouter'
import { WalletProvider, useWallet } from './lib/wallet-context'
import { useSwarmSSE } from './lib/sse'
import { Console } from './pages/Console'
import { Activity } from './pages/Activity'
import { Vault } from './pages/Vault'
import { NotFound } from './pages/NotFound'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  },
})

function AppRoutes() {
  const { connected } = useWallet()
  useSwarmSSE(connected)

  return (
    <Router>
      <Switch>
        <Route path="/" component={Console} />
        <Route path="/activity" component={Activity} />
        <Route path="/vault" component={Vault} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <AppRoutes />
      </WalletProvider>
    </QueryClientProvider>
  )
}
