import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription } from '@/components/ui/card'
import { Bot, Cloud } from 'lucide-react'

interface AgentTypeSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function AgentTypeSelector({ value, onChange, disabled }: AgentTypeSelectorProps) {
  return (
    <RadioGroup value={value} onValueChange={onChange} disabled={disabled}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={`cursor-pointer ${value === 'regular' ? 'ring-2 ring-primary' : ''}`}>
          <CardContent className="p-6">
            <RadioGroupItem 
              value="regular" 
              id="regular-agent" 
              className="sr-only"
            />
            <Label 
              htmlFor="regular-agent" 
              className="flex flex-col items-center space-y-3 cursor-pointer"
            >
              <Bot className="w-12 h-12 text-primary" />
              <div className="text-center">
                <p className="font-semibold">SignalWire Native Agent</p>
                <CardDescription className="mt-2">
                  Full-featured AI agent with customizable LLM, languages, hints, and pronunciations
                </CardDescription>
              </div>
            </Label>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer ${value === 'bedrock' ? 'ring-2 ring-primary' : ''}`}>
          <CardContent className="p-6">
            <RadioGroupItem 
              value="bedrock" 
              id="bedrock-agent" 
              className="sr-only"
            />
            <Label 
              htmlFor="bedrock-agent" 
              className="flex flex-col items-center space-y-3 cursor-pointer"
            >
              <Cloud className="w-12 h-12 text-primary" />
              <div className="text-center">
                <p className="font-semibold">Amazon Bedrock Agent</p>
                <CardDescription className="mt-2">
                  Voice-to-voice AI agent powered by Amazon Bedrock with native voice handling
                </CardDescription>
              </div>
            </Label>
          </CardContent>
        </Card>
      </div>
    </RadioGroup>
  )
}