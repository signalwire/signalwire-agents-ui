import { useState } from 'react'
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/use-toast'
import { useQuery, useMutation } from '@tanstack/react-query'
import { settingsApi } from '@/api/settings'

export function SecuritySettings() {
  const { data: settings, refetch } = useQuery({
    queryKey: ['security-settings'],
    queryFn: () => settingsApi.getSecuritySettings(),
  })

  const [showGlobalPassword, setShowGlobalPassword] = useState(false)
  const [globalAuth, setGlobalAuth] = useState({
    enabled: settings?.global_basic_auth_enabled || false,
    username: settings?.global_basic_auth_user || '',
    password: settings?.global_basic_auth_password || '',
  })

  const updateMutation = useMutation({
    mutationFn: settingsApi.updateSecuritySettings,
    onSuccess: () => {
      toast({ title: 'Security settings updated successfully' })
      refetch()
    },
    onError: () => {
      toast({
        title: 'Failed to update security settings',
        variant: 'destructive',
      })
    },
  })

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 20; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handleSaveGlobalAuth = () => {
    updateMutation.mutate({
      global_basic_auth_enabled: globalAuth.enabled,
      global_basic_auth_user: globalAuth.username,
      global_basic_auth_password: globalAuth.password,
    })
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic-auth">
        <TabsList>
          <TabsTrigger value="basic-auth">Basic Authentication</TabsTrigger>
          <TabsTrigger value="cors">CORS Settings</TabsTrigger>
          <TabsTrigger value="rate-limiting">Rate Limiting</TabsTrigger>
        </TabsList>

        <TabsContent value="basic-auth" className="space-y-6">
          {/* Global Basic Auth */}
          <Card>
            <CardHeader>
              <CardTitle>Global Basic Authentication</CardTitle>
              <CardDescription>
                Set a global username and password for all SWML endpoints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  When enabled, this will require authentication for ALL agent SWML endpoints,
                  unless the agent has its own basic auth configured.
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Global Basic Auth</Label>
                  <p className="text-sm text-muted-foreground">
                    Protect all SWML endpoints with a single username/password
                  </p>
                </div>
                <Switch
                  checked={globalAuth.enabled}
                  onCheckedChange={(checked) => setGlobalAuth({ ...globalAuth, enabled: checked })}
                />
              </div>

              {globalAuth.enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="global-username">Username</Label>
                    <Input
                      id="global-username"
                      value={globalAuth.username}
                      onChange={(e) => setGlobalAuth({ ...globalAuth, username: e.target.value })}
                      placeholder="Enter username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="global-password">Password</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="global-password"
                          type={showGlobalPassword ? 'text' : 'password'}
                          value={globalAuth.password}
                          onChange={(e) => setGlobalAuth({ ...globalAuth, password: e.target.value })}
                          placeholder="Enter password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowGlobalPassword(!showGlobalPassword)}
                        >
                          {showGlobalPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setGlobalAuth({ ...globalAuth, password: generatePassword() })}
                      >
                        Generate
                      </Button>
                    </div>
                  </div>

                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground mb-2">
                        Example authenticated URL:
                      </p>
                      <code className="block text-xs bg-background p-2 rounded">
                        https://{globalAuth.username}:{globalAuth.password}@tatooine.cantina.cloud:8430/agents/[id]/swml
                      </code>
                    </CardContent>
                  </Card>
                </>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveGlobalAuth} disabled={updateMutation.isPending}>
                  Save Authentication Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CORS Configuration</CardTitle>
              <CardDescription>
                Configure Cross-Origin Resource Sharing settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  CORS is currently configured to allow requests from SignalWire domains.
                  Contact support if you need to add additional origins.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rate-limiting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting</CardTitle>
              <CardDescription>
                Configure API rate limiting to prevent abuse
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>SWML Endpoint Rate Limit</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue="100" />
                    <span className="text-sm text-muted-foreground">requests/minute</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>SWAIG Endpoint Rate Limit</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue="1000" />
                    <span className="text-sm text-muted-foreground">requests/minute</span>
                  </div>
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Rate limiting is enforced per IP address. These limits help protect your
                  endpoints from abuse while allowing normal usage patterns.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}