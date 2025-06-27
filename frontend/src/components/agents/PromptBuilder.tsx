import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

interface PromptSection {
  title: string
  body?: string
  bullets?: string[]
}

interface PromptBuilderProps {
  open: boolean
  onClose: () => void
  sections: PromptSection[]
  onChange: (sections: PromptSection[]) => void
}

export function PromptBuilder({ open, onClose, sections, onChange }: PromptBuilderProps) {
  const [localSections, setLocalSections] = useState<PromptSection[]>(sections)
  const [editingBullets, setEditingBullets] = useState<Record<number, string>>({})

  const commonSectionTemplates = [
    { title: 'Role', body: 'You are a helpful assistant...' },
    { title: 'Guidelines', body: 'Follow these principles:', bullets: ['Be helpful', 'Be concise'] },
    { title: 'Knowledge', body: 'You have access to the following information...' },
    { title: 'Restrictions', body: 'You must not:', bullets: ['Share sensitive data', 'Make promises'] },
  ]

  const addSection = (template?: typeof commonSectionTemplates[0]) => {
    const newSection: PromptSection = template || { title: 'New Section', body: '' }
    setLocalSections([...localSections, newSection])
  }

  const updateSection = (index: number, updates: Partial<PromptSection>) => {
    const updated = [...localSections]
    updated[index] = { ...updated[index], ...updates }
    setLocalSections(updated)
  }

  const removeSection = (index: number) => {
    setLocalSections(localSections.filter((_, i) => i !== index))
  }

  const addBullet = (sectionIndex: number) => {
    const section = localSections[sectionIndex]
    const bullets = section.bullets || []
    updateSection(sectionIndex, { bullets: [...bullets, ''] })
  }

  const updateBullet = (sectionIndex: number, bulletIndex: number, value: string) => {
    const section = localSections[sectionIndex]
    const bullets = [...(section.bullets || [])]
    bullets[bulletIndex] = value
    updateSection(sectionIndex, { bullets })
  }

  const removeBullet = (sectionIndex: number, bulletIndex: number) => {
    const section = localSections[sectionIndex]
    const bullets = (section.bullets || []).filter((_, i) => i !== bulletIndex)
    updateSection(sectionIndex, { bullets })
  }

  const moveSection = (fromIndex: number, toIndex: number) => {
    const updated = [...localSections]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    setLocalSections(updated)
  }

  const handleSave = () => {
    onChange(localSections)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Agent Instructions</DialogTitle>
          <DialogDescription>
            Build your agent's personality and behavior through structured prompts
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Quick Templates */}
          <div className="flex flex-wrap gap-2 pb-4 border-b">
            <p className="w-full text-sm text-muted-foreground mb-2">Quick templates:</p>
            {commonSectionTemplates.map((template, index) => (
              <Button
                key={index}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSection(template)}
              >
                + {template.title}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addSection()}
            >
              + Custom Section
            </Button>
          </div>

          {/* Sections */}
          {localSections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No prompt sections yet.</p>
              <p className="text-sm mt-2">Add sections to define your agent's behavior.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {localSections.map((section, sectionIndex) => (
                <Card key={sectionIndex}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-2 mb-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-move"
                        onMouseDown={(e) => {
                          // Simple drag indicator - in production use a proper DnD library
                          e.preventDefault()
                        }}
                      >
                        <GripVertical className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 space-y-4">
                        <Input
                          value={section.title}
                          onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
                          placeholder="Section Title"
                          className="font-semibold"
                        />
                        
                        <Textarea
                          value={section.body || ''}
                          onChange={(e) => updateSection(sectionIndex, { body: e.target.value })}
                          placeholder="Section content..."
                          rows={3}
                        />

                        {/* Bullets */}
                        {section.bullets && section.bullets.length > 0 && (
                          <div className="space-y-2 pl-4">
                            <Label className="text-sm">Bullet Points:</Label>
                            {section.bullets.map((bullet, bulletIndex) => (
                              <div key={bulletIndex} className="flex items-center gap-2">
                                <span className="text-muted-foreground">•</span>
                                <Input
                                  value={bullet}
                                  onChange={(e) => updateBullet(sectionIndex, bulletIndex, e.target.value)}
                                  placeholder="Bullet point..."
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => removeBullet(sectionIndex, bulletIndex)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addBullet(sectionIndex)}
                          >
                            + Add Bullet
                          </Button>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeSection(sectionIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Instructions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}