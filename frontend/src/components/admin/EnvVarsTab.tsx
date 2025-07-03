import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Eye, EyeOff, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { toast } from '@/components/ui/use-toast'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface EnvVar {
  id: number
  name: string
  value: string
  description?: string
  is_secret: boolean
  created_at: string
  updated_at: string
}

export function EnvVarsTab() {
  const [envVars, setEnvVars] = useState<EnvVar[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingVar, setEditingVar] = useState<EnvVar | null>(null)
  const [revealedVars, setRevealedVars] = useState<Set<number>>(new Set())
  const [copiedVar, setCopiedVar] = useState<number | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    description: '',
    is_secret: true
  })

  useEffect(() => {
    fetchEnvVars()
  }, [])

  const fetchEnvVars = async () => {
    try {
      const response = await api.get('/api/env-vars/')
      setEnvVars(response.data)
    } catch (error) {
      toast({
        title: 'Failed to load environment variables',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingVar(null)
    setFormData({
      name: '',
      value: '',
      description: '',
      is_secret: true
    })
    setShowDialog(true)
  }

  const handleEdit = async (envVar: EnvVar) => {
    // Fetch with reveal=true to get actual value
    try {
      const response = await api.get(`/api/env-vars/${envVar.id}?reveal=true`)
      setEditingVar(envVar)
      setFormData({
        name: response.data.name,
        value: response.data.value,
        description: response.data.description || '',
        is_secret: response.data.is_secret
      })
      setShowDialog(true)
    } catch (error) {
      toast({
        title: 'Failed to load environment variable',
        variant: 'destructive'
      })
    }
  }

  const handleSave = async () => {
    try {
      if (editingVar) {
        // Update existing
        await api.put(`/api/env-vars/${editingVar.id}`, {
          value: formData.value,
          description: formData.description,
          is_secret: formData.is_secret
        })
        toast({
          title: 'Environment variable updated'
        })
      } else {
        // Create new
        await api.post('/api/env-vars/', formData)
        toast({
          title: 'Environment variable created'
        })
      }
      
      setShowDialog(false)
      fetchEnvVars()
    } catch (error: any) {
      toast({
        title: 'Failed to save environment variable',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      })
    }
  }

  const handleDelete = async (envVar: EnvVar) => {
    if (!confirm(`Are you sure you want to delete ${envVar.name}?`)) {
      return
    }
    
    try {
      await api.delete(`/api/env-vars/${envVar.id}`)
      toast({
        title: 'Environment variable deleted'
      })
      fetchEnvVars()
    } catch (error) {
      toast({
        title: 'Failed to delete environment variable',
        variant: 'destructive'
      })
    }
  }

  const toggleReveal = async (envVar: EnvVar) => {
    if (revealedVars.has(envVar.id)) {
      // Hide it
      setRevealedVars(prev => {
        const next = new Set(prev)
        next.delete(envVar.id)
        return next
      })
    } else {
      // Reveal it
      try {
        const response = await api.get(`/api/env-vars/${envVar.id}?reveal=true`)
        // Update the env var in our list with the revealed value
        setEnvVars(prev => prev.map(v => 
          v.id === envVar.id ? { ...v, value: response.data.value } : v
        ))
        setRevealedVars(prev => new Set(prev).add(envVar.id))
      } catch (error) {
        toast({
          title: 'Failed to reveal value',
          variant: 'destructive'
        })
      }
    }
  }

  const copyValue = async (envVar: EnvVar) => {
    // If it's a secret and not revealed, fetch the actual value first
    let valueToCopy = envVar.value
    
    if (envVar.is_secret && !revealedVars.has(envVar.id)) {
      try {
        const response = await api.get(`/api/env-vars/${envVar.id}?reveal=true`)
        valueToCopy = response.data.value
      } catch (error) {
        toast({
          title: 'Failed to copy value',
          variant: 'destructive'
        })
        return
      }
    }
    
    await navigator.clipboard.writeText(valueToCopy)
    setCopiedVar(envVar.id)
    setTimeout(() => setCopiedVar(null), 2000)
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Environment Variables</h3>
          <p className="text-sm text-muted-foreground">
            Manage API keys and configuration values used by skills
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Variable
        </Button>
      </div>

      {envVars.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium mb-2">No environment variables</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add environment variables to configure your skills
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Variable
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {envVars.map(envVar => (
            <Card key={envVar.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-mono">{envVar.name}</CardTitle>
                    {envVar.description && (
                      <CardDescription>{envVar.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(envVar)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(envVar)}
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    type={envVar.is_secret && !revealedVars.has(envVar.id) ? 'password' : 'text'}
                    value={envVar.value}
                    className="font-mono text-sm"
                  />
                  {envVar.is_secret && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleReveal(envVar)}
                    >
                      {revealedVars.has(envVar.id) ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyValue(envVar)}
                  >
                    {copiedVar === envVar.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVar ? 'Edit Environment Variable' : 'Add Environment Variable'}
            </DialogTitle>
            <DialogDescription>
              {editingVar 
                ? 'Update the value and settings for this environment variable.'
                : 'Create a new environment variable that can be used by skills.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!editingVar && (
              <>
                <div className="space-y-2">
                  <Label>Variable Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                    placeholder="OPENAI_API_KEY"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use uppercase letters, numbers, and underscores only
                  </p>
                </div>

                <Alert>
                  <AlertDescription>
                    This name should match the env_var field in skill parameters
                  </AlertDescription>
                </Alert>
              </>
            )}

            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type={formData.is_secret ? 'password' : 'text'}
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="Enter the value"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this variable used for?"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is-secret">Secret Value</Label>
              <Switch
                id="is-secret"
                checked={formData.is_secret}
                onCheckedChange={(checked) => setFormData({ ...formData, is_secret: checked })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Secret values are masked in the UI and logs
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.value || (!editingVar && !formData.name)}
            >
              {editingVar ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}