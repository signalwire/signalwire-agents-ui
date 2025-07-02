import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { LogOut, HelpCircle } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { ThemeToggle } from '@/components/theme-toggle'
import { useTheme } from '@/components/theme-provider'
import { useState } from 'react'
import { HelpModal } from '@/components/help/HelpModal'
import { ChangeIndicator } from './ChangeIndicator'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { tokenName, logout } = useAuth()
  const location = useLocation()
  const { theme } = useTheme()
  const [showHelp, setShowHelp] = useState(false)

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
            <div className="flex items-center gap-2 sm:gap-6">
              <Link to="/" className="flex items-center gap-1 sm:gap-2">
                <img 
                  src={logoSrc} 
                  alt="SignalWire" 
                  className="h-6 sm:h-8 w-auto flex-shrink-0"
                />
                <span className="text-sm sm:text-lg font-semibold whitespace-nowrap">Agent Builder</span>
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
                  to="/call-summaries"
                  className={`text-sm font-medium transition-colors hover:text-nav-hover ${
                    location.pathname === '/call-summaries' ? 'text-nav-active' : 'text-muted-foreground'
                  }`}
                >
                  Call Summaries
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
            
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-muted-foreground hidden lg:inline truncate max-w-[100px] sm:max-w-none">
                {tokenName}
              </span>
              <ChangeIndicator />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHelp(true)}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="sr-only">Help</span>
              </Button>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
      
      {/* Help Modal */}
      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}