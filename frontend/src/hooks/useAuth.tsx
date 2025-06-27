import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, LoginRequest } from '@/api/auth'

interface AuthContextType {
  isAuthenticated: boolean
  tokenName: string | null
  login: (data: LoginRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [tokenName, setTokenName] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if token exists on mount
    const token = localStorage.getItem('auth_token')
    const name = localStorage.getItem('token_name')
    if (token && name) {
      setIsAuthenticated(true)
      setTokenName(name)
    }
  }, [])

  const login = async (data: LoginRequest) => {
    try {
      const response = await authApi.login(data)
      localStorage.setItem('auth_token', response.access_token)
      localStorage.setItem('token_name', response.name)
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
    setIsAuthenticated(false)
    setTokenName(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, tokenName, login, logout }}>
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