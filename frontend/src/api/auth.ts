import { apiClient } from './client'

export interface LoginRequest {
  token: string
  remember_me?: boolean
}

export interface LoginResponse {
  access_token: string
  token_type: string
  name: string
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data)
    return response.data
  },
}