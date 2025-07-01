import { useState, useEffect } from 'react'
import { Plus, Trash2, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { helpContent } from '@/lib/helpContent'

export interface HintsConfig {
  simple_hints: string[]
  pattern_hints: Array<{
    hint: string
    pattern: string
    replace: string
    ignore_case: boolean
  }>
}

interface HintsConfigProps {
  open: boolean
  onClose: () => void
  config: HintsConfig
  onChange: (config: HintsConfig) => void
}

export function HintsConfig({ open, onClose, config, onChange }: HintsConfigProps) {
  const [localConfig, setLocalConfig] = useState<HintsConfig>(config)
  const [simpleHintsText, setSimpleHintsText] = useState(config.simple_hints.join('\n'))
  const [newPatternHint, setNewPatternHint] = useState({
    hint: '',
    pattern: '',
    replace: '',
    ignore_case: false
  })
  const [patternError, setPatternError] = useState('')

  useEffect(() => {
    setLocalConfig(config)
    setSimpleHintsText(config.simple_hints.join('\n'))
  }, [config])

  const handleSave = () => {
    // Parse simple hints from textarea
    const simpleHints = simpleHintsText
      .split('\n')
      .map(hint => hint.trim())
      .filter(hint => hint.length > 0)

    onChange({
      ...localConfig,
      simple_hints: simpleHints
    })
    onClose()
  }

  const validateRegex = (pattern: string): boolean => {
    try {
      new RegExp(pattern)
      setPatternError('')
      return true
    } catch (e) {
      setPatternError('Invalid regular expression')
      return false
    }
  }

  const addPatternHint = () => {
    if (!newPatternHint.hint || !newPatternHint.pattern || !newPatternHint.replace) {
      return
    }

    if (!validateRegex(newPatternHint.pattern)) {
      return
    }

    setLocalConfig({
      ...localConfig,
      pattern_hints: [...localConfig.pattern_hints, { ...newPatternHint }]
    })

    // Reset form
    setNewPatternHint({
      hint: '',
      pattern: '',
      replace: '',
      ignore_case: false
    })
  }

  const removePatternHint = (index: number) => {
    setLocalConfig({
      ...localConfig,
      pattern_hints: localConfig.pattern_hints.filter((_, i) => i !== index)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hints Configuration</DialogTitle>
          <DialogDescription>
            Configure hints to help the AI understand specific words, phrases, or patterns better
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="simple" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simple">Simple Hints</TabsTrigger>
            <TabsTrigger value="pattern">Pattern Hints</TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Add one hint per line. These help the AI understand specific terms, acronyms, or phrases.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="simple-hints">Simple Hints</Label>
                <HelpTooltip content={helpContent.hints.simple} />
              </div>
              <Textarea
                id="simple-hints"
                value={simpleHintsText}
                onChange={(e) => setSimpleHintsText(e.target.value)}
                placeholder="ACME Corporation is our company name&#10;SKU means Stock Keeping Unit&#10;Our support hours are 9 AM to 5 PM EST"
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Enter one hint per line. Each hint should be a complete statement.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="pattern" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Pattern hints use regular expressions to help the AI recognize formatted data like order numbers, product codes, etc.
              </AlertDescription>
            </Alert>

            {/* Add new pattern hint form */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Add Pattern Hint</CardTitle>
                  <HelpTooltip content={helpContent.hints.pattern} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="hint">Hint Description</Label>
                    <Input
                      id="hint"
                      value={newPatternHint.hint}
                      onChange={(e) => setNewPatternHint({ ...newPatternHint, hint: e.target.value })}
                      placeholder="e.g., order number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="replace">Replace With</Label>
                    <Input
                      id="replace"
                      value={newPatternHint.replace}
                      onChange={(e) => setNewPatternHint({ ...newPatternHint, replace: e.target.value })}
                      placeholder="e.g., order identifier"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pattern">Pattern (Regular Expression)</Label>
                  <Input
                    id="pattern"
                    value={newPatternHint.pattern}
                    onChange={(e) => {
                      setNewPatternHint({ ...newPatternHint, pattern: e.target.value })
                      if (e.target.value) validateRegex(e.target.value)
                    }}
                    placeholder="e.g., ORD-\d{6}"
                    className="font-mono"
                  />
                  {patternError && (
                    <p className="text-sm text-destructive">{patternError}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ignore-case"
                    checked={newPatternHint.ignore_case}
                    onCheckedChange={(checked) => 
                      setNewPatternHint({ ...newPatternHint, ignore_case: checked as boolean })
                    }
                  />
                  <Label htmlFor="ignore-case" className="text-sm font-normal">
                    Ignore case
                  </Label>
                </div>
                <Button
                  onClick={addPatternHint}
                  disabled={!newPatternHint.hint || !newPatternHint.pattern || !newPatternHint.replace || !!patternError}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pattern Hint
                </Button>
              </CardContent>
            </Card>

            {/* Existing pattern hints */}
            {localConfig.pattern_hints.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Configured Pattern Hints</h4>
                <div className="space-y-2">
                  {localConfig.pattern_hints.map((hint, index) => (
                    <Card key={index}>
                      <CardContent className="flex items-center justify-between py-3">
                        <div className="space-y-1">
                          <p className="font-medium">{hint.hint} → {hint.replace}</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            Pattern: {hint.pattern}
                            {hint.ignore_case && ' (case insensitive)'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePatternHint(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Hints
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}