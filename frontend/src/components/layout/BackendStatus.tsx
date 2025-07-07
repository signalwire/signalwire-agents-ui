import { useEffect, useState } from 'react'
import { Loader2, WifiOff, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface BackendStatusProps {
  isConnected: boolean
  isReady: boolean
}

export function BackendStatus({ isConnected, isReady }: BackendStatusProps) {
  const [showOverlay, setShowOverlay] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    if (!isConnected) {
      setShowOverlay(true)
      setIsReconnecting(true)
    } else if (!isReady) {
      setShowOverlay(true)
      setIsReconnecting(false)
    } else {
      // Add a delay before hiding to ensure everything is loaded
      const timer = setTimeout(() => {
        setShowOverlay(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isConnected, isReady])

  if (!showOverlay) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          {isReconnecting ? (
            <>
              <div className="relative">
                <WifiOff className="h-16 w-16 text-destructive" />
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground absolute -bottom-2 -right-2" />
              </div>
              <h2 className="text-2xl font-semibold">Backend Unavailable</h2>
              <p className="text-muted-foreground">
                The connection to the backend has been lost. This usually happens during updates or restarts.
              </p>
              <p className="text-sm text-muted-foreground">
                Attempting to reconnect...
              </p>
            </>
          ) : (
            <>
              <div className="relative">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <Loader2 className="h-8 w-8 animate-spin text-primary absolute -bottom-2 -right-2" />
              </div>
              <h2 className="text-2xl font-semibold">Backend Starting</h2>
              <p className="text-muted-foreground">
                Connection established. Loading application data...
              </p>
              <p className="text-sm text-muted-foreground">
                This will take just a moment.
              </p>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}