import { apiClient } from './client'

export interface SystemInfo {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: string
  db_connections: number
  memory_percent: number
  cpu_percent: number
  app_version: string
  environment: string
  sdk_version: string
  installed_skills: number
}

export interface AuditLog {
  id: string
  action: string
  description: string
  user_id: string
  timestamp: string
  metadata?: Record<string, any>
}

export const systemApi = {
  getInfo: async (): Promise<SystemInfo> => {
    const response = await apiClient.get('/api/admin/system/info')
    return response.data
  },

  getAuditLogs: async (limit: number = 10): Promise<AuditLog[]> => {
    const response = await apiClient.get('/api/admin/audit-logs', {
      params: { limit }
    })
    return response.data
  },
}