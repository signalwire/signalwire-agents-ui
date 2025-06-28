import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { LogOut } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { ThemeToggle } from '@/components/theme-toggle'
import { useTheme } from '@/components/theme-provider'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { tokenName, logout } = useAuth()
  const location = useLocation()
  const { theme } = useTheme()

  // Determine which logo to use based on theme
  const logoSrc = theme === 'dark' || 
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) 
    ? '/sw-white.svg' 
    : '/sw-black.svg'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2">
                <img 
                  src={logoSrc} 
                  alt="SignalWire" 
                  className="h-8 w-auto"
                />
                <span className="text-lg font-semibold">Agent Builder</span>
              </Link>
              <nav className="hidden md:flex items-center gap-4">
                <Link
                  to="/agents"
                  className={`text-sm font-medium transition-colors hover:text-nav-hover ${
                    location.pathname.startsWith('/agents') ? 'text-nav-active' : 'text-muted-foreground'
                  }`}
                >
                  Agents
                </Link>
                <Link
                  to="/skills"
                  className={`text-sm font-medium transition-colors hover:text-nav-hover ${
                    location.pathname.startsWith('/skills') ? 'text-nav-active' : 'text-muted-foreground'
                  }`}
                >
                  Skills
                </Link>
                <Link
                  to="/admin"
                  className={`text-sm font-medium transition-colors hover:text-nav-hover ${
                    location.pathname.startsWith('/admin') ? 'text-nav-active' : 'text-muted-foreground'
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
              <ThemeToggle />
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