import { Link } from 'wouter'
import { Navbar } from '../components/Navbar'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export function NotFound() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
            <AlertCircle className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-bold text-white">404 — Sector Not Found</h1>
          <p className="text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
            The agents searched the chain but couldn't find the page you're looking for.
          </p>
          <div className="pt-4">
            <Link href="/">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white font-semibold shadow-lg shadow-[hsl(var(--primary)/0.3)] hover:shadow-[hsl(var(--primary)/0.5)] transition-all cursor-pointer">
                <ArrowLeft className="w-4 h-4" /> Return to Console
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
