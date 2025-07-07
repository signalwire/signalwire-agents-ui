import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiClient } from '@/api/client'

interface BackendContextType {
  isConnected: boolean
  isReady: boolean
  setConnected: (connected: boolean) => void
  setReady: (ready: boolean) => void
  checkBackendHealth: () => Promise<boolean>
}

const BackendContext = createContext<BackendContextType | undefined>(undefined)

export function useBackend() {
  const context = useContext(BackendContext)
  if (!context) {
    throw new Error('useBackend must be used within BackendProvider')
  }
  return context
}

interface BackendProviderProps {
  children: ReactNode
}

export function BackendProvider({ children }: BackendProviderProps) {
  const [isConnected, setIsConnected] = useState(true)
  const [isReady, setIsReady] = useState(true)
  const [healthCheckInterval, setHealthCheckInterval] = useState<ReturnType<typeof setInterval> | null>(null)

  const setConnected = (connected: boolean) => {
    setIsConnected(connected)
    if (connected && !isReady) {
      // When reconnected, start checking if backend is ready
      checkReadiness()
    }
  }

  const setReady = (ready: boolean) => {
    setIsReady(ready)
  }

  const checkBackendHealth = async (): Promise<boolean> => {
    try {
      // First check basic health
      const healthResponse = await apiClient.get('/health')
      if (healthResponse.data?.status !== 'healthy') {
        return false
      }
      
      // Then verify we can actually fetch data
      await apiClient.get('/agents')
      // If we get here without error, backend is fully ready
      return true
    } catch {
      return false
    }
  }

  const checkReadiness = async () => {
    // Clear any existing interval
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval)
    }

    // Check immediately
    const isHealthy = await checkBackendHealth()
    if (isHealthy) {
      setReady(true)
      return
    }

    // If not ready, keep checking every 2 seconds
    const interval = setInterval(async () => {
      const isHealthy = await checkBackendHealth()
      if (isHealthy) {
        setReady(true)
        clearInterval(interval)
        setHealthCheckInterval(null)
      }
    }, 2000)

    setHealthCheckInterval(interval)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval)
      }
    }
  }, [healthCheckInterval])

  return (
    <BackendContext.Provider value={{
      isConnected,
      isReady,
      setConnected,
      setReady,
      checkBackendHealth
    }}>
      {children}
    </BackendContext.Provider>
  )
}