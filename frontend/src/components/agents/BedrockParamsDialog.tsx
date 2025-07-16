import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'

interface BedrockParamsDialogProps {
  open: boolean
  onClose: () => void
  params: Record<string, any>
  onChange: (params: Record<string, any>) => void
}

export function BedrockParamsDialog({ open, onClose, params, onChange }: BedrockParamsDialogProps) {
  const [localParams, setLocalParams] = useState<Record<string, any>>(params)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  // Sync local state with props when dialog opens
  useEffect(() => {
    if (open) {
      setLocalParams(params)
    }
  }, [open, params])

  const handleAdd = () => {
    if (newKey.trim()) {
      setLocalParams({
        ...localParams,
        [newKey]: newValue
      })
      setNewKey('')
      setNewValue('')
    }
  }

  const handleDelete = (key: string) => {
    const newParams = { ...localParams }
    delete newParams[key]
    setLocalParams(newParams)
  }

  const handleValueChange = (key: string, value: string) => {
    setLocalParams({
      ...localParams,
      [key]: value
    })
  }

  const handleSave = () => {
    onChange(localParams)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI Parameters</DialogTitle>
          <DialogDescription>
            Configure custom parameters for your Bedrock agent
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Existing parameters */}
          {Object.keys(localParams).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(localParams).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      value={key}
                      disabled
                      className="font-mono text-sm"
                    />
                    <Input
                      value={String(value)}
                      onChange={(e) => handleValueChange(key, e.target.value)}
                      placeholder="Value"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(key)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No parameters configured yet. Add custom parameters below.
            </p>
          )}

          {/* Add new parameter */}
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium mb-2 block">Add Parameter</Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Parameter name"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                className="font-mono text-sm"
              />
              <Input
                placeholder="Value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleAdd}
                disabled={!newKey.trim()}
              >
                <Plus className="w-4 h-4" />
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