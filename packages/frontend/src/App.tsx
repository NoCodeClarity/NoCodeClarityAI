import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Router, Route, Switch } from 'wouter'
import { WalletProvider } from './lib/wallet-context'
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <Router>
          <Switch>
            <Route path="/" component={Console} />
            <Route path="/activity" component={Activity} />
            <Route path="/vault" component={Vault} />
            <Route component={NotFound} />
          </Switch>
        </Router>
      </WalletProvider>
    </QueryClientProvider>
  )
}
