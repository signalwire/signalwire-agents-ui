import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, LoginRequest } from '@/api/auth'

export type UserRole = 'admin' | 'user' | 'viewer'

interface AuthContextType {
  isAuthenticated: boolean
  tokenName: string | null
  role: UserRole | null
  isLoading: boolean
  isAdmin: boolean
  isViewer: boolean
  login: (data: LoginRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [tokenName, setTokenName] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Check auth status by calling /api/auth/me (reads the httpOnly cookie server-side)
    authApi.me()
      .then((data) => {
        setIsAuthenticated(true)
        setTokenName(data.name)
        setRole((data.role as UserRole) || 'admin')
        localStorage.setItem('token_name', data.name)
      })
      .catch(() => {
        setIsAuthenticated(false)
        setTokenName(null)
        setRole(null)
        localStorage.removeItem('token_name')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const login = async (data: LoginRequest) => {
    const response = await authApi.login(data)
    // The httpOnly cookie is set by the server response automatically.
    localStorage.setItem('token_name', response.name)
    setIsAuthenticated(true)
    setTokenName(response.name)
    setRole((response.role as UserRole) || 'admin')
    navigate('/')
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Even if the server call fails, clear local state
    }
    localStorage.removeItem('token_name')
    setIsAuthenticated(false)
    setTokenName(null)
    setRole(null)
    navigate('/login')
  }

  const isAdmin = role === 'admin'
  const isViewer = role === 'viewer'

  return (
    <AuthContext.Provider value={{ isAuthenticated, tokenName, role, isLoading, isAdmin, isViewer, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
