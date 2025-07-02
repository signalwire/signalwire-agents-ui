import { apiClient } from './client'

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
  raw_data: any
}

export interface CallSummariesParams {
  skip?: number
  limit?: number
  agent_id?: string
  has_recording?: boolean
  caller_number?: string
  start_date?: number
  end_date?: number
  sort_by?: 'created_at' | 'duration' | 'agent_name'
  sort_order?: 'asc' | 'desc'
}

export const callSummariesApi = {
  list: async (params: CallSummariesParams = {}): Promise<CallSummary[]> => {
    const queryParams = new URLSearchParams()
    
    if (params.skip !== undefined) queryParams.append('skip', params.skip.toString())
    if (params.limit !== undefined) queryParams.append('limit', params.limit.toString())
    if (params.agent_id) queryParams.append('agent_id', params.agent_id)
    if (params.has_recording !== undefined) queryParams.append('has_recording', params.has_recording.toString())
    if (params.caller_number) queryParams.append('caller_number', params.caller_number)
    if (params.start_date) queryParams.append('start_date', params.start_date.toString())
    if (params.end_date) queryParams.append('end_date', params.end_date.toString())
    if (params.sort_by) queryParams.append('sort_by', params.sort_by)
    if (params.sort_order) queryParams.append('sort_order', params.sort_order)
    
    const url = `/call-summaries${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response = await apiClient.get(url)
    return response.data
  },

  get: async (summaryId: string): Promise<CallSummaryDetail> => {
    const response = await apiClient.get(`/call-summaries/${summaryId}`)
    return response.data
  },
}