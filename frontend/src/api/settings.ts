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

  update: async (key: string, value: any): Promise<void> => {
    await apiClient.put(`/admin/settings/${key}`, { value })
  },
}