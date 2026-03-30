import { apiClient } from './client'

export interface LoginRequest {
  token: string
  remember_me?: boolean
}

export interface LoginResponse {
  access_token: string
  token_type: string
  name: string
  role: string
}

export interface MeResponse {
  token_id: string
  name: string
  role: string
  exp: number
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data)
    return response.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  me: async (): Promise<MeResponse> => {
    const response = await apiClient.get<MeResponse>('/auth/me')
    return response.data
  },
}
