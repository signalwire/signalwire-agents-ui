import { useState } from 'react'
import { Network, FileText, Plus, Trash2, ChevronDown, ChevronUp, Copy, AlertCircle, HelpCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { helpContent } from '@/lib/helpContent'

export interface ContextSection {
  title: string
  content: string
  bullets?: string[]
}

export interface Step {
  id: string
  name: string
  sections: ContextSection[]
  step_criteria?: string
  valid_steps: string[]
  valid_contexts: string[]
  restricted_functions?: string[]
}

export interface Context {
  id: string
  name: string
  isolated: boolean
  sections: ContextSection[]
  steps: Step[]
  enter_filler?: Record<string, string[]>
}

export interface ContextsStepsConfig {
  contexts: Context[]
}

interface ContextsStepsConfigProps {
  open: boolean
  onClose: () => void
  config: ContextsStepsConfig
  onChange: (config: ContextsStepsConfig) => void
  availableFunctions?: string[]
}

export function ContextsStepsConfig({ 
  open, 
  onClose, 
  config, 
  onChange,
  availableFunctions = []
}: ContextsStepsConfigProps) {
  const [localConfig, setLocalConfig] = useState<ContextsStepsConfig>(config)
  const [activeContext, setActiveContext] = useState<string>(localConfig.contexts[0]?.id || '')
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const [showHelp, setShowHelp] = useState(false)

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId)
    } else {
      newExpanded.add(stepId)
    }
    setExpandedSteps(newExpanded)
  }

  const addContext = () => {
    const newContext: Context = {
      id: `context_${Date.now()}`,
      name: localConfig.contexts.length === 0 ? 'default' : `context_${localConfig.contexts.length + 1}`,
      isolated: true,
      sections: [],
      steps: []
    }
    setLocalConfig({
      ...localConfig,
      contexts: [...localConfig.contexts, newContext]
    })
    setActiveContext(newContext.id)
  }

  const updateContext = (contextId: string, updates: Partial<Context>) => {
    setLocalConfig({
      ...localConfig,
      contexts: localConfig.contexts.map(ctx => 
        ctx.id === contextId ? { ...ctx, ...updates } : ctx
      )
    })
  }

  const deleteContext = (contextId: string) => {
    const newContexts = localConfig.contexts.filter(ctx => ctx.id !== contextId)
    setLocalConfig({
      ...localConfig,
      contexts: newContexts
    })
    if (activeContext === contextId && newContexts.length > 0) {
      setActiveContext(newContexts[0].id)
    }
  }

  const addStep = (contextId: string) => {
    const context = localConfig.contexts.find(ctx => ctx.id === contextId)
    if (!context) return

    const newStep: Step = {
      id: `step_${Date.now()}`,
      name: `step_${context.steps.length + 1}`,
      sections: [],
      valid_steps: [],
      valid_contexts: []
    }

    updateContext(contextId, {
      steps: [...context.steps, newStep]
    })
    setExpandedSteps(new Set([...expandedSteps, newStep.id]))
  }

  const updateStep = (contextId: string, stepId: string, updates: Partial<Step>) => {
    const context = localConfig.contexts.find(ctx => ctx.id === contextId)
    if (!context) return

    updateContext(contextId, {
      steps: context.steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      )
    })
  }

  const deleteStep = (contextId: string, stepId: string) => {
    const context = localConfig.contexts.find(ctx => ctx.id === contextId)
    if (!context) return

    updateContext(contextId, {
      steps: context.steps.filter(step => step.id !== stepId)
    })
  }

  const addSection = (contextId: string, stepId?: string) => {
    const newSection: ContextSection = {
      title: 'New Section',
      content: ''
    }

    if (stepId) {
      const context = localConfig.contexts.find(ctx => ctx.id === contextId)
      if (!context) return
      const step = context.steps.find(s => s.id === stepId)
      if (!step) return

      updateStep(contextId, stepId, {
        sections: [...step.sections, newSection]
      })
    } else {
      const context = localConfig.contexts.find(ctx => ctx.id === contextId)
      if (!context) return

      updateContext(contextId, {
        sections: [...context.sections, newSection]
      })
    }
  }

  const updateSection = (contextId: string, sectionIndex: number, updates: Partial<ContextSection>, stepId?: string) => {
    if (stepId) {
      const context = localConfig.contexts.find(ctx => ctx.id === contextId)
      if (!context) return
      const step = context.steps.find(s => s.id === stepId)
      if (!step) return

      updateStep(contextId, stepId, {
        sections: step.sections.map((section, idx) => 
          idx === sectionIndex ? { ...section, ...updates } : section
        )
      })
    } else {
      const context = localConfig.contexts.find(ctx => ctx.id === contextId)
      if (!context) return

      updateContext(contextId, {
        sections: context.sections.map((section, idx) => 
          idx === sectionIndex ? { ...section, ...updates } : section
        )
      })
    }
  }

  const deleteSection = (contextId: string, sectionIndex: number, stepId?: string) => {
    if (stepId) {
      const context = localConfig.contexts.find(ctx => ctx.id === contextId)
      if (!context) return
      const step = context.steps.find(s => s.id === stepId)
      if (!step) return

      updateStep(contextId, stepId, {
        sections: step.sections.filter((_, idx) => idx !== sectionIndex)
      })
    } else {
      const context = localConfig.contexts.find(ctx => ctx.id === contextId)
      if (!context) return

      updateContext(contextId, {
        sections: context.sections.filter((_, idx) => idx !== sectionIndex)
      })
    }
  }

  const duplicateStep = (contextId: string, stepId: string) => {
    const context = localConfig.contexts.find(ctx => ctx.id === contextId)
    if (!context) return
    const step = context.steps.find(s => s.id === stepId)
    if (!step) return

    const newStep: Step = {
      ...step,
      id: `step_${Date.now()}`,
      name: `${step.name}_copy`,
      sections: [...step.sections]
    }

    updateContext(contextId, {
      steps: [...context.steps, newStep]
    })
    setExpandedSteps(new Set([...expandedSteps, newStep.id]))
  }

  const handleSave = () => {
    onChange(localConfig)
    onClose()
  }

  const currentContext = localConfig.contexts.find(ctx => ctx.id === activeContext)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Contexts & Steps Configuration</DialogTitle>
              <DialogDescription>
                Build structured conversation flows with contexts and sequential steps
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHelp(!showHelp)}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {showHelp && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2 text-sm">
                <p><strong>Contexts:</strong> Separate conversation modes (e.g., sales, support, manager)</p>
                <p><strong>Steps:</strong> Sequential stages within a context with completion criteria</p>
                <p><strong>Sections:</strong> Structured prompt content using the Prompt Object Model (POM)</p>
                <p><strong>Navigation:</strong> Control which steps and contexts the AI can access</p>
                <p><strong>Function Restrictions:</strong> Limit which tools are available in each step</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 overflow-hidden">
          {localConfig.contexts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <Network className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">No contexts defined</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start by creating your first context to build structured workflows
                  </p>
                </div>
                <Button onClick={addContext}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Context
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 h-full">
              {/* Context List Sidebar */}
              <div className="w-64 border-r pr-4 overflow-y-auto">
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-base">Contexts</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={addContext}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {localConfig.contexts.map((context) => (
                    <Card
                      key={context.id}
                      className={`cursor-pointer transition-colors ${
                        activeContext === context.id ? 'border-primary' : ''
                      }`}
                      onClick={() => setActiveContext(context.id)}
                    >
                      <CardHeader className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{context.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              {context.steps.length} steps
                            </p>
                          </div>
                          {context.isolated && (
                            <Badge variant="secondary" className="text-xs">
                              Isolated
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Active Context Editor */}
              {currentContext && (
                <div className="flex-1 overflow-y-auto">
                  <Tabs defaultValue="overview" className="h-full">
                    <TabsList>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="steps">Steps ({currentContext.steps.length})</TabsTrigger>
                      <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                      {/* Context Settings */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Context Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Label htmlFor="context-name">Context Name</Label>
                              <HelpTooltip content={helpContent.contexts.overview} />
                            </div>
                            <Input
                              id="context-name"
                              value={currentContext.name}
                              onChange={(e) => updateContext(currentContext.id, { name: e.target.value })}
                              placeholder="e.g., sales, support, manager"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <Label htmlFor="isolated">Isolated Context</Label>
                                <HelpTooltip content={helpContent.contexts.isolated} />
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Prevents access to functions from other contexts
                              </p>
                            </div>
                            <Switch
                              id="isolated"
                              checked={currentContext.isolated}
                              onCheckedChange={(checked) => 
                                updateContext(currentContext.id, { isolated: checked })
                              }
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Context Sections */}
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Context Prompt Sections</CardTitle>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addSection(currentContext.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Section
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {currentContext.sections.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No sections defined. Add sections to provide context-specific instructions.
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {currentContext.sections.map((section, idx) => (
                                <div key={idx} className="border rounded-lg p-4 space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-3">
                                      <Input
                                        value={section.title}
                                        onChange={(e) => updateSection(currentContext.id, idx, { title: e.target.value })}
                                        placeholder="Section Title"
                                        className="font-medium"
                                      />
                                      <Textarea
                                        value={section.content}
                                        onChange={(e) => updateSection(currentContext.id, idx, { content: e.target.value })}
                                        placeholder="Section content..."
                                        rows={3}
                                      />
                                      {section.bullets && section.bullets.length > 0 && (
                                        <div className="space-y-2">
                                          <Label className="text-sm">Bullet Points</Label>
                                          {section.bullets.map((bullet, bIdx) => (
                                            <div key={bIdx} className="flex items-center gap-2">
                                              <span className="text-muted-foreground">•</span>
                                              <Input
                                                value={bullet}
                                                onChange={(e) => {
                                                  const newBullets = [...section.bullets!]
                                                  newBullets[bIdx] = e.target.value
                                                  updateSection(currentContext.id, idx, { bullets: newBullets })
                                                }}
                                                placeholder="Bullet point..."
                                                className="flex-1"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => deleteSection(currentContext.id, idx)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const bullets = section.bullets || []
                                        updateSection(currentContext.id, idx, { 
                                          bullets: [...bullets, ''] 
                                        })
                                      }}
                                    >
                                      Add Bullet
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Delete Context */}
                      {localConfig.contexts.length > 1 && (
                        <div className="pt-4 border-t">
                          <Button
                            variant="destructive"
                            onClick={() => deleteContext(currentContext.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Context
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="steps" className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Workflow Steps</h3>
                        <Button
                          size="sm"
                          onClick={() => addStep(currentContext.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Step
                        </Button>
                      </div>

                      {currentContext.steps.length === 0 ? (
                        <Card>
                          <CardContent className="text-center py-8">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No steps defined. Add steps to create a sequential workflow.
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-4">
                          {currentContext.steps.map((step, stepIdx) => (
                            <Card key={step.id}>
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 flex-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => toggleStepExpansion(step.id)}
                                    >
                                      {expandedSteps.has(step.id) ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Badge variant="outline">Step {stepIdx + 1}</Badge>
                                    <Input
                                      value={step.name}
                                      onChange={(e) => updateStep(currentContext.id, step.id, { name: e.target.value })}
                                      placeholder="Step name..."
                                      className="max-w-xs"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => duplicateStep(currentContext.id, step.id)}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => deleteStep(currentContext.id, step.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>

                              <Collapsible open={expandedSteps.has(step.id)}>
                                <CollapsibleContent>
                                  <CardContent className="space-y-4">
                                    {/* Step Sections */}
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <Label>Step Sections</Label>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => addSection(currentContext.id, step.id)}
                                        >
                                          <Plus className="h-3 w-3 mr-1" />
                                          Add
                                        </Button>
                                      </div>
                                      {step.sections.map((section, sIdx) => (
                                        <div key={sIdx} className="border rounded p-3 space-y-2">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1 space-y-2">
                                              <Input
                                                value={section.title}
                                                onChange={(e) => updateSection(currentContext.id, sIdx, { title: e.target.value }, step.id)}
                                                placeholder="Section Title"
                                                className="text-sm"
                                              />
                                              <Textarea
                                                value={section.content}
                                                onChange={(e) => updateSection(currentContext.id, sIdx, { content: e.target.value }, step.id)}
                                                placeholder="Section content..."
                                                rows={2}
                                                className="text-sm"
                                              />
                                            </div>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-8 w-8"
                                              onClick={() => deleteSection(currentContext.id, sIdx, step.id)}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Step Criteria */}
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Label htmlFor={`criteria-${step.id}`}>Completion Criteria</Label>
                                        <HelpTooltip content={helpContent.contexts.criteria} />
                                      </div>
                                      <Textarea
                                        id={`criteria-${step.id}`}
                                        value={step.step_criteria || ''}
                                        onChange={(e) => updateStep(currentContext.id, step.id, { step_criteria: e.target.value })}
                                        placeholder="Describe what must be completed before moving to the next step..."
                                        rows={2}
                                      />
                                    </div>

                                    {/* Navigation Rules */}
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <Label>Valid Next Steps</Label>
                                          <HelpTooltip content={helpContent.contexts.validSteps} />
                                        </div>
                                        <Select
                                          value=""
                                          onValueChange={(value) => {
                                            if (value && !step.valid_steps.includes(value)) {
                                              updateStep(currentContext.id, step.id, {
                                                valid_steps: [...step.valid_steps, value]
                                              })
                                            }
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Add step..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {currentContext.steps
                                              .filter(s => s.id !== step.id && !step.valid_steps.includes(s.name))
                                              .map(s => (
                                                <SelectItem key={s.id} value={s.name}>
                                                  {s.name}
                                                </SelectItem>
                                              ))
                                            }
                                          </SelectContent>
                                        </Select>
                                        <div className="flex flex-wrap gap-1">
                                          {step.valid_steps.map((validStep) => (
                                            <Badge
                                              key={validStep}
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              {validStep}
                                              <button
                                                className="ml-1"
                                                onClick={() => updateStep(currentContext.id, step.id, {
                                                  valid_steps: step.valid_steps.filter(s => s !== validStep)
                                                })}
                                              >
                                                ×
                                              </button>
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <Label>Valid Contexts</Label>
                                          <HelpTooltip content={helpContent.contexts.validContexts} />
                                        </div>
                                        <Select
                                          value=""
                                          onValueChange={(value) => {
                                            if (value && !step.valid_contexts.includes(value)) {
                                              updateStep(currentContext.id, step.id, {
                                                valid_contexts: [...step.valid_contexts, value]
                                              })
                                            }
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Add context..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {localConfig.contexts
                                              .filter(c => c.id !== currentContext.id && !step.valid_contexts.includes(c.name))
                                              .map(c => (
                                                <SelectItem key={c.id} value={c.name}>
                                                  {c.name}
                                                </SelectItem>
                                              ))
                                            }
                                          </SelectContent>
                                        </Select>
                                        <div className="flex flex-wrap gap-1">
                                          {step.valid_contexts.map((validContext) => (
                                            <Badge
                                              key={validContext}
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              {validContext}
                                              <button
                                                className="ml-1"
                                                onClick={() => updateStep(currentContext.id, step.id, {
                                                  valid_contexts: step.valid_contexts.filter(c => c !== validContext)
                                                })}
                                              >
                                                ×
                                              </button>
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Function Restrictions */}
                                    {availableFunctions.length > 0 && (
                                      <div className="space-y-2">
                                        <Label>Restricted Functions</Label>
                                        <p className="text-xs text-muted-foreground">
                                          Limit which functions are available in this step
                                        </p>
                                        <Select
                                          value=""
                                          onValueChange={(value) => {
                                            const restrictions = step.restricted_functions || []
                                            if (value === 'none') {
                                              updateStep(currentContext.id, step.id, {
                                                restricted_functions: ['none']
                                              })
                                            } else if (value && !restrictions.includes(value)) {
                                              updateStep(currentContext.id, step.id, {
                                                restricted_functions: restrictions.filter(f => f !== 'none').concat(value)
                                              })
                                            }
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Add restriction..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">No functions allowed</SelectItem>
                                            {availableFunctions
                                              .filter(f => !step.restricted_functions?.includes(f))
                                              .map(f => (
                                                <SelectItem key={f} value={f}>
                                                  {f}
                                                </SelectItem>
                                              ))
                                            }
                                          </SelectContent>
                                        </Select>
                                        <div className="flex flex-wrap gap-1">
                                          {step.restricted_functions?.map((func) => (
                                            <Badge
                                              key={func}
                                              variant={func === 'none' ? 'destructive' : 'secondary'}
                                              className="text-xs"
                                            >
                                              {func}
                                              <button
                                                className="ml-1"
                                                onClick={() => updateStep(currentContext.id, step.id, {
                                                  restricted_functions: step.restricted_functions?.filter(f => f !== func)
                                                })}
                                              >
                                                ×
                                              </button>
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </CollapsibleContent>
                              </Collapsible>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-4">
                      {/* Enter Fillers */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Context Entry Fillers</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            Custom messages to play when entering this context
                          </p>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Language Code</Label>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="e.g., en-US"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      const lang = e.currentTarget.value
                                      if (lang) {
                                        updateContext(currentContext.id, {
                                          enter_filler: {
                                            ...currentContext.enter_filler,
                                            [lang]: []
                                          }
                                        })
                                        e.currentTarget.value = ''
                                      }
                                    }
                                  }}
                                />
                                <Button size="sm" variant="outline">Add Language</Button>
                              </div>
                            </div>
                            {currentContext.enter_filler && Object.entries(currentContext.enter_filler).map(([lang, fillers]) => (
                              <div key={lang} className="border rounded p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label>{lang}</Label>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      const newFillers = { ...currentContext.enter_filler }
                                      delete newFillers[lang]
                                      updateContext(currentContext.id, { enter_filler: newFillers })
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                                <Textarea
                                  value={fillers.join('\n')}
                                  onChange={(e) => {
                                    updateContext(currentContext.id, {
                                      enter_filler: {
                                        ...currentContext.enter_filler,
                                        [lang]: e.target.value.split('\n').filter(f => f.trim())
                                      }
                                    })
                                  }}
                                  placeholder="One filler message per line..."
                                  rows={3}
                                />
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
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