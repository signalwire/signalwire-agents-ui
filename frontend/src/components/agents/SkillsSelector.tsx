import { useState, useEffect } from 'react'
import { Search, Plus, Trash2, Settings, Loader2, Package2, ShoppingCart, Play } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { toast } from '@/components/ui/use-toast'
import { TestSkillDialog } from './TestSkillDialog'
import { FillersEditor } from './FillersEditor'

interface Skill {
  name: string
  params?: Record<string, any>
}

interface SkillDefinition {
  name: string
  description: string
  supports_multiple_instances?: boolean
  parameters?: Record<string, any>  // Parameters from unified endpoint
  // Legacy params field for backward compatibility
  params?: Array<{
    name: string
    type: string
    required?: boolean
    default?: any
    description: string
    hidden?: boolean
    env_var?: string
    min?: number
    max?: number
    enum?: string[]
  }>
  functions?: string[]
  // Additional fields from unified endpoint
  version?: string
  display_name?: string
  category?: string
  tags?: string[]
  installed?: boolean
  enabled?: boolean
  marketplace?: any
}

interface SkillsSelectorProps {
  open: boolean
  onClose: () => void
  selectedSkills: Skill[]
  onChange: (skills: Skill[]) => void
}

// Fallback skills if API fails
const FALLBACK_SKILLS: SkillDefinition[] = [
  {
    name: 'datetime',
    description: 'Get current date and time information',
    params: [],
    functions: ['get_current_time', 'get_current_date'],
  },
  {
    name: 'math',
    description: 'Perform mathematical calculations',
    params: [],
    functions: ['calculate'],
  },
  {
    name: 'web_search',
    description: 'Search the web for information',
    params: [
      { name: 'api_key', type: 'string', required: true, description: 'Google API Key' },
      { name: 'search_engine_id', type: 'string', required: true, description: 'Search Engine ID' },
      { name: 'num_results', type: 'number', default: 3, description: 'Number of results' },
    ],
    functions: ['web_search'],
  },
  {
    name: 'weather',
    description: 'Get weather information',
    params: [
      { name: 'api_key', type: 'string', required: true, description: 'Weather API Key' },
    ],
    functions: ['get_weather'],
  },
]

// Convert unified parameters to legacy params format
function convertParametersToParams(parameters: Record<string, any>): Array<any> {
  return Object.entries(parameters).map(([name, config]) => ({
    name,
    type: config.type || 'string',
    required: config.required || false,
    default: config.default,
    description: config.description || name,
    hidden: config.hidden || false,
    env_var: config.env_var,
    min: config.min,
    max: config.max,
    enum: config.enum
  }))
}

