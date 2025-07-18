import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Detect if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    // Handle the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // For iOS, show prompt if not already installed and conditions are met
    if (iOS && !standalone) {
      // Check if user has dismissed this before and if 24 hours have passed
      const dismissedTimestamp = localStorage.getItem('pwa-install-dismissed-timestamp')
      const now = Date.now()
      const twentyFourHours = 24 * 60 * 60 * 1000
      
      if (!dismissedTimestamp || (now - parseInt(dismissedTimestamp)) > twentyFourHours) {
        // Clean up old dismissal if it's expired
        if (dismissedTimestamp && (now - parseInt(dismissedTimestamp)) > twentyFourHours) {
          localStorage.removeItem('pwa-install-dismissed-timestamp')
        }
        setTimeout(() => setShowPrompt(true), 3000) // Show after 3 seconds
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Chrome/Edge/Samsung Internet
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      }
      
      setDeferredPrompt(null)
      setShowPrompt(false)
    } else if (isIOS) {
      // For iOS, we can't programmatically install, so we do nothing here
      // The user will see the iOS-specific instructions
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Store timestamp when dismissed instead of using setTimeout
    localStorage.setItem('pwa-install-dismissed-timestamp', Date.now().toString())
  }

  // Debug function to reset the dismissal (can be called from browser console)
  if (typeof window !== 'undefined') {
    (window as any).resetPWAPrompt = () => {
      localStorage.removeItem('pwa-install-dismissed-timestamp')
      console.log('PWA install prompt reset - refresh the page to see it again')
    }
  }

  if (!showPrompt || isStandalone) {
    return null
  }

  return (
    <div className="install-prompt">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Download className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Install Agent Builder</h3>
            {isIOS ? (
              <p className="text-xs text-muted-foreground mt-1">
                Tap <span className="inline-flex items-center mx-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 15v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4M12 3l-4 4h3v8h2V7h3l-4-4z"/>
                  </svg>
                </span> in Safari, then "Add to Home Screen"
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Add to your home screen for quick access
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isIOS && (
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="h-8 px-3"
            >
              Install
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </div>
    </div>
  )
} 