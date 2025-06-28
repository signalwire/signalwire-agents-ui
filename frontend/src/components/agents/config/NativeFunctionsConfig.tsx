import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Trash2, Info, ChevronDown, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'

// TODO: This list should be fetched from the backend API
// For now, using a hardcoded list based on common native functions
const AVAILABLE_NATIVE_FUNCTIONS = [
  { name: 'wait_for_user', description: 'Wait for user input before continuing' },
  { name: 'next_step', description: 'Move to the next step in a structured flow' },
  { name: 'change_context', description: 'Switch to a different conversation context' },
  { name: 'check_time', description: 'Check the current time' },
  { name: 'transfer', description: 'Transfer the call to another number' },
  { name: 'end_call', description: 'End the current call' },
  { name: 'play_audio', description: 'Play an audio file' },
  { name: 'record_audio', description: 'Record audio from the user' },
  { name: 'send_sms', description: 'Send an SMS message' },
  { name: 'send_email', description: 'Send an email' },
]

export interface NativeFunctionsConfig {
  enabled_functions: string[]
  internal_fillers: Record<string, Record<string, string[]>> // function -> language -> fillers
}

interface NativeFunctionsConfigProps {
  open: boolean
  onClose: () => void
  config: NativeFunctionsConfig
  onChange: (config: NativeFunctionsConfig) => void
  languages?: Array<{ code: string; name: string }> // Available languages from agent config
}

export function NativeFunctionsConfig({ 
  open, 
  onClose, 
  config, 
  onChange,
  languages = [{ code: 'en-US', name: 'English' }]
}: NativeFunctionsConfigProps) {
  const [localConfig, setLocalConfig] = useState<NativeFunctionsConfig>(config)
  const [expandedFunctions, setExpandedFunctions] = useState<Set<string>>(new Set())
  const [newFiller, setNewFiller] = useState('')
  const [editingFiller, setEditingFiller] = useState<{
    func: string
    lang: string
  } | null>(null)

  // Fetch available native functions from backend
  const { data: nativeFunctions } = useQuery({
    queryKey: ['native-functions'],
    queryFn: async () => {
      const response = await api.get('/api/native-functions/')
      return response.data as Array<{ name: string; description: string; category: string }>
    },
    initialData: AVAILABLE_NATIVE_FUNCTIONS
  })

  const handleSave = () => {
    onChange(localConfig)
    onClose()
  }

  const toggleFunction = (functionName: string) => {
    const enabled = localConfig.enabled_functions.includes(functionName)
    if (enabled) {
      // Remove function
      setLocalConfig({
        ...localConfig,
        enabled_functions: localConfig.enabled_functions.filter(f => f !== functionName),
        // Also remove fillers for this function
        internal_fillers: Object.fromEntries(
          Object.entries(localConfig.internal_fillers).filter(([key]) => key !== functionName)
        )
      })
    } else {
      // Add function
      setLocalConfig({
        ...localConfig,
        enabled_functions: [...localConfig.enabled_functions, functionName]
      })
    }
  }

  const toggleExpanded = (functionName: string) => {
    const newExpanded = new Set(expandedFunctions)
    if (newExpanded.has(functionName)) {
      newExpanded.delete(functionName)
    } else {
      newExpanded.add(functionName)
    }
    setExpandedFunctions(newExpanded)
  }

  const addFiller = () => {
    if (!editingFiller || !newFiller) return

    const { func, lang } = editingFiller
    const currentFillers = localConfig.internal_fillers[func]?.[lang] || []
    
    setLocalConfig({
      ...localConfig,
      internal_fillers: {
        ...localConfig.internal_fillers,
        [func]: {
          ...localConfig.internal_fillers[func],
          [lang]: [...currentFillers, newFiller]
        }
      }
    })

    setNewFiller('')
  }

  const removeFiller = (func: string, lang: string, index: number) => {
    const fillers = [...(localConfig.internal_fillers[func]?.[lang] || [])]
    fillers.splice(index, 1)

    setLocalConfig({
      ...localConfig,
      internal_fillers: {
        ...localConfig.internal_fillers,
        [func]: {
          ...localConfig.internal_fillers[func],
          [lang]: fillers
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Native Functions & Fillers</DialogTitle>
          <DialogDescription>
            Enable built-in SignalWire functions and configure what the AI says while executing them
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Native functions provide built-in capabilities like waiting for user input, transferring calls, 
              or navigating conversation flows. Fillers are phrases the AI says while executing these functions.
            </AlertDescription>
          </Alert>

          {/* Native Functions List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Available Native Functions</h4>
            <div className="space-y-2">
              {nativeFunctions.map((func) => {
                const isEnabled = localConfig.enabled_functions.includes(func.name)
                const isExpanded = expandedFunctions.has(func.name)

                return (
                  <Card key={func.name}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            checked={isEnabled}
                            onCheckedChange={() => toggleFunction(func.name)}
                          />
                          <div className="space-y-1">
                            <CardTitle className="text-base">{func.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{func.description}</p>
                          </div>
                        </div>
                        {isEnabled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(func.name)}
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            Fillers
                          </Button>
                        )}
                      </div>
                    </CardHeader>

                    {isEnabled && (
                      <Collapsible open={isExpanded}>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <div className="space-y-4">
                              {languages.map((lang) => {
                                const fillers = localConfig.internal_fillers[func.name]?.[lang.code] || []
                                const isEditingThis = editingFiller?.func === func.name && editingFiller?.lang === lang.code

                                return (
                                  <div key={lang.code} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-sm">{lang.name} Fillers</Label>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditingFiller({ func: func.name, lang: lang.code })}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add
                                      </Button>
                                    </div>

                                    {fillers.length > 0 && (
                                      <div className="space-y-1">
                                        {fillers.map((filler, index) => (
                                          <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                            <span className="text-sm">{filler}</span>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeFiller(func.name, lang.code, index)}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {isEditingThis && (
                                      <div className="flex gap-2">
                                        <Input
                                          value={newFiller}
                                          onChange={(e) => setNewFiller(e.target.value)}
                                          placeholder="Enter filler phrase..."
                                          onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                              addFiller()
                                            }
                                          }}
                                        />
                                        <Button
                                          size="sm"
                                          onClick={addFiller}
                                          disabled={!newFiller}
                                        >
                                          Add
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setEditingFiller(null)
                                            setNewFiller('')
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Example fillers */}
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">Filler Examples</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">wait_for_user:</span> "Please take your time...", "I'll wait for your response..."
              </div>
              <div>
                <span className="font-medium">next_step:</span> "Moving to the next step...", "Let's continue..."
              </div>
              <div>
                <span className="font-medium">transfer:</span> "Transferring your call now...", "One moment while I connect you..."
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Functions & Fillers
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}