export function SkillsSelector({ open, onClose, selectedSkills, onChange }: SkillsSelectorProps) {
  const [localSkills, setLocalSkills] = useState<Skill[]>(selectedSkills)
  const [searchTerm, setSearchTerm] = useState('')
  const [configuringSkill, setConfiguringSkill] = useState<{ skill: Skill; index: number } | null>(null)
  const [testingSkill, setTestingSkill] = useState<{ skill: Skill; index: number } | null>(null)
  const [addingSkill, setAddingSkill] = useState<string | null>(null)
  const [availableSkills, setAvailableSkills] = useState<SkillDefinition[]>(FALLBACK_SKILLS)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('installed')

  useEffect(() => {
    if (open) {
      fetchAvailableSkills()
      // Sync local state with props when dialog opens
      setLocalSkills(selectedSkills)
    }
  }, [open, selectedSkills])

  const fetchAvailableSkills = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/api/skills/unified/')
      
      // Convert unified response to component format
      const skills = response.data.map((skill: any) => ({
        ...skill,
        // Convert parameters to legacy params format if not already present
        params: skill.params || (skill.parameters ? convertParametersToParams(skill.parameters) : []),
        // Extract functions from parameters if not provided
        functions: skill.functions || (skill.parameters ? 
          Object.keys(skill.parameters).filter(key => !['tool_name', 'api_key', 'search_engine_id'].includes(key)) : 
          []
        )
      }))
      
      setAvailableSkills(skills)
    } catch (error) {
      console.error('Failed to load skills:', error)
      toast({
        title: 'Failed to load skills',
        description: 'Using default skill list',
        variant: 'destructive'
      })
      setAvailableSkills(FALLBACK_SKILLS)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredSkills = availableSkills.filter(skill =>
    skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    skill.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const isSkillSelected = (skillName: string) => {
    const skillDef = availableSkills.find(s => s.name === skillName)
    // If skill supports multiple instances, it's never "selected" (can always add more)
    if (skillDef?.supports_multiple_instances) {
      return false
    }
    // For single-instance skills, check if already added
    return localSkills.some(s => s.name === skillName)
  }

  const addSkill = (skillName: string, params?: Record<string, any>) => {
    const skillDef = availableSkills.find(s => s.name === skillName)
    if (!skillDef) return

    const newSkill: Skill = {
      name: skillName,
      params: params || {},
    }

    // Add default params if not provided
    if (!params && skillDef.params) {
      skillDef.params.forEach(param => {
        if (param.default !== undefined) {
          newSkill.params![param.name] = param.default
        }
      })
    }

    setLocalSkills([...localSkills, newSkill])
  }

  const handleAddSkill = (skillName: string) => {
    const skillDef = availableSkills.find(s => s.name === skillName)
    if (!skillDef) return

    // If skill has any params (required or optional), show config dialog
    if (skillDef.params && skillDef.params.length > 0) {
      setAddingSkill(skillName)
    } else {
      addSkill(skillName)
    }
  }

  const removeSkill = (index: number) => {
    setLocalSkills(localSkills.filter((_, i) => i !== index))
  }

  const updateSkillParams = (index: number, params: Record<string, any>) => {
    const updated = [...localSkills]
    updated[index] = { ...updated[index], params }
    setLocalSkills(updated)
  }

  const handleSave = () => {
    onChange(localSkills)
    onClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[95vh] h-[min(85vh,800px)] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Skills Configuration</DialogTitle>
            <DialogDescription>
              Manage your agent's skills and capabilities
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 grid w-auto grid-cols-2 self-start">
              <TabsTrigger value="installed" className="gap-2">
                <Package2 className="h-4 w-4" />
                Installed Skills
                {localSkills.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {localSkills.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="marketplace" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Add New Skills
              </TabsTrigger>
            </TabsList>

            <TabsContent value="installed" className="flex-1 overflow-hidden px-6 mt-6">
              <ScrollArea className="h-full">
                <div className="space-y-4 pb-4 pr-4">
                  {localSkills.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Package2 className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium mb-2">No skills installed</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Add skills to give your agent new capabilities
                        </p>
                        <Button
                          type="button"
                          onClick={() => setActiveTab('marketplace')}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Browse Skills
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {localSkills.map((skill, index) => {
                        const skillDef = availableSkills.find(s => s.name === skill.name)
                        const hasParams = skillDef?.params && skillDef.params.length > 0
                        const instanceNumber = skillDef?.supports_multiple_instances ? 
                          localSkills.slice(0, index + 1).filter(s => s.name === skill.name).length : 0
                        
                        return (
                          <Card key={index}>
                            <CardHeader className="pb-3">
                              <div className="flex flex-col gap-3">
                                <div className="space-y-1">
                                  <CardTitle className="text-base">
                                    {skill.name}
                                    {instanceNumber > 0 && (
                                      <span className="text-sm font-normal text-muted-foreground ml-2">
                                        (Instance {instanceNumber})
                                      </span>
                                    )}
                                  </CardTitle>
                                  <CardDescription>
                                    {skillDef?.description || 'No description available'}
                                  </CardDescription>
                                  {skillDef?.functions && skillDef.functions.length > 0 && (
                                    <div className="flex gap-2 mt-2">
                                      <span className="text-xs text-muted-foreground">Functions:</span>
                                      <div className="flex gap-1 flex-wrap">
                                        {skillDef.functions.map(fn => (
                                          <Badge key={fn} variant="outline" className="text-xs">
                                            {fn}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setTestingSkill({ skill, index })}
                                  >
                                    <Play className="h-4 w-4 mr-1" />
                                    Test
                                  </Button>
                                  {hasParams && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setConfiguringSkill({ skill, index })}
                                    >
                                      <Settings className="h-4 w-4 mr-1" />
                                      Configure
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeSkill(index)}
                                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            {hasParams && skill.params && Object.keys(skill.params).length > 0 && (
                              <CardContent className="pt-0">
                                <div className="rounded-lg bg-muted/50 p-3">
                                  <p className="text-xs font-medium mb-2">Current Configuration:</p>
                                  <div className="space-y-1">
                                    {Object.entries(skill.params).map(([key, value]) => {
                                      const paramDef = skillDef?.params?.find(p => p.name === key)
                                      const displayValue = paramDef?.hidden ? '••••••••' : String(value)
                                      return (
                                        <div key={key} className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">
                                            {paramDef?.description || key}:
                                          </span>
                                          <span className="font-mono">
                                            {displayValue}
                                          </span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="marketplace" className="flex-1 overflow-hidden px-6 mt-6">
              <div className="h-full flex flex-col">
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search available skills..."
                    className="pl-10"
                  />
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-4 pb-4 pr-4">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {filteredSkills.map((skill) => {
                          const selected = isSkillSelected(skill.name)
                          const instanceCount = localSkills.filter(s => s.name === skill.name).length
                          const hasInstances = instanceCount > 0
                          
                          return (
                            <Card key={skill.name} className={selected ? 'opacity-60' : ''}>
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <CardTitle className="text-base">{skill.name}</CardTitle>
                                    <CardDescription>{skill.description}</CardDescription>
                                  </div>
                                  <div className="flex gap-2">
                                    {skill.supports_multiple_instances && hasInstances && (
                                      <Badge variant="outline">{instanceCount} instance{instanceCount > 1 ? 's' : ''}</Badge>
                                    )}
                                    {selected && (
                                      <Badge variant="secondary">Installed</Badge>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                {skill.functions && skill.functions.length > 0 && (
                                  <div className="mb-3">
                                    <span className="text-xs text-muted-foreground">Provides:</span>
                                    <div className="flex gap-1 flex-wrap mt-1">
                                      {skill.functions.map(fn => (
                                        <Badge key={fn} variant="outline" className="text-xs">
                                          {fn}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={selected}
                                  onClick={() => handleAddSkill(skill.name)}
                                  className="w-full"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  {selected ? 'Already Installed' : 
                                   skill.supports_multiple_instances && hasInstances ? 'Add Another Instance' : 'Install Skill'}
                                </Button>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between items-center gap-2 p-6 border-t">
            <p className="text-sm text-muted-foreground">
              {localSkills.length} skill{localSkills.length !== 1 ? 's' : ''} configured
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Skill Configuration Dialog */}
      {configuringSkill && (
        <SkillConfigDialog
          skill={configuringSkill.skill}
          skillDef={availableSkills.find(s => s.name === configuringSkill.skill.name)!}
          onSave={(params) => {
            updateSkillParams(configuringSkill.index, params)
            setConfiguringSkill(null)
          }}
          onClose={() => setConfiguringSkill(null)}
        />
      )}

      {/* Add Skill Dialog (for skills with required params) */}
      {addingSkill && (
        <SkillConfigDialog
          skill={{ name: addingSkill, params: {} }}
          skillDef={availableSkills.find(s => s.name === addingSkill)!}
          onSave={(params) => {
            addSkill(addingSkill, params)
            setAddingSkill(null)
          }}
          onClose={() => setAddingSkill(null)}
        />
      )}

      {/* Test Skill Dialog */}
      {testingSkill && (
        <TestSkillDialog
          skillName={testingSkill.skill.name}
          skillParams={testingSkill.skill.params || {}}
          onClose={() => setTestingSkill(null)}
        />
      )}
    </>
  )
}

interface SkillConfigDialogProps {
  skill: Skill
  skillDef: SkillDefinition
  onSave: (params: Record<string, any>) => void
  onClose: () => void
}

function SkillConfigDialog({ skill, skillDef, onSave, onClose }: SkillConfigDialogProps) {
  const [params, setParams] = useState<Record<string, any>>(skill.params || {})
  const [envVarStatus, setEnvVarStatus] = useState<Record<string, any>>({})

  // Initialize with defaults and check env var status
  useEffect(() => {
    const defaultParams: Record<string, any> = {}
    const checkEnvVars = async () => {
      const status: Record<string, any> = {}
      
      for (const param of skillDef.params || []) {
        if (param.default !== undefined && params[param.name] === undefined) {
          defaultParams[param.name] = param.default
        }
        
        // Check env var status if specified
        if (param.env_var) {
          try {
            const response = await api.get(`/api/env-vars/check/${param.env_var}`)
            status[param.name] = response.data
          } catch (error) {
            status[param.name] = { exists: false, source: null, is_set: false }
          }
        }
      }
      
      setEnvVarStatus(status)
    }
    
    checkEnvVars()
    
    if (Object.keys(defaultParams).length > 0) {
      setParams(prev => ({ ...defaultParams, ...prev }))
    }
  }, [skillDef])

  const handleSave = () => {
    // Validate required params
    const missingRequired = (skillDef.params || [])
      .filter(p => {
        // If param is not required, skip validation
        if (!p.required) return false
        
        // If param has a value, it's not missing
        if (params[p.name]) return false
        
        // If param has an env_var that's set, it's not missing
        if (p.env_var && envVarStatus[p.name]?.is_set) return false
        
        // Otherwise it's missing
        return true
      })
      .map(p => p.description || p.name)
    
    if (missingRequired.length > 0) {
      alert(`Please fill in required fields: ${missingRequired.join(', ')}`)
      return
    }
    
    onSave(params)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configure {skill.name}</DialogTitle>
          <DialogDescription>
            Set the parameters for this skill. Required fields are marked with *
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-4 py-4">
          {!skillDef.params || skillDef.params.length === 0 ? (
            <p className="text-sm text-muted-foreground">This skill has no configurable parameters.</p>
          ) : (
            skillDef.params.map((param) => (
              <div key={param.name} className="space-y-2">
                {param.name === 'swaig_fields' ? (
                  <FillersEditor
                    value={params[param.name] || {}}
                    onChange={(value) => setParams({
                      ...params,
                      [param.name]: value
                    })}
                    skillType={skill.name}
                  />
                ) : (
                  <>
                    <Label>
                      {param.description || param.name}
                      {param.required && <span className="text-destructive ml-1">*</span>}
                      {!param.required && <span className="text-muted-foreground ml-1">(optional)</span>}
                    </Label>
                    <Input
                      type={param.type === 'number' ? 'number' : param.hidden ? 'password' : 'text'}
                      value={params[param.name] || ''}
                      onChange={(e) => setParams({
                        ...params,
                        [param.name]: param.type === 'number' ? Number(e.target.value) : e.target.value
                      })}
                      placeholder={
                        envVarStatus[param.name]?.is_set 
                          ? `Using ${param.env_var} from ${envVarStatus[param.name].source === 'user' ? 'config' : 'system'}`
                          : param.default !== undefined 
                            ? `Default: ${param.default}` 
                            : 'Enter value'
                      }
                      autoComplete={param.hidden ? "new-password" : "off"}
                    />
                    {param.env_var && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Environment variable: <code className="bg-muted px-1 rounded">{param.env_var}</code>
                        </p>
                        {envVarStatus[param.name]?.is_set && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            ✓ Using value from {envVarStatus[param.name].source === 'user' ? 'configured' : 'system'} environment variable
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}