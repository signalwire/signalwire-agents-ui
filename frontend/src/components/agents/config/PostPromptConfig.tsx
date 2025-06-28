import { useState } from 'react'
import { Info, ExternalLink, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export interface PostPromptConfig {
  mode: 'builtin' | 'custom'
  custom_url?: string
}

interface PostPromptConfigProps {
  open: boolean
  onClose: () => void
  config: PostPromptConfig
  onChange: (config: PostPromptConfig) => void
}

export function PostPromptConfig({ open, onClose, config, onChange }: PostPromptConfigProps) {
  const [localConfig, setLocalConfig] = useState<PostPromptConfig>(config)
  const [urlError, setUrlError] = useState('')

  const handleSave = () => {
    if (localConfig.mode === 'custom' && localConfig.custom_url) {
      // Validate URL
      try {
        new URL(localConfig.custom_url)
      } catch (e) {
        setUrlError('Please enter a valid URL')
        return
      }
    }

    onChange(localConfig)
    onClose()
  }

  const validateUrl = (url: string) => {
    if (!url) {
      setUrlError('')
      return
    }
    try {
      new URL(url)
      setUrlError('')
    } catch (e) {
      setUrlError('Please enter a valid URL')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post-Prompt Summary Configuration</DialogTitle>
          <DialogDescription>
            Configure how conversation summaries are handled after calls end
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Post-prompt summaries provide a structured summary of the conversation including 
              key information, action items, and sentiment analysis.
            </AlertDescription>
          </Alert>

          <RadioGroup
            value={localConfig.mode}
            onValueChange={(value: 'builtin' | 'custom') => 
              setLocalConfig({ ...localConfig, mode: value })
            }
          >
            {/* Built-in Viewer Option */}
            <Card className={localConfig.mode === 'builtin' ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="builtin" id="builtin" />
                  <div className="flex-1">
                    <Label htmlFor="builtin" className="text-base font-medium cursor-pointer">
                      Use Built-in Summary Viewer
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      View conversation summaries directly in the Agent Builder dashboard
                    </p>
                  </div>
                </div>
              </CardHeader>
              {localConfig.mode === 'builtin' && (
                <CardContent>
                  <div className="space-y-4">
                    {/* Preview of built-in viewer */}
                    <div className="rounded-lg border p-4 bg-muted/50">
                      <h4 className="text-sm font-medium mb-3">Built-in Viewer Features</h4>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>Structured conversation summary</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>Key information extraction</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>Action items and follow-ups</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>Sentiment analysis</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>Searchable history</span>
                        </div>
                      </div>
                    </div>

                    {/* TODO: Add actual preview/screenshot of the summary viewer */}
                    <div className="rounded-lg border p-8 text-center bg-muted/20">
                      <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Summary viewer preview will be shown here
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Custom URL Option */}
            <Card className={localConfig.mode === 'custom' ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="custom" id="custom" />
                  <div className="flex-1">
                    <Label htmlFor="custom" className="text-base font-medium cursor-pointer">
                      Send to Custom URL
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Send summaries to your own endpoint for custom processing
                    </p>
                  </div>
                </div>
              </CardHeader>
              {localConfig.mode === 'custom' && (
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="custom-url">Webhook URL</Label>
                      <Input
                        id="custom-url"
                        type="url"
                        value={localConfig.custom_url || ''}
                        onChange={(e) => {
                          setLocalConfig({ ...localConfig, custom_url: e.target.value })
                          validateUrl(e.target.value)
                        }}
                        placeholder="https://api.example.com/summaries"
                      />
                      {urlError && (
                        <p className="text-sm text-destructive">{urlError}</p>
                      )}
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Your endpoint will receive a POST request with the conversation summary in JSON format.
                      </AlertDescription>
                    </Alert>

                    {/* Expected payload structure */}
                    <div className="rounded-lg border p-4 space-y-2">
                      <h4 className="text-sm font-medium">Expected Payload Structure</h4>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{`{
  "agent_id": "uuid",
  "call_id": "uuid",
  "timestamp": "2024-01-01T12:00:00Z",
  "duration": 180,
  "summary": {
    "overview": "Brief conversation overview",
    "key_points": ["point1", "point2"],
    "action_items": ["action1", "action2"],
    "sentiment": "positive",
    "topics": ["topic1", "topic2"],
    "participant_info": {
      "caller": {...},
      "agent": {...}
    }
  },
  "metadata": {
    "language": "en-US",
    "skills_used": ["skill1", "skill2"]
  }
}`}
                      </pre>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ExternalLink className="h-4 w-4" />
                      <span>Ensure your endpoint can handle POST requests and returns a 2xx status code</span>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </RadioGroup>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}