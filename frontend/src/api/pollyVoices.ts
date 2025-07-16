import { api } from '@/lib/api'

export interface PollyVoice {
  Id: string
  Name: string
  Gender: string
  LanguageCode: string
  LanguageName: string
  SupportedEngines: string[]
}

export interface PollyLanguage {
  code: string
  name: string
}

export const pollyVoicesApi = {
  getAllVoices: async () => {
    const response = await api.get<PollyVoice[]>('/api/polly-voices/')
    return response.data
  },

  getLanguages: async () => {
    const response = await api.get<PollyLanguage[]>('/api/polly-voices/languages')
    return response.data
  },

  getEngines: async () => {
    const response = await api.get<string[]>('/api/polly-voices/engines')
    return response.data
  },

  getVoicesByLanguage: async (languageCode: string, engine?: string) => {
    const params = engine ? { engine } : {}
    const response = await api.get<PollyVoice[]>(`/api/polly-voices/by-language/${languageCode}`, { params })
    return response.data
  }
}