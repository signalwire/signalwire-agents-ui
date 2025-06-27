import { apiClient } from './client'

export interface AgentConfig {
  voice: string
  language: string
  prompt_sections: Array<{
    title: string
    body?: string
    bullets?: string[]
  }>
  skills: Array<{
    name: string
    params?: Record<string, any>
  }>
  params: Record<string, any>
  post_prompt?: string
  post_prompt_url?: string
  hints: string[]
  basic_auth_user?: string
  basic_auth_password?: string
}

export interface Agent {
  id: string
  name: string
  description?: string
  config: AgentConfig
  swml_url: string
  created_at: string
  updated_at: string
}

export interface CreateAgentRequest {
  name: string
  description?: string
  config: AgentConfig
}

export interface UpdateAgentRequest {
  name?: string
  description?: string
  config?: AgentConfig
}

export const agentsApi = {
  list: async (): Promise<Agent[]> => {
    const response = await apiClient.get<Agent[]>('/agents')
    return response.data
  },

  get: async (id: string): Promise<Agent> => {
    const response = await apiClient.get<Agent>(`/agents/${id}`)
    return response.data
  },

  create: async (data: CreateAgentRequest): Promise<Agent> => {
    const response = await apiClient.post<Agent>('/agents', data)
    return response.data
  },

  update: async (id: string, data: UpdateAgentRequest): Promise<Agent> => {
    const response = await apiClient.put<Agent>(`/agents/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/agents/${id}`)
  },
}