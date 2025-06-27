import { useQuery } from '@tanstack/react-query'
import { Activity, Database, HardDrive, Cpu, Package, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { systemApi } from '@/api/system'

export function SystemInfo() {
  const { data: systemInfo, isLoading, refetch } = useQuery({
    queryKey: ['system-info'],
    queryFn: systemApi.getInfo,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: systemApi.getAuditLogs,
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* System Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={systemInfo?.status === 'healthy' ? 'default' : 'destructive'}>
                {systemInfo?.status || 'Unknown'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Uptime: {systemInfo?.uptime || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemInfo?.db_connections || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active connections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemInfo?.memory_percent || 0}%
            </div>
            <Progress value={systemInfo?.memory_percent || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemInfo?.cpu_percent || 0}%
            </div>
            <Progress value={systemInfo?.cpu_percent || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Version Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Version Information</CardTitle>
              <CardDescription>
                System and dependency versions
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">SignalWire Agent Builder</span>
              </div>
              <div className="pl-6 space-y-1 text-sm">
                <div>Version: {systemInfo?.app_version || '1.0.0'}</div>
                <div>Environment: {systemInfo?.environment || 'production'}</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">SignalWire Agents SDK</span>
              </div>
              <div className="pl-6 space-y-1 text-sm">
                <div>Version: {systemInfo?.sdk_version || 'Unknown'}</div>
                <div>Installed Skills: {systemInfo?.installed_skills || 0}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Last 10 audit log entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditLogs && auditLogs.length > 0 ? (
            <div className="space-y-2">
              {auditLogs.slice(0, 10).map((log: any, index: number) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{log.action}</Badge>
                    <span>{log.description}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No audit logs available</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}