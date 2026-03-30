import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { LogOut, HelpCircle, Menu, X } from 'lucide-react'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
              <nav className="hidden md:flex items-center gap-1 select-none">
                <Link
                  to="/agents"
                  className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-md hover:text-foreground hover:bg-muted ${
                    location.pathname.startsWith('/agents') ? 'text-nav-active border-b-2 border-brand-fuchsia rounded-b-none' : 'text-muted-foreground'
                  }`}
                >
                  Agents
                </Link>
                <Link
                  to="/knowledge-bases"
                  className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-md hover:text-foreground hover:bg-muted ${
                    location.pathname.startsWith('/knowledge-bases') ? 'text-nav-active border-b-2 border-brand-fuchsia rounded-b-none' : 'text-muted-foreground'
                  }`}
                >
                  Knowledge Bases
                </Link>
                <Link
                  to="/media"
                  className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-md hover:text-foreground hover:bg-muted ${
                    location.pathname.startsWith('/media') ? 'text-nav-active border-b-2 border-brand-fuchsia rounded-b-none' : 'text-muted-foreground'
                  }`}
                >
                  Media Library
                </Link>
                <Link
                  to="/call-summaries"
                  className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-md hover:text-foreground hover:bg-muted ${
                    location.pathname === '/call-summaries' ? 'text-nav-active border-b-2 border-brand-fuchsia rounded-b-none' : 'text-muted-foreground'
                  }`}
                >
                  Call Summaries
                </Link>
                <Link
                  to="/admin"
                  className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-md hover:text-foreground hover:bg-muted ${
                    location.pathname.startsWith('/admin') ? 'text-nav-active border-b-2 border-brand-fuchsia rounded-b-none' : 'text-muted-foreground'
                  }`}
                >
                  Admin
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden h-10 w-10"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                <span className="sr-only">Toggle menu</span>
              </Button>
              <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline truncate max-w-[120px]">
                {tokenName}
              </span>
              <ChangeIndicator />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHelp(true)}
                className="h-10 w-10"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="sr-only">Help</span>
              </Button>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-10 w-10"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-b bg-background">
          <div className="container mx-auto px-4 py-2 space-y-1">
            <Link
              to="/agents"
              onClick={() => setMobileMenuOpen(false)}
              className={`block py-2 px-3 rounded-md text-sm font-medium transition-colors hover:bg-accent ${
                location.pathname.startsWith('/agents') ? 'text-nav-active bg-accent/50' : 'text-muted-foreground'
              }`}
            >
              Agents
            </Link>
            <Link
              to="/knowledge-bases"
              onClick={() => setMobileMenuOpen(false)}
              className={`block py-2 px-3 rounded-md text-sm font-medium transition-colors hover:bg-accent ${
                location.pathname.startsWith('/knowledge-bases') ? 'text-nav-active bg-accent/50' : 'text-muted-foreground'
              }`}
            >
              Knowledge Bases
            </Link>
            <Link
              to="/media"
              onClick={() => setMobileMenuOpen(false)}
              className={`block py-2 px-3 rounded-md text-sm font-medium transition-colors hover:bg-accent ${
                location.pathname.startsWith('/media') ? 'text-nav-active bg-accent/50' : 'text-muted-foreground'
              }`}
            >
              Media Library
            </Link>
            <Link
              to="/call-summaries"
              onClick={() => setMobileMenuOpen(false)}
              className={`block py-2 px-3 rounded-md text-sm font-medium transition-colors hover:bg-accent ${
                location.pathname === '/call-summaries' ? 'text-nav-active bg-accent/50' : 'text-muted-foreground'
              }`}
            >
              Call Summaries
            </Link>
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={`block py-2 px-3 rounded-md text-sm font-medium transition-colors hover:bg-accent ${
                location.pathname.startsWith('/admin') ? 'text-nav-active bg-accent/50' : 'text-muted-foreground'
              }`}
            >
              Admin
            </Link>
          </div>
        </nav>
      )}

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
      
      {/* Help Modal */}
      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}