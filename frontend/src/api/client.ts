import axios, { AxiosError } from 'axios'

// Create axios instance
export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Don't redirect if we're already on the login page
      if (!window.location.pathname.includes('/login')) {
        // Clear auth data and redirect to login
        localStorage.removeItem('auth_token')
        localStorage.removeItem('token_name')
        localStorage.removeItem('login_timestamp')
        localStorage.removeItem('remember_me')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// API error type
export interface ApiError {
  message: string
  status?: number
  detail?: string
}

// Helper to extract error message
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.detail || error.message
  }
  return 'An unexpected error occurred'
}