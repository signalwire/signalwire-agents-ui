import { useState, useEffect } from 'react'
import { Plus, Trash2, Info, Code } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

type DataType = 'string' | 'number' | 'boolean' | 'json'

interface GlobalDataEntry {
  key: string
  value: any
  type: DataType
}

interface GlobalDataConfigProps {
  open: boolean
  onClose: () => void
  globalData: Record<string, any>
  onChange: (data: Record<string, any>) => void
}

export function GlobalDataConfig({ open, onClose, globalData, onChange }: GlobalDataConfigProps) {
  const [entries, setEntries] = useState<GlobalDataEntry[]>(() => {
    // Convert existing data to entries
    return Object.entries(globalData).map(([key, value]) => ({
      key,
      value,
      type: detectType(value)
    }))
  })

  const [newEntry, setNewEntry] = useState<GlobalDataEntry>({
    key: '',
    value: '',
    type: 'string'
  })

  const [jsonMode, setJsonMode] = useState(false)
  const [jsonText, setJsonText] = useState(JSON.stringify(globalData, null, 2))
  const [jsonError, setJsonError] = useState('')

  useEffect(() => {
    setEntries(Object.entries(globalData).map(([key, value]) => ({
      key,
      value,
      type: detectType(value)
    })))
    setJsonText(JSON.stringify(globalData, null, 2))
  }, [globalData])

  function detectType(value: any): DataType {
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'number') return 'number'
    if (typeof value === 'object') return 'json'
    return 'string'
  }

  const handleSave = () => {
    if (jsonMode) {
      try {
        const parsed = JSON.parse(jsonText)
        onChange(parsed)
        onClose()
      } catch (e) {
        setJsonError('Invalid JSON')
      }
    } else {
      // Convert entries back to object
      const data: Record<string, any> = {}
      entries.forEach(entry => {
        data[entry.key] = entry.value
      })
      onChange(data)
      onClose()
    }
  }

  const addEntry = () => {
    if (!newEntry.key) return

    let value = newEntry.value
    
    // Convert value based on type
    if (newEntry.type === 'number') {
      value = Number(newEntry.value)
      if (isNaN(value)) return
    } else if (newEntry.type === 'boolean') {
      value = newEntry.value === 'true'
    } else if (newEntry.type === 'json') {
      try {
        value = JSON.parse(newEntry.value)
      } catch (e) {
        return
      }
    }

    setEntries([...entries, { ...newEntry, value }])
    setNewEntry({ key: '', value: '', type: 'string' })
  }

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index))
  }

  const updateEntryValue = (index: number, value: any) => {
    const updated = [...entries]
    updated[index].value = value
    setEntries(updated)
  }

  const renderValueInput = (entry: GlobalDataEntry, index: number) => {
    switch (entry.type) {
      case 'boolean':
        return (
          <Switch
            checked={entry.value}
            onCheckedChange={(checked) => updateEntryValue(index, checked)}
          />
        )
      case 'json':
        return (
          <Textarea
            value={JSON.stringify(entry.value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                updateEntryValue(index, parsed)
              } catch (e) {
                // Invalid JSON, don't update
              }
            }}
            className="font-mono text-sm"
            rows={3}
          />
        )
      default:
        return (
          <Input
            value={entry.value}
            onChange={(e) => {
              const val = entry.type === 'number' ? Number(e.target.value) : e.target.value
              updateEntryValue(index, val)
            }}
            type={entry.type === 'number' ? 'number' : 'text'}
          />
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Global Data Configuration</DialogTitle>
          <DialogDescription>
            Set persistent data that's available to the AI throughout the conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Global data provides context that persists throughout the entire conversation. 
              Use it for company info, business rules, or any data the AI should always have access to.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setJsonMode(!jsonMode)
                if (!jsonMode) {
                  // Convert entries to JSON
                  const data: Record<string, any> = {}
                  entries.forEach(entry => {
                    data[entry.key] = entry.value
                  })
                  setJsonText(JSON.stringify(data, null, 2))
                } else {
                  // Convert JSON to entries
                  try {
                    const parsed = JSON.parse(jsonText)
                    const newEntries = Object.entries(parsed).map(([key, value]) => ({
                      key,
                      value,
                      type: detectType(value)
                    }))
                    setEntries(newEntries)
                    setJsonError('')
                  } catch (e) {
                    setJsonError('Invalid JSON')
                  }
                }
              }}
            >
              <Code className="h-4 w-4 mr-2" />
              {jsonMode ? 'Switch to Form' : 'Edit as JSON'}
            </Button>
          </div>

          {jsonMode ? (
            <div className="space-y-2">
              <Label>JSON Data</Label>
              <Textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value)
                  setJsonError('')
                }}
                className="font-mono text-sm"
                rows={15}
              />
              {jsonError && (
                <p className="text-sm text-destructive">{jsonError}</p>
              )}
            </div>
          ) : (
            <>
              {/* Add new entry form */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="key">Key</Label>
                      <Input
                        id="key"
                        value={newEntry.key}
                        onChange={(e) => setNewEntry({ ...newEntry, key: e.target.value })}
                        placeholder="e.g., company_name"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="value">Value</Label>
                      {newEntry.type === 'boolean' ? (
                        <Select
                          value={newEntry.value}
                          onValueChange={(value) => setNewEntry({ ...newEntry, value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select value" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">true</SelectItem>
                            <SelectItem value="false">false</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="value"
                          value={newEntry.value}
                          onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
                          placeholder={
                            newEntry.type === 'number' ? '123' :
                            newEntry.type === 'json' ? '{"key": "value"}' :
                            'Enter value'
                          }
                          type={newEntry.type === 'number' ? 'number' : 'text'}
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={newEntry.type}
                        onValueChange={(value: DataType) => 
                          setNewEntry({ ...newEntry, type: value, value: '' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    onClick={addEntry}
                    disabled={!newEntry.key}
                    size="sm"
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                  </Button>
                </CardContent>
              </Card>

              {/* Existing entries */}
              {entries.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Configured Data</h4>
                  <div className="space-y-2">
                    {entries.map((entry, index) => (
                      <Card key={index}>
                        <CardContent className="py-3">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 grid gap-4 sm:grid-cols-2">
                              <div>
                                <Label className="text-xs">Key</Label>
                                <p className="font-medium">{entry.key}</p>
                              </div>
                              <div className="flex-1">
                                <Label className="text-xs">Value ({entry.type})</Label>
                                {renderValueInput(entry, index)}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeEntry(index)}
                              className="mt-6"
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
            </>
          )}

          {/* Example data */}
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">Common Examples</h4>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div>• company_name: "ACME Corporation"</div>
              <div>• support_hours: "9 AM - 5 PM EST"</div>
              <div>• emergency_number: "1-800-HELP"</div>
              <div>• pricing_tiers: {"{ basic: 10, pro: 25, enterprise: 100 }"}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Global Data
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}