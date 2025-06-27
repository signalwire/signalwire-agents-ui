import { useState } from 'react'
import { Shield, Eye, EyeOff } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

interface BasicAuthConfigProps {
  open: boolean
  onClose: () => void
  config: {
    user?: string
    password?: string
  }
  onChange: (config: { user?: string; password?: string }) => void
}

export function BasicAuthConfig({ open, onClose, config, onChange }: BasicAuthConfigProps) {
  const [localConfig, setLocalConfig] = useState(config)
  const [showPassword, setShowPassword] = useState(false)
  const [enabled, setEnabled] = useState(!!config.user && !!config.password)

  const handleSave = () => {
    if (enabled && localConfig.user && localConfig.password) {
      onChange(localConfig)
    } else {
      onChange({})
    }
    onClose()
  }

  const handleToggle = () => {
    setEnabled(!enabled)
    if (!enabled) {
      // When enabling, set default values if empty
      if (!localConfig.user || !localConfig.password) {
        setLocalConfig({
          user: 'agent',
          password: generatePassword(),
        })
      }
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
    let password = ''
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Access Control
          </DialogTitle>
          <DialogDescription>
            Protect your agent's SWML endpoint with basic authentication
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Enable/Disable Toggle */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Enable Basic Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Require username and password to access SWML
                  </p>
                </div>
                <Button
                  type="button"
                  variant={enabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleToggle}
                >
                  {enabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Credentials */}
          {enabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={localConfig.user || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, user: e.target.value })}
                  placeholder="Enter username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={localConfig.password || ''}
                      onChange={(e) => setLocalConfig({ ...localConfig, password: e.target.value })}
                      placeholder="Enter password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocalConfig({ ...localConfig, password: generatePassword() })}
                  >
                    Generate
                  </Button>
                </div>
              </div>

              {/* Info */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    When enabled, SignalWire will need to use these credentials to access your agent:
                  </p>
                  <code className="block mt-2 text-xs bg-background p-2 rounded">
                    https://{localConfig.user}:{localConfig.password}@tatooine.cantina.cloud:8430/agents/[id]/swml
                  </code>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}