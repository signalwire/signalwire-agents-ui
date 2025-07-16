import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Settings } from 'lucide-react'

interface BedrockGenericParamsProps {
  params: Record<string, any>
  onChange: (params: Record<string, any>) => void
}

export function BedrockGenericParams({ params, onChange }: BedrockGenericParamsProps) {
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const handleAdd = () => {
    if (newKey.trim()) {
      onChange({
        ...params,
        [newKey]: newValue
      })
      setNewKey('')
      setNewValue('')
    }
  }

  const handleDelete = (key: string) => {
    const newParams = { ...params }
    delete newParams[key]
    onChange(newParams)
  }

  const handleValueChange = (key: string, value: string) => {
    onChange({
      ...params,
      [key]: value
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Bedrock Parameters
        </CardTitle>
        <CardDescription>
          Configure custom parameters for your Bedrock agent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing parameters */}
        {Object.entries(params).map(([key, value]) => (
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
      </CardContent>
    </Card>
  )
}