import { apiClient } from './client'

export interface Settings {
  available_engines: string[]
  available_languages: string[]
  rate_limits: {
    api: number
    swml: number
  }
  rime_voices: string[]
  elevenlabs_voices: string[]
  azure_voices: string[]
  openai_voices: string[]
  google_voices: string[]
  global_basic_auth: {
    enabled: boolean
    username: string
    password: string
  }
  // Admin settings
  organization_name?: string
  support_email?: string
  default_voice?: string
  default_ai_model?: string
  default_system_prompt?: string
  enforce_basic_auth?: boolean
  enable_audit_log?: boolean
  jwt_expiration_hours?: number
}

export interface SecuritySettings {
  global_basic_auth_enabled?: boolean
  global_basic_auth_user?: string
  global_basic_auth_password?: string
}

export const settingsApi = {
  get: async (): Promise<Settings> => {
    const response = await apiClient.get<Record<string, any>>('/admin/settings')
    // Transform the key-value pairs into a single object
    const settings: any = {}
    Object.entries(response.data).forEach(([key, value]) => {
      settings[key] = value
    })
    return settings as Settings
  },

  update: async (settings: Partial<Settings>): Promise<void> => {
    // Update multiple settings at once
    for (const [key, value] of Object.entries(settings)) {
      await apiClient.put(`/admin/settings/${key}`, { value })
    }
  },

  updateSetting: async (key: string, value: any): Promise<void> => {
    await apiClient.put(`/admin/settings/${key}`, { value })
  },

  getSecuritySettings: async (): Promise<SecuritySettings> => {
    const response = await apiClient.get('/api/admin/security')
    return response.data
  },

  updateSecuritySettings: async (settings: SecuritySettings): Promise<SecuritySettings> => {
    const response = await apiClient.put('/api/admin/security', settings)
    return response.data
  },
}