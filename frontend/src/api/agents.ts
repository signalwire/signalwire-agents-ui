import { apiClient } from './client'

export interface AgentConfig {
  voice: string
  language: string
  engine?: string
  model?: string
  // New multi-language support
  languages?: Array<{
    id?: string
    name: string
    code: string
    voice: string
    engine: string
    model?: string
  }>
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
    enabled?: boolean
    mode: 'builtin' | 'custom'
    text?: string
    custom_url?: string
  }
  contexts_steps_config?: {
    contexts: any[]
  }
  knowledge_base?: {
    enabled: boolean
    search_count?: number
    similarity_threshold?: number
    chunk_size?: number
    chunk_overlap?: number
  }
  prompt_llm_params?: Record<string, any>
  post_prompt_llm_params?: Record<string, any>
  knowledge_base_ids?: string[]
  knowledge_base_config?: {
    knowledge_base_ids: string[]
    search_strategy: 'all' | 'round_robin' | 'fallback'
    similarity_threshold?: number
    search_count?: number
  }
  knowledge_bases?: Array<{
    id: string
    config?: Record<string, any>
  }>
}

export interface Agent {
  id: string
  name: string
  description?: string
  config: AgentConfig
  swml_url: string
  created_at: string
  updated_at: string
  updated_by?: string
  version?: number
  knowledge_bases?: Array<{
    id: string
    name: string
  }>
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

export interface CallSummary {
  id: string
  agent_id: string
  agent_name: string
  call_id: string
  ai_session_id?: string
  call_start_date?: number
  call_end_date?: number
  caller_id_name?: string
  caller_id_number?: string
  post_prompt_summary?: string
  total_minutes?: number
  total_input_tokens?: number
  total_output_tokens?: number
  total_cost?: number
  has_recording: boolean
  created_at: string
}

export interface CallSummaryDetail extends CallSummary {
  call_log: any[]
  swaig_log: any[]
  raw_data: Record<string, any>
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

  replace: async (targetId: string, sourceId: string): Promise<Agent> => {
    const response = await apiClient.post<Agent>(`/agents/${targetId}/replace`, {
      source_agent_id: sourceId
    })
    return response.data
  },

  getSummaries: async (agentId: string, skip = 0, limit = 20): Promise<CallSummary[]> => {
    const response = await apiClient.get<CallSummary[]>(`/agents/${agentId}/summaries`, {
      params: { skip, limit }
    })
    return response.data
  },

  getSummaryDetail: async (agentId: string, summaryId: string): Promise<CallSummaryDetail> => {
    const response = await apiClient.get<CallSummaryDetail>(`/agents/${agentId}/summaries/${summaryId}`)
    return response.data
  },
}