import { apiClient } from './client'

export interface Token {
  id: string
  name: string
  token: string
  created_at: string
  expires_at: string
  last_used_at?: string
  is_active: boolean
}

export interface CreateTokenRequest {
  name: string
  expiry_days: number
}

export const tokensApi = {
  list: async (): Promise<Token[]> => {
    const response = await apiClient.get('/api/admin/tokens')
    return response.data
  },

  create: async (data: CreateTokenRequest): Promise<Token> => {
    const response = await apiClient.post('/api/admin/tokens', data)
    return response.data
  },

  revoke: async (tokenId: string): Promise<void> => {
    await apiClient.delete(`/api/admin/tokens/${tokenId}`)
  },
}