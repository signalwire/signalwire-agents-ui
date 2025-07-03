import { useState } from 'react'
import { ChevronDown, ChevronUp, Brain, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'

interface LLMParams {
  temperature?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  barge_confidence?: number
}

interface LLMParamsCardProps {
  promptParams: LLMParams
  postPromptParams: LLMParams
  onPromptParamsChange: (params: LLMParams) => void
  onPostPromptParamsChange: (params: LLMParams) => void
}

interface ParamControlProps {
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  min: number
  max: number
  step: number
  description?: string
  type?: 'slider' | 'number'
  defaultValue?: number
}

function ParamControl({ label, value, onChange, min, max, step, description, type = 'slider', defaultValue }: ParamControlProps) {
  const handleSliderChange = (values: number[]) => {
    const rawValue = values[0]
    
    // Snap to nearest step value
    const snappedValue = Math.round(rawValue / step) * step
    
    // Ensure proper decimal precision
    let finalValue: number
    if (step === 0.1) {
      finalValue = Math.round(snappedValue * 10) / 10
    } else if (step === 0.01) {
      finalValue = Math.round(snappedValue * 100) / 100
    } else {
      finalValue = snappedValue
    }
    
    onChange(finalValue)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val === '') {
      onChange(undefined)
    } else {
      const num = Number(val)
      if (!isNaN(num)) {
        onChange(num)
      }
    }
  }

  // Use the provided default value or fall back to min
  const effectiveDefault = defaultValue !== undefined ? defaultValue : min
  const displayValue = value !== undefined ? value : effectiveDefault

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {type === 'slider' && (
          <Input
            type="number"
            value={displayValue}
            onChange={handleInputChange}
            min={min}
            max={max}
            step={step}
            className="w-16 h-8 text-right text-sm"
          />
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {type === 'slider' ? (
        <Slider
          value={[displayValue]}
          onValueChange={handleSliderChange}
          min={min}
          max={max}
          step={step}
          className="w-full"
        />
      ) : (
        <Input
          type="number"
          value={value !== undefined ? value : ''}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          placeholder={`Default: ${effectiveDefault}`}
          className="w-full"
        />
      )}
    </div>
  )
}

function LLMParamsSection({ 
  title, 
  params, 
  onChange,
  icon,
  defaultOpen = true,
  isPostPrompt = false
}: { 
  title: string
  params: LLMParams
  onChange: (params: LLMParams) => void
  icon: React.ReactNode
  defaultOpen?: boolean
  isPostPrompt?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const updateParam = (key: keyof LLMParams, value: number | undefined) => {
    if (value === undefined) {
      // Remove the parameter if undefined
      const newParams = { ...params }
      delete newParams[key]
      onChange(newParams)
    } else {
      onChange({ ...params, [key]: value })
    }
  }

  // Define defaults based on llm_params.md
  const defaults = isPostPrompt ? {
    temperature: 0.0,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0
  } : {
    temperature: 0.3,
    top_p: 1.0,
    frequency_penalty: 0.1,
    presence_penalty: 0.1,
    barge_confidence: 0.0
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between p-4 hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium">{title}</span>
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 pt-2 space-y-4">
        <ParamControl
          label="Temperature"
          value={params.temperature}
          onChange={(value) => updateParam('temperature', value)}
          min={0}
          max={2}
          step={0.1}
          defaultValue={defaults.temperature}
          description="Controls randomness. Lower = more focused, higher = more creative"
        />
        
        <ParamControl
          label="Top P"
          value={params.top_p}
          onChange={(value) => updateParam('top_p', value)}
          min={0}
          max={1}
          step={0.01}
          defaultValue={defaults.top_p}
          description="Alternative to temperature, controls diversity via nucleus sampling"
        />
        
        <ParamControl
          label="Frequency Penalty"
          value={params.frequency_penalty}
          onChange={(value) => updateParam('frequency_penalty', value)}
          min={-2}
          max={2}
          step={0.1}
          defaultValue={defaults.frequency_penalty}
          description="Reduces repetition of token sequences"
        />
        
        <ParamControl
          label="Presence Penalty"
          value={params.presence_penalty}
          onChange={(value) => updateParam('presence_penalty', value)}
          min={-2}
          max={2}
          step={0.1}
          defaultValue={defaults.presence_penalty}
          description="Encourages talking about new topics"
        />
        
        {!isPostPrompt && (
          <ParamControl
            label="Barge Confidence"
            value={params.barge_confidence}
            onChange={(value) => updateParam('barge_confidence', value)}
            min={0}
            max={1}
            step={0.1}
            defaultValue={defaults.barge_confidence || 0}
            description="Confidence threshold for interruption detection"
          />
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function LLMParamsCard({
  promptParams,
  postPromptParams,
  onPromptParamsChange,
  onPostPromptParamsChange
}: LLMParamsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM Parameters</CardTitle>
        <CardDescription>
          Configure language model behavior for prompts and post-prompts
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 space-y-1">
        <LLMParamsSection
          title="Prompt LLM Parameters"
          params={promptParams}
          onChange={onPromptParamsChange}
          icon={<Brain className="h-4 w-4" />}
          defaultOpen={true}
          isPostPrompt={false}
        />
        
        <div className="border-t" />
        
        <LLMParamsSection
          title="Post-Prompt LLM Parameters"
          params={postPromptParams}
          onChange={onPostPromptParamsChange}
          icon={<MessageSquare className="h-4 w-4" />}
          defaultOpen={false}
          isPostPrompt={true}
        />
      </CardContent>
    </Card>
  )
}