import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { LogOut, Plus, Settings } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { tokenName, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/" className="text-xl font-semibold">
                SignalWire Agent Builder
              </Link>
              <nav className="hidden md:flex items-center gap-4">
                <Link
                  to="/agents"
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.pathname === '/agents' ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Agents
                </Link>
                <Link
                  to="/admin"
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.pathname === '/admin' ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Admin
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {tokenName}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}