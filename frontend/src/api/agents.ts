import { apiClient } from './client'

export interface AgentConfig {
  voice: string
  language: string
  engine?: string
  model?: string
  prompt_sections: Array<{
    title: string
    body?: string
    bullets?: string[]
  }>
  skills: Array<{
    name: string
    params?: Record<string, any>
    tool_name?: string
  }>
  params: Record<string, any>
  post_prompt?: string
  post_prompt_url?: string
  hints: string[]
  basic_auth_user?: string
  basic_auth_password?: string
  
  // New configuration options
  simple_hints?: string[]
  pattern_hints?: Array<{
    hint: string
    pattern: string
    replace: string
    ignore_case: boolean
  }>
  pronunciations?: Array<{
    replace: string
    with: string
    ignore_case: boolean
  }>
  global_data?: Record<string, any>
  native_functions?: string[]
  internal_fillers?: Record<string, Record<string, string[]>>
  record_call?: boolean
  record_format?: 'mp4' | 'wav'
  record_stereo?: boolean
  post_prompt_config?: {
    mode: 'builtin' | 'custom'
    custom_url?: string
  }
  contexts_steps_config?: {
    contexts: any[]
  }
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