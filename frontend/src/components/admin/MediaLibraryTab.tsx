import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { apiClient } from '@/api/client'
import { formatBytes } from '@/lib/utils'

interface MediaConfig {
  max_audio_size_mb: number
  max_video_size_mb: number
  max_uploads_per_hour: number
  max_imports_per_hour: number
  allowed_audio_types: string[]
  allowed_video_types: string[]
  auto_cleanup_days: number
  enable_virus_scan: boolean
  max_total_storage_gb: number
}

interface MediaStats {
  total_files: number
  total_size: number
  total_size_gb: number
  unused_files: number
}

export function MediaLibraryTab() {
  const [config, setConfig] = useState<MediaConfig | null>(null)
  const [stats, setStats] = useState<MediaStats | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await apiClient.get('/settings/media')
      setConfig(response.data.settings)
      setStats(response.data.stats)
    } catch (error: any) {
      console.error('Error loading media settings:', error)
      
      // Set default config to allow the component to render
      setConfig({
        max_audio_size_mb: 50,
        max_video_size_mb: 200,
        max_uploads_per_hour: 10,
        max_imports_per_hour: 20,
        allowed_audio_types: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
        allowed_video_types: ['video/mp4', 'video/webm'],
        auto_cleanup_days: 90,
        enable_virus_scan: false,
        max_total_storage_gb: 50
      })
      setStats({
        total_files: 0,
        total_size: 0,
        total_size_gb: 0,
        unused_files: 0
      })
      
      // Only show error toast for non-404 errors (404 is expected when no settings exist yet)
      if (error.response?.status !== 404) {
        toast({
          title: 'Error loading settings',
          description: 'Using default media library settings',
          variant: 'destructive'
        })
      }
    }
  }

  const updateConfig = (key: keyof MediaConfig, value: any) => {
    if (!config) return
    setConfig({ ...config, [key]: value })
  }

  const toggleFileType = (category: 'audio' | 'video', mimeType: string, enabled: boolean) => {
    if (!config) return
    
    const key = category === 'audio' ? 'allowed_audio_types' : 'allowed_video_types'
    const currentTypes = config[key]
    
    if (enabled && !currentTypes.includes(mimeType)) {
      updateConfig(key, [...currentTypes, mimeType])
    } else if (!enabled) {
      updateConfig(key, currentTypes.filter(t => t !== mimeType))
    }
  }

  const handleSave = async () => {
    if (!config) return
    
    setSaving(true)
    try {
      await apiClient.put('/settings/media', config)
      toast({ title: 'Settings saved successfully' })
    } catch (error) {
      toast({
        title: 'Error saving settings',
        description: 'Failed to save media library settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Loading media library settings...</div>
        </div>
      </div>
    )
  }

  const audioTypes = [
    { mime: 'audio/mpeg', label: 'MP3' },
    { mime: 'audio/wav', label: 'WAV' },
    { mime: 'audio/ogg', label: 'OGG' },
    { mime: 'audio/webm', label: 'WebM Audio' }
  ]

  const videoTypes = [
    { mime: 'video/mp4', label: 'MP4' },
    { mime: 'video/webm', label: 'WebM Video' },
    { mime: 'video/quicktime', label: 'QuickTime' }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Media Library Settings</h2>
        <p className="text-muted-foreground">
          Configure upload limits, file types, and security settings
        </p>
      </div>

      {/* Upload Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max-audio-size">Max Audio File Size (MB)</Label>
              <Input
                id="max-audio-size"
                type="number"
                value={config.max_audio_size_mb}
                onChange={(e) => updateConfig('max_audio_size_mb', Number(e.target.value))}
                min={1}
                max={500}
              />
            </div>
            <div>
              <Label htmlFor="max-video-size">Max Video File Size (MB)</Label>
              <Input
                id="max-video-size"
                type="number"
                value={config.max_video_size_mb}
                onChange={(e) => updateConfig('max_video_size_mb', Number(e.target.value))}
                min={1}
                max={5000}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max-uploads">Max Uploads per Hour (per user)</Label>
              <Input
                id="max-uploads"
                type="number"
                value={config.max_uploads_per_hour}
                onChange={(e) => updateConfig('max_uploads_per_hour', Number(e.target.value))}
                min={1}
                max={1000}
              />
            </div>
            <div>
              <Label htmlFor="max-imports">Max URL Imports per Hour (per user)</Label>
              <Input
                id="max-imports"
                type="number"
                value={config.max_imports_per_hour}
                onChange={(e) => updateConfig('max_imports_per_hour', Number(e.target.value))}
                min={1}
                max={1000}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allowed File Types */}
      <Card>
        <CardHeader>
          <CardTitle>Allowed File Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base">Audio Types</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              {audioTypes.map(type => (
                <label key={type.mime} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.allowed_audio_types.includes(type.mime)}
                    onChange={(e) => toggleFileType('audio', type.mime, e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">{type.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <Label className="text-base">Video Types</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              {videoTypes.map(type => (
                <label key={type.mime} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.allowed_video_types.includes(type.mime)}
                    onChange={(e) => toggleFileType('video', type.mime, e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">{type.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage & Cleanup */}
      <Card>
        <CardHeader>
          <CardTitle>Storage & Cleanup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="storage-limit">Total Storage Limit (GB)</Label>
            <Input
              id="storage-limit"
              type="number"
              value={config.max_total_storage_gb}
              onChange={(e) => updateConfig('max_total_storage_gb', Number(e.target.value))}
              min={1}
              max={10000}
            />
            {stats && (
              <p className="text-sm text-muted-foreground mt-1">
                Current usage: {stats.total_size_gb.toFixed(2)} GB ({formatBytes(stats.total_size)})
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="cleanup-days">Auto-cleanup Unused Files After (days)</Label>
            <Input
              id="cleanup-days"
              type="number"
              value={config.auto_cleanup_days}
              onChange={(e) => updateConfig('auto_cleanup_days', Number(e.target.value))}
              min={0}
              max={365}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Set to 0 to disable auto-cleanup
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="virus-scan">Enable Virus Scanning</Label>
              <p className="text-sm text-muted-foreground">
                Scan uploaded files with ClamAV (requires ClamAV installation)
              </p>
            </div>
            <Switch
              id="virus-scan"
              checked={config.enable_virus_scan}
              onCheckedChange={(checked) => updateConfig('enable_virus_scan', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Files</p>
                <p className="text-2xl font-semibold">{stats.total_files}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Size</p>
                <p className="text-2xl font-semibold">{formatBytes(stats.total_size)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unused Files</p>
                <p className="text-2xl font-semibold">{stats.unused_files}</p>
              </div>
            </div>
            {stats.total_files === 0 && (
              <div className="mt-6 text-center p-6 bg-muted rounded-lg">
                <p className="text-muted-foreground">No media files uploaded yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Go to the <strong>Media Library</strong> page to upload your first files
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}