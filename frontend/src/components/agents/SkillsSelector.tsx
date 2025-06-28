import { useState, useEffect } from 'react'
import { Search, Plus, Trash2, Settings, Loader2, Package2, ShoppingCart } from 'lucide-react'
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

interface Skill {
  name: string
  params?: Record<string, any>
}

interface SkillDefinition {
  name: string
  description: string
  params: Array<{
    name: string
    type: string
    required?: boolean
    default?: any
    description: string
  }>
  functions: string[]
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

export function SkillsSelector({ open, onClose, selectedSkills, onChange }: SkillsSelectorProps) {
  const [localSkills, setLocalSkills] = useState<Skill[]>(selectedSkills)
  const [searchTerm, setSearchTerm] = useState('')
  const [configuringSkill, setConfiguringSkill] = useState<{ skill: Skill; index: number } | null>(null)
  const [addingSkill, setAddingSkill] = useState<string | null>(null)
  const [availableSkills, setAvailableSkills] = useState<SkillDefinition[]>(FALLBACK_SKILLS)
  const [isLoading, setIsLoading] = useState(true)

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
      const response = await api.get('/api/skills/')
      setAvailableSkills(response.data)
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
    if (!params) {
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
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Skills Configuration</DialogTitle>
            <DialogDescription>
              Manage your agent's skills and capabilities
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="installed" className="flex-1 flex flex-col">
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
                          onClick={() => {
                            const tabsList = document.querySelector('[role="tablist"]')
                            const marketplaceTab = tabsList?.querySelector('[value="marketplace"]')
                            if (marketplaceTab instanceof HTMLElement) {
                              marketplaceTab.click()
                            }
                          }}
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
                        
                        return (
                          <Card key={index}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <CardTitle className="text-base">{skill.name}</CardTitle>
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
                                <div className="flex gap-2">
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
                                      const paramDef = skillDef?.params.find(p => p.name === key)
                                      return (
                                        <div key={key} className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">
                                            {paramDef?.description || key}:
                                          </span>
                                          <span className="font-mono">
                                            {typeof value === 'string' && value.includes('key') 
                                              ? '••••••••' 
                                              : String(value)}
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
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search available skills..."
                    className="pl-10"
                  />
                </div>

                <ScrollArea className="h-[calc(100vh-320px)]">
                  <div className="space-y-4 pb-4 pr-4">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {filteredSkills.map((skill) => {
                          const selected = isSkillSelected(skill.name)
                          return (
                            <Card key={skill.name} className={selected ? 'opacity-60' : ''}>
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <CardTitle className="text-base">{skill.name}</CardTitle>
                                    <CardDescription>{skill.description}</CardDescription>
                                  </div>
                                  {selected && (
                                    <Badge variant="secondary">Installed</Badge>
                                  )}
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
                                  {selected ? 'Already Installed' : 'Install Skill'}
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

  // Initialize with defaults
  useEffect(() => {
    const defaultParams: Record<string, any> = {}
    skillDef.params.forEach(param => {
      if (param.default !== undefined && params[param.name] === undefined) {
        defaultParams[param.name] = param.default
      }
    })
    if (Object.keys(defaultParams).length > 0) {
      setParams(prev => ({ ...defaultParams, ...prev }))
    }
  }, [skillDef])

  const handleSave = () => {
    // Validate required params
    const missingRequired = skillDef.params
      .filter(p => p.required && !params[p.name])
      .map(p => p.description || p.name)
    
    if (missingRequired.length > 0) {
      alert(`Please fill in required fields: ${missingRequired.join(', ')}`)
      return
    }
    
    onSave(params)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure {skill.name}</DialogTitle>
          <DialogDescription>
            Set the parameters for this skill. Required fields are marked with *
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {skillDef.params.length === 0 ? (
            <p className="text-sm text-muted-foreground">This skill has no configurable parameters.</p>
          ) : (
            skillDef.params.map((param) => (
              <div key={param.name} className="space-y-2">
                <Label>
                  {param.description || param.name}
                  {param.required && <span className="text-destructive ml-1">*</span>}
                  {!param.required && <span className="text-muted-foreground ml-1">(optional)</span>}
                </Label>
                <Input
                  type={param.type === 'number' ? 'number' : 'text'}
                  value={params[param.name] || ''}
                  onChange={(e) => setParams({
                    ...params,
                    [param.name]: param.type === 'number' ? Number(e.target.value) : e.target.value
                  })}
                  placeholder={param.default !== undefined ? `Default: ${param.default}` : 'Enter value'}
                />
                {param.type === 'string' && param.name.toLowerCase().includes('key') && (
                  <p className="text-xs text-muted-foreground">
                    Tip: You can also set this as an environment variable
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2">
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