import { useState, useEffect } from 'react'
import { Shield, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

export interface RecordingConfig {
  enabled: boolean
  format: 'mp4' | 'wav'
  stereo: boolean
}

interface RecordingConfigProps {
  open: boolean
  onClose: () => void
  config: RecordingConfig
  onChange: (config: RecordingConfig) => void
}

export function RecordingConfig({ open, onClose, config, onChange }: RecordingConfigProps) {
  const [localConfig, setLocalConfig] = useState<RecordingConfig>(config)

  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  const handleSave = () => {
    onChange(localConfig)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Recording Configuration</DialogTitle>
          <DialogDescription>
            Configure call recording settings for compliance and quality assurance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4 overflow-y-auto flex-1 px-1">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Call recording must comply with local laws and regulations. 
              Ensure you have proper consent and notifications in place.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recording Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Recording */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="recording-enabled" className="text-base">
                    Enable Call Recording
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Record all calls handled by this agent
                  </p>
                </div>
                <Switch
                  id="recording-enabled"
                  checked={localConfig.enabled}
                  onCheckedChange={(checked) => 
                    setLocalConfig({ ...localConfig, enabled: checked })
                  }
                />
              </div>

              {localConfig.enabled && (
                <>
                  {/* Recording Format */}
                  <div className="space-y-2">
                    <Label htmlFor="format">Recording Format</Label>
                    <Select
                      value={localConfig.format}
                      onValueChange={(value: 'mp4' | 'wav') => 
                        setLocalConfig({ ...localConfig, format: value })
                      }
                    >
                      <SelectTrigger id="format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mp4">
                          <div>
                            <div className="font-medium">MP4</div>
                            <div className="text-xs text-muted-foreground">Compressed, smaller file size</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="wav">
                          <div>
                            <div className="font-medium">WAV</div>
                            <div className="text-xs text-muted-foreground">Uncompressed, higher quality</div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stereo/Mono */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="stereo" className="text-base">
                        Stereo Recording
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Record caller and agent on separate channels
                      </p>
                    </div>
                    <Switch
                      id="stereo"
                      checked={localConfig.stereo}
                      onCheckedChange={(checked) => 
                        setLocalConfig({ ...localConfig, stereo: checked })
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {localConfig.enabled && (
            <>
              {/* Compliance Notice */}
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <strong>Compliance Notice:</strong> You are responsible for complying with all applicable laws 
                  regarding call recording, including obtaining necessary consents and providing required notifications.
                </AlertDescription>
              </Alert>

              {/* Storage Info */}
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="text-sm font-medium">Recording Storage</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• Recordings are stored securely in SignalWire's cloud storage</p>
                  <p>• Retention period follows your account settings</p>
                  <p>• Access recordings through the SignalWire dashboard</p>
                  <p>• Recordings can be downloaded or deleted as needed</p>
                </div>
              </div>

              {/* Best Practices */}
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="text-sm font-medium">Best Practices</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• Always inform callers that the call is being recorded</p>
                  <p>• Use stereo recording to separate caller and agent audio</p>
                  <p>• Regularly review and purge old recordings</p>
                  <p>• Implement access controls for recording playback</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Recording Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}