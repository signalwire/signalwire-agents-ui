import { useState } from 'react'
import { Plus, Trash2, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ParamsEditorProps {
  open: boolean
  onClose: () => void
  params: Record<string, any>
  onChange: (params: Record<string, any>) => void
}

const COMMON_PARAMS = [
  {
    key: 'end_of_speech_timeout',
    label: 'End of Speech Timeout',
    type: 'number',
    default: 2000,
    description: 'Time in milliseconds to wait for speech to end',
    unit: 'ms',
  },
  {
    key: 'attention_timeout',
    label: 'Attention Timeout',
    type: 'number',
    default: 20000,
    description: 'Maximum time to wait for user input',
    unit: 'ms',
  },
  {
    key: 'background_file_volume',
    label: 'Background Volume',
    type: 'number',
    default: -20,
    description: 'Volume adjustment for background audio',
    unit: 'dB',
  },
  {
    key: 'ai_model',
    label: 'AI Model',
    type: 'select',
    default: 'gpt-4o-mini',
    options: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    description: 'The AI model to use for responses',
  },
  {
    key: 'temperature',
    label: 'Temperature',
    type: 'number',
    default: 0.7,
    description: 'Controls randomness in responses (0-1)',
    min: 0,
    max: 1,
    step: 0.1,
  },
]

export function ParamsEditor({ open, onClose, params, onChange }: ParamsEditorProps) {
  const [localParams, setLocalParams] = useState<Record<string, any>>(params)
  const [customKey, setCustomKey] = useState('')
  const [customValue, setCustomValue] = useState('')

  const updateParam = (key: string, value: any) => {
    setLocalParams({ ...localParams, [key]: value })
  }

  const removeParam = (key: string) => {
    const updated = { ...localParams }
    delete updated[key]
    setLocalParams(updated)
  }

  const addCustomParam = () => {
    if (customKey && customValue) {
      setLocalParams({ ...localParams, [customKey]: customValue })
      setCustomKey('')
      setCustomValue('')
    }
  }

  const handleSave = () => {
    onChange(localParams)
    onClose()
  }

  const getParamInfo = (key: string) => {
    return COMMON_PARAMS.find(p => p.key === key)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>AI Parameters</DialogTitle>
          <DialogDescription>
            Configure advanced AI behavior and settings
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Common Parameters */}
          <div className="space-y-4">
            <h3 className="font-semibold">Common Parameters</h3>
            {COMMON_PARAMS.map((param) => {
              const value = localParams[param.key] ?? param.default
              return (
                <div key={param.key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>{param.label}</Label>
                    {param.description && (
                      <div className="group relative">
                        <Info className="h-3 w-3 text-muted-foreground" />
                        <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-10">
                          <div className="bg-popover text-popover-foreground text-sm rounded-md shadow-md p-2 max-w-xs">
                            {param.description}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {param.type === 'select' ? (
                      <Select
                        value={value.toString()}
                        onValueChange={(v) => updateParam(param.key, v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {param.options?.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={param.type}
                        value={value}
                        onChange={(e) => updateParam(
                          param.key,
                          param.type === 'number' ? Number(e.target.value) : e.target.value
                        )}
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        className="flex-1"
                      />
                    )}
                    {param.unit && (
                      <span className="text-sm text-muted-foreground w-12">{param.unit}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Custom Parameters */}
          <div className="space-y-4">
            <h3 className="font-semibold">Custom Parameters</h3>
            
            {/* Existing custom params */}
            {Object.entries(localParams).map(([key, value]) => {
              if (COMMON_PARAMS.some(p => p.key === key)) return null
              return (
                <div key={key} className="flex items-center gap-2">
                  <Input value={key} disabled className="flex-1" />
                  <Input
                    value={value}
                    onChange={(e) => updateParam(key, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeParam(key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}

            {/* Add new custom param */}
            <div className="flex items-center gap-2">
              <Input
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="Parameter name"
                className="flex-1"
              />
              <Input
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Value"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addCustomParam}
                disabled={!customKey || !customValue}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Parameters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}