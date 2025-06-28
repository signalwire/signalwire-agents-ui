import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, LoginRequest } from '@/api/auth'

interface AuthContextType {
  isAuthenticated: boolean
  tokenName: string | null
  isLoading: boolean
  login: (data: LoginRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize auth state from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem('auth_token')
    const name = localStorage.getItem('token_name')
    return !!(token && name)
  })
  const [tokenName, setTokenName] = useState<string | null>(() => {
    return localStorage.getItem('token_name')
  })
  const [isLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Re-check auth status when component mounts
    const token = localStorage.getItem('auth_token')
    const name = localStorage.getItem('token_name')
    if (token && name) {
      setIsAuthenticated(true)
      setTokenName(name)
    } else {
      setIsAuthenticated(false)
      setTokenName(null)
    }
  }, [])

  const login = async (data: LoginRequest) => {
    try {
      const response = await authApi.login(data)
      localStorage.setItem('auth_token', response.access_token)
      localStorage.setItem('token_name', response.name)
      
      // Store login timestamp if remember me is enabled
      if (data.remember_me) {
        localStorage.setItem('login_timestamp', new Date().toISOString())
        localStorage.setItem('remember_me', 'true')
      } else {
        localStorage.removeItem('login_timestamp')
        localStorage.removeItem('remember_me')
      }
      
      setIsAuthenticated(true)
      setTokenName(response.name)
      navigate('/')
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('token_name')
    localStorage.removeItem('login_timestamp')
    localStorage.removeItem('remember_me')
    setIsAuthenticated(false)
    setTokenName(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, tokenName, isLoading, login, logout }}>
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