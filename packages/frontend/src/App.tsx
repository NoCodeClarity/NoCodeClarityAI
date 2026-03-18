import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Router, Route, Switch } from 'wouter'
import { WalletProvider, useWallet } from './lib/wallet-context'
import { useSwarmSSE } from './lib/sse'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import { Console } from './pages/Console'
import { Activity } from './pages/Activity'
import { Vault } from './pages/Vault'
import { Analytics } from './pages/Analytics'
import { Stacking } from './pages/Stacking'
import { Triggers } from './pages/Triggers'
import { Strategies } from './pages/Strategies'
import { NotFound } from './pages/NotFound'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      retry: 2,
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
        <Route path="/analytics" component={Analytics} />
        <Route path="/stacking" component={Stacking} />
        <Route path="/triggers" component={Triggers} />
        <Route path="/strategies" component={Strategies} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </WalletProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
