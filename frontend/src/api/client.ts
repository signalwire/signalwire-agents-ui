import axios, { AxiosError } from 'axios'

/** Read a cookie value by name. */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

// Create axios instance — cookies are sent automatically
export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor: attach CSRF token on mutating requests
apiClient.interceptors.request.use(
  (config) => {
    const method = (config.method || '').toUpperCase()
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = getCookie('csrf_token')
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Don't redirect if we're already on the login page
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token_name')
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
