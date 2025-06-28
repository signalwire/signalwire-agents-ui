import { useState } from 'react'
import { Plus, Trash2, Info, Volume2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'

export interface PronunciationRule {
  replace: string
  with: string
  ignore_case: boolean
}

interface PronunciationsConfigProps {
  open: boolean
  onClose: () => void
  pronunciations: PronunciationRule[]
  onChange: (pronunciations: PronunciationRule[]) => void
}

export function PronunciationsConfig({ open, onClose, pronunciations, onChange }: PronunciationsConfigProps) {
  const [localPronunciations, setLocalPronunciations] = useState<PronunciationRule[]>(pronunciations)
  const [newRule, setNewRule] = useState<PronunciationRule>({
    replace: '',
    with: '',
    ignore_case: false
  })

  const handleSave = () => {
    onChange(localPronunciations)
    onClose()
  }

  const addPronunciation = () => {
    if (!newRule.replace || !newRule.with) {
      return
    }

    setLocalPronunciations([...localPronunciations, { ...newRule }])
    
    // Reset form
    setNewRule({
      replace: '',
      with: '',
      ignore_case: false
    })
  }

  const removePronunciation = (index: number) => {
    setLocalPronunciations(localPronunciations.filter((_, i) => i !== index))
  }

  const testPronunciation = (text: string) => {
    // TODO: Implement pronunciation preview using TTS
    // This would require integration with the TTS engine
    console.log('Test pronunciation:', text)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pronunciation Configuration</DialogTitle>
          <DialogDescription>
            Configure custom pronunciations to help the AI speak certain words correctly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Use phonetic spelling or break words into syllables. For example: "SQL" → "sequel" or "CEO" → "C E O"
            </AlertDescription>
          </Alert>

          {/* Add new pronunciation form */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="replace">Word/Phrase</Label>
                  <Input
                    id="replace"
                    value={newRule.replace}
                    onChange={(e) => setNewRule({ ...newRule, replace: e.target.value })}
                    placeholder="e.g., SQL, ACME, CEO"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="with">Pronunciation</Label>
                  <Input
                    id="with"
                    value={newRule.with}
                    onChange={(e) => setNewRule({ ...newRule, with: e.target.value })}
                    placeholder="e.g., sequel, ack-me, C E O"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ignore-case-new"
                    checked={newRule.ignore_case}
                    onCheckedChange={(checked) => 
                      setNewRule({ ...newRule, ignore_case: checked as boolean })
                    }
                  />
                  <Label htmlFor="ignore-case-new" className="text-sm font-normal">
                    Ignore case
                  </Label>
                </div>
                <Button
                  onClick={addPronunciation}
                  disabled={!newRule.replace || !newRule.with}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pronunciation
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Existing pronunciations */}
          {localPronunciations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Configured Pronunciations</h4>
              <div className="space-y-2">
                {localPronunciations.map((rule, index) => (
                  <Card key={index}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex-1">
                        <p className="font-medium">
                          {rule.replace} → {rule.with}
                          {rule.ignore_case && (
                            <span className="text-sm text-muted-foreground ml-2">(case insensitive)</span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => testPronunciation(rule.with)}
                          title="Test pronunciation (coming soon)"
                          disabled
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePronunciation(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Common examples */}
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">Common Examples</h4>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div>• Acronyms: SQL → "sequel", API → "A P I", GUI → "gooey"</div>
              <div>• Company names: ACME → "ack-me", Xerox → "zee-rocks"</div>
              <div>• Technical terms: kubectl → "cube control", nginx → "engine X"</div>
              <div>• Names: Nguyen → "win", Siobhan → "shi-vawn"</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Pronunciations
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}