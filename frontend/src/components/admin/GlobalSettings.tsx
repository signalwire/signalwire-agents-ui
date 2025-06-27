import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Save, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/use-toast'
import { settingsApi } from '@/api/settings'

export function GlobalSettings() {
  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })

  const [localSettings, setLocalSettings] = useState(settings || {})

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      toast({ title: 'Settings saved successfully' })
      refetch()
    },
    onError: () => {
      toast({
        title: 'Failed to save settings',
        variant: 'destructive',
      })
    },
  })

  const handleSave = () => {
    updateMutation.mutate(localSettings)
  }

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
      {/* Organization Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>
            Configure organization-wide settings and defaults
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={localSettings.organization_name || ''}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                organization_name: e.target.value
              })}
              placeholder="Your Organization"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-email">Support Email</Label>
            <Input
              id="support-email"
              type="email"
              value={localSettings.support_email || ''}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                support_email: e.target.value
              })}
              placeholder="support@example.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Default Agent Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Default Agent Settings</CardTitle>
          <CardDescription>
            Configure default values for new agents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-voice">Default Voice</Label>
            <Input
              id="default-voice"
              value={localSettings.default_voice || 'alloy'}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                default_voice: e.target.value
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-model">Default AI Model</Label>
            <Input
              id="default-model"
              value={localSettings.default_ai_model || 'gpt-4o-mini'}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                default_ai_model: e.target.value
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-prompt">Default System Prompt</Label>
            <Textarea
              id="default-prompt"
              value={localSettings.default_system_prompt || ''}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                default_system_prompt: e.target.value
              })}
              placeholder="You are a helpful AI assistant..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>
            Configure security and authentication options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="enforce-basic-auth">Enforce Basic Auth</Label>
              <p className="text-sm text-muted-foreground">
                Require basic authentication for all SWML endpoints
              </p>
            </div>
            <Switch
              id="enforce-basic-auth"
              checked={localSettings.enforce_basic_auth || false}
              onCheckedChange={(checked) => setLocalSettings({
                ...localSettings,
                enforce_basic_auth: checked
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="enable-audit-log">Enable Audit Logging</Label>
              <p className="text-sm text-muted-foreground">
                Log all configuration changes and API access
              </p>
            </div>
            <Switch
              id="enable-audit-log"
              checked={localSettings.enable_audit_log || false}
              onCheckedChange={(checked) => setLocalSettings({
                ...localSettings,
                enable_audit_log: checked
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jwt-expiration">JWT Token Expiration (hours)</Label>
            <Input
              id="jwt-expiration"
              type="number"
              value={localSettings.jwt_expiration_hours || 1}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                jwt_expiration_hours: parseInt(e.target.value)
              })}
              min={1}
              max={720}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Save All Settings
        </Button>
      </div>
    </div>
  )
}