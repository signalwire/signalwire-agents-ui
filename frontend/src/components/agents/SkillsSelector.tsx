import { useState } from 'react'
import { Search, Plus, Trash2, Settings } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Skill {
  name: string
  params?: Record<string, any>
}

interface SkillsSelectorProps {
  open: boolean
  onClose: () => void
  selectedSkills: Skill[]
  onChange: (skills: Skill[]) => void
}

// Available skills from the SDK
const AVAILABLE_SKILLS = [
  {
    name: 'datetime',
    description: 'Get current date and time information',
    params: [],
  },
  {
    name: 'math',
    description: 'Perform mathematical calculations',
    params: [],
  },
  {
    name: 'web_search',
    description: 'Search the web for information',
    params: [
      { name: 'api_key', type: 'string', required: true, description: 'Google API Key' },
      { name: 'search_engine_id', type: 'string', required: true, description: 'Search Engine ID' },
      { name: 'num_results', type: 'number', default: 3, description: 'Number of results' },
    ],
  },
  {
    name: 'weather_api',
    description: 'Get weather information',
    params: [
      { name: 'api_key', type: 'string', required: true, description: 'Weather API Key' },
    ],
  },
]

export function SkillsSelector({ open, onClose, selectedSkills, onChange }: SkillsSelectorProps) {
  const [localSkills, setLocalSkills] = useState<Skill[]>(selectedSkills)
  const [searchTerm, setSearchTerm] = useState('')
  const [configuringSkill, setConfiguringSkill] = useState<{ skill: Skill; index: number } | null>(null)

  const filteredSkills = AVAILABLE_SKILLS.filter(skill =>
    skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    skill.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const isSkillSelected = (skillName: string) => {
    return localSkills.some(s => s.name === skillName)
  }

  const addSkill = (skillName: string) => {
    const skillDef = AVAILABLE_SKILLS.find(s => s.name === skillName)
    if (!skillDef) return

    const newSkill: Skill = {
      name: skillName,
      params: {},
    }

    // Add default params
    skillDef.params.forEach(param => {
      if (param.default !== undefined) {
        newSkill.params![param.name] = param.default
      }
    })

    setLocalSkills([...localSkills, newSkill])
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
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Skills Marketplace</DialogTitle>
            <DialogDescription>
              Add capabilities to your agent by enabling skills
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search skills..."
                className="pl-10"
              />
            </div>

            {/* Selected Skills */}
            {localSkills.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Enabled Skills</h3>
                <div className="space-y-2">
                  {localSkills.map((skill, index) => {
                    const skillDef = AVAILABLE_SKILLS.find(s => s.name === skill.name)
                    return (
                      <Card key={index}>
                        <CardContent className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-medium">{skill.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {skillDef?.description}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {skillDef?.params.length! > 0 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setConfiguringSkill({ skill, index })}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSkill(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Available Skills */}
            <div className="space-y-4">
              <h3 className="font-semibold">Available Skills</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredSkills.map((skill) => {
                  const selected = isSkillSelected(skill.name)
                  return (
                    <Card key={skill.name} className={selected ? 'opacity-50' : ''}>
                      <CardHeader>
                        <CardTitle className="text-base">{skill.name}</CardTitle>
                        <CardDescription>{skill.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          type="button"
                          size="sm"
                          disabled={selected}
                          onClick={() => addSkill(skill.name)}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {selected ? 'Already Added' : 'Add Skill'}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save Skills
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Skill Configuration Dialog */}
      {configuringSkill && (
        <SkillConfigDialog
          skill={configuringSkill.skill}
          skillDef={AVAILABLE_SKILLS.find(s => s.name === configuringSkill.skill.name)!}
          onSave={(params) => {
            updateSkillParams(configuringSkill.index, params)
            setConfiguringSkill(null)
          }}
          onClose={() => setConfiguringSkill(null)}
        />
      )}
    </>
  )
}

interface SkillConfigDialogProps {
  skill: Skill
  skillDef: typeof AVAILABLE_SKILLS[0]
  onSave: (params: Record<string, any>) => void
  onClose: () => void
}

function SkillConfigDialog({ skill, skillDef, onSave, onClose }: SkillConfigDialogProps) {
  const [params, setParams] = useState<Record<string, any>>(skill.params || {})

  const handleSave = () => {
    onSave(params)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure {skill.name}</DialogTitle>
          <DialogDescription>
            Set the parameters for this skill
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {skillDef.params.map((param) => (
            <div key={param.name} className="space-y-2">
              <Label>
                {param.description || param.name}
                {param.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input
                type={param.type === 'number' ? 'number' : 'text'}
                value={params[param.name] || ''}
                onChange={(e) => setParams({
                  ...params,
                  [param.name]: param.type === 'number' ? Number(e.target.value) : e.target.value
                })}
                placeholder={param.default?.toString() || ''}
              />
            </div>
          ))}
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