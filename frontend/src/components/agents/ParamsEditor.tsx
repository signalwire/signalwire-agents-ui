import { useState, useEffect } from 'react'
import { Plus, Trash2, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface ParamsEditorProps {
  open: boolean
  onClose: () => void
  params: Record<string, any>
  onChange: (params: Record<string, any>) => void
}

interface ParamConfig {
  key: string
  label: string
  type: string
  default: any
  description: string
  unit?: string
  min?: number
  max?: number
  step?: number
  options?: string[]
  category?: string
  enablesParams?: string[]  // Other params this one enables
  placeholder?: string
}

const COMMON_PARAMS: ParamConfig[] = [
  // Basic Timeouts
  {
    key: 'end_of_speech_timeout',
    label: 'End of Speech Timeout',
    type: 'number',
    default: 700,
    description: 'Time in milliseconds to wait for speech to end',
    unit: 'ms',
    category: 'Timeouts',
  },
  {
    key: 'attention_timeout',
    label: 'Attention Timeout',
    type: 'number',
    default: 5000,
    description: 'Maximum time to wait for user input',
    unit: 'ms',
    category: 'Timeouts',
  },
  {
    key: 'outbound_attention_timeout',
    label: 'Outbound Attention Timeout',
    type: 'number',
    default: 120000,
    description: 'Special attention timeout for outbound calls',
    unit: 'ms',
    category: 'Timeouts',
  },
  {
    key: 'hard_stop_time',
    label: 'Hard Stop Time',
    type: 'string',
    default: '',
    description: 'Time before call ends (e.g., "30m", "1:30:00", "90s")',
    placeholder: 'e.g., 30m, 1:30:00',
    category: 'Timeouts',
  },
  
  // AI Model & Behavior
  {
    key: 'ai_model',
    label: 'AI Model',
    type: 'select',
    default: 'gpt-4o-mini',
    options: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1-nano'],
    description: 'Select the AI model to use',
    category: 'AI Behavior',
  },
  {
    key: 'enable_thinking',
    label: 'Enable Thinking',
    type: 'boolean',
    default: false,
    description: 'Gives the AI a tool to break down problems with another AI first',
    category: 'AI Behavior',
  },
  {
    key: 'enable_vision',
    label: 'Enable Vision',
    type: 'boolean',
    default: false,
    description: 'Allows the AI to see by sampling images from video feed (requires video)',
    category: 'AI Behavior',
  },
  {
    key: 'ai_name',
    label: 'AI Name',
    type: 'string',
    default: 'computer',
    description: 'The AI\'s name for wake word and addressing features',
    category: 'AI Behavior',
  },
  
  // Speech Recognition
  {
    key: 'asr_smart_format',
    label: 'ASR Smart Format',
    type: 'boolean',
    default: false,
    description: 'Auto-format phone numbers and addresses in speech recognition',
    category: 'Speech Recognition',
  },
  {
    key: 'asr_diarize',
    label: 'ASR Diarize',
    type: 'boolean',
    default: false,
    description: 'Add speaker identity information to call transcripts',
    category: 'Speech Recognition',
  },
  {
    key: 'asr_speaker_affinity',
    label: 'ASR Speaker Affinity',
    type: 'boolean',
    default: false,
    description: 'Only respond to the first identified voice',
    enablesParams: ['asr_diarize'],
    category: 'Speech Recognition',
  },
  {
    key: 'llm_diarize_aware',
    label: 'LLM Diarize Aware',
    type: 'boolean',
    default: false,
    description: 'LLM will be aware of multiple speakers and differentiate them',
    enablesParams: ['asr_diarize'],
    category: 'Speech Recognition',
  },
  
  // Text-to-Speech
  {
    key: 'tts_number_format',
    label: 'TTS Number Format',
    type: 'select',
    default: 'international',
    options: ['national', 'international'],
    description: 'How numbers are pronounced in text-to-speech',
    category: 'Text-to-Speech',
  },
  
  // Conversation Control
  {
    key: 'speak_when_spoken_to',
    label: 'Speak When Spoken To',
    type: 'boolean',
    default: false,
    description: 'Only responds when the AI\'s name is included in user speech',
    category: 'Conversation Control',
  },
  {
    key: 'enable_pause',
    label: 'Enable Pause',
    type: 'boolean',
    default: false,
    description: 'Allows the AI to enter a pause state using a tool',
    category: 'Conversation Control',
  },
  {
    key: 'start_paused',
    label: 'Start Paused',
    type: 'boolean',
    default: false,
    description: 'Start in paused state waiting for wake words',
    category: 'Conversation Control',
  },
  {
    key: 'wake_prefix',
    label: 'Wake Prefix',
    type: 'string',
    default: '',
    description: 'Word or phrase to trigger unpause (if not set, any speech unpauses)',
    placeholder: 'e.g., "Hey computer"',
    category: 'Conversation Control',
  },
  {
    key: 'static_greeting',
    label: 'Static Greeting',
    type: 'string',
    default: '',
    description: 'Exact phrase the AI says when answering calls',
    placeholder: 'e.g., "Hello, how can I help you?"',
    category: 'Conversation Control',
  },
  {
    key: 'static_greeting_no_barge',
    label: 'Static Greeting No Barge',
    type: 'boolean',
    default: false,
    description: 'Prevent users from interrupting the static greeting',
    category: 'Conversation Control',
  },
  {
    key: 'acknowledge_interruptions',
    label: 'Acknowledge Interruptions',
    type: 'boolean',
    default: false,
    description: 'Have the AI comment on being interrupted',
    category: 'Conversation Control',
  },
  {
    key: 'conversation_sliding_window',
    label: 'Conversation Sliding Window',
    type: 'number',
    default: 0,
    description: 'Number of turns to preserve as conversation continues',
    category: 'Conversation Control',
  },
  {
    key: 'direction',
    label: 'Call Direction',
    type: 'select',
    default: 'inbound',
    options: ['inbound', 'outbound'],
    description: 'Whether this agent handles inbound or outbound calls',
    category: 'Conversation Control',
  },
  
  // Prompts
  {
    key: 'attention_timeout_prompt',
    label: 'Attention Timeout Prompt',
    type: 'string',
    default: '',
    description: 'Custom prompt after attention timeout (no user response)',
    placeholder: 'e.g., "Are you still there?"',
    category: 'Prompts',
  },
  {
    key: 'hard_stop_prompt',
    label: 'Hard Stop Prompt',
    type: 'string',
    default: '',
    description: 'Prompt to explain why the call must end due to time limit',
    placeholder: 'e.g., "I\'m sorry, our time is up"',
    category: 'Prompts',
  },
  {
    key: 'interrupt_prompt',
    label: 'Interrupt Prompt',
    type: 'string',
    default: '',
    description: 'Custom prompt for handling interruptions',
    placeholder: 'e.g., "I noticed you interrupted me"',
    category: 'Prompts',
  },
  
  // Media & Background
  {
    key: 'background_file',
    label: 'Background File',
    type: 'string',
    default: '',
    description: 'URL to audio file for background ambiance',
    placeholder: 'https://example.com/ambient.mp3',
    category: 'Media',
  },
  {
    key: 'background_file_loops',
    label: 'Background File Loops',
    type: 'number',
    default: -1,
    description: 'How many times to loop background (-1 for infinite)',
    category: 'Media',
  },
  {
    key: 'background_file_volume',
    label: 'Background File Volume',
    type: 'number',
    default: 0,
    description: 'Volume of background file',
    min: -50,
    max: 50,
    category: 'Media',
  },
  {
    key: 'hold_music',
    label: 'Hold Music',
    type: 'string',
    default: '',
    description: 'URL to music file to play when AI puts caller on hold',
    placeholder: 'https://example.com/hold-music.mp3',
    category: 'Media',
  },
  
  // Video
  {
    key: 'video_talking_file',
    label: 'Video Talking File',
    type: 'string',
    default: '',
    description: 'URL to avatar MP4 to play while talking',
    placeholder: 'https://example.com/avatar-talking.mp4',
    category: 'Video',
  },
  {
    key: 'video_idle_file',
    label: 'Video Idle File',
    type: 'string',
    default: '',
    description: 'URL to avatar MP4 to play while idle',
    placeholder: 'https://example.com/avatar-idle.mp4',
    category: 'Video',
  },
  {
    key: 'video_listening_file',
    label: 'Video Listening File',
    type: 'string',
    default: '',
    description: 'URL to avatar MP4 to play while listening (optional)',
    placeholder: 'https://example.com/avatar-listening.mp4',
    category: 'Video',
  },
]

export function ParamsEditor({ open, onClose, params, onChange }: ParamsEditorProps) {
  const [localParams, setLocalParams] = useState<Record<string, any>>(params)
  const [customKey, setCustomKey] = useState('')
  const [customValue, setCustomValue] = useState('')

  // Sync local state with props when dialog opens
  useEffect(() => {
    if (open) {
      setLocalParams(params)
    }
  }, [open, params])

  const updateParam = (key: string, value: any, config?: ParamConfig) => {
    let updatedParams = { ...localParams }
    
    // Handle empty values - remove them from params
    if (value === '' || value === false || value === 0 || value === null || value === undefined) {
      delete updatedParams[key]
    } else {
      updatedParams[key] = value
      
      // Handle parameter dependencies
      if (config?.enablesParams) {
        config.enablesParams.forEach(depKey => {
          if (!updatedParams[depKey]) {
            updatedParams[depKey] = true
          }
        })
      }
    }
    
    setLocalParams(updatedParams)
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
    // Clean up params - remove defaults and empty values
    const cleanedParams: Record<string, any> = {}
    
    Object.entries(localParams).forEach(([key, value]) => {
      // Find if this is a common param to check its default
      const paramConfig = COMMON_PARAMS.find(p => p.key === key)
      
      // Skip if value is empty, false, 0, or matches default
      if (value === '' || value === null || value === undefined) {
        return
      }
      
      if (paramConfig) {
        // For booleans, only include if true
        if (paramConfig.type === 'boolean' && value === false) {
          return
        }
        // For numbers, only include if not 0 or default
        if (paramConfig.type === 'number' && (value === 0 || value === paramConfig.default)) {
          return
        }
        // For strings, only include if not empty or default
        if (paramConfig.type === 'string' && (value === '' || value === paramConfig.default)) {
          return
        }
        // For selects, only include if not default
        if (paramConfig.type === 'select' && value === paramConfig.default) {
          return
        }
      }
      
      cleanedParams[key] = value
    })
    
    onChange(cleanedParams)
    onClose()
  }

  // Group parameters by category
  const paramsByCategory = COMMON_PARAMS.reduce((acc, param) => {
    const category = param.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(param)
    return acc
  }, {} as Record<string, ParamConfig[]>)


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
          {/* Parameters by Category */}
          {Object.entries(paramsByCategory).map(([category, categoryParams]) => (
            <div key={category} className="space-y-4">
              <h3 className="font-semibold text-lg">{category}</h3>
              <div className="space-y-3">
                {categoryParams.map((param) => {
                  const value = localParams[param.key] ?? ''
                  const isSet = param.key in localParams
                  
                  return (
                    <div key={param.key} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className={!isSet && param.type !== 'boolean' ? 'text-muted-foreground' : ''}>
                          {param.label}
                        </Label>
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
                      
                      {param.type === 'boolean' ? (
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={param.key}
                            checked={localParams[param.key] === true}
                            onCheckedChange={(checked) => updateParam(param.key, checked, param)}
                          />
                          <Label 
                            htmlFor={param.key} 
                            className="text-sm text-muted-foreground cursor-pointer"
                          >
                            {localParams[param.key] === true ? 'Enabled' : 'Disabled'}
                          </Label>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {param.type === 'select' ? (
                            <Select
                              value={value.toString() || param.default}
                              onValueChange={(v) => updateParam(param.key, v, param)}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {param.options?.map((option: string) => (
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
                                param.type === 'number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value,
                                param
                              )}
                              min={param.min}
                              max={param.max}
                              step={param.step}
                              placeholder={param.placeholder || `Default: ${param.default}`}
                              className="flex-1"
                            />
                          )}
                          {param.unit && (
                            <span className="text-sm text-muted-foreground w-12">{param.unit}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

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