import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { BedrockVoiceSelector } from './BedrockVoiceSelector'
import { HelpTooltip } from '@/components/ui/help-tooltip'

interface BedrockParamsCardProps {
  voiceId: string
  temperature: number
  topP: number
  maxTokens: number
  onVoiceChange: (value: string) => void
  onTemperatureChange: (value: number) => void
  onTopPChange: (value: number) => void
  onMaxTokensChange: (value: number) => void
}

export function BedrockParamsCard({
  voiceId,
  temperature,
  topP,
  maxTokens,
  onVoiceChange,
  onTemperatureChange,
  onTopPChange,
  onMaxTokensChange,
}: BedrockParamsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bedrock Configuration</CardTitle>
        <CardDescription>
          Configure Amazon Bedrock voice-to-voice model parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Voice Selection */}
        <BedrockVoiceSelector value={voiceId} onChange={onVoiceChange} />

        {/* Temperature */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="temperature">
              Temperature
              <HelpTooltip content="Controls randomness in responses. Lower values make the AI more focused and deterministic, higher values make it more creative." />
            </Label>
            <span className="text-sm text-muted-foreground">{temperature}</span>
          </div>
          <Slider
            id="temperature"
            value={[temperature]}
            onValueChange={([value]) => onTemperatureChange(value)}
            max={1}
            min={0}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Top P */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="top-p">
              Top P
              <HelpTooltip content="Controls diversity via nucleus sampling. Lower values make the AI more focused, higher values allow more diverse responses." />
            </Label>
            <span className="text-sm text-muted-foreground">{topP}</span>
          </div>
          <Slider
            id="top-p"
            value={[topP]}
            onValueChange={([value]) => onTopPChange(value)}
            max={1}
            min={0}
            step={0.05}
            className="w-full"
          />
        </div>

        {/* Max Tokens */}
        <div className="space-y-2">
          <Label htmlFor="max-tokens">
            Max Tokens
            <HelpTooltip content="Maximum number of tokens the AI can generate in a response." />
          </Label>
          <Input
            id="max-tokens"
            type="number"
            value={maxTokens}
            onChange={(e) => onMaxTokensChange(parseInt(e.target.value) || 1024)}
            min={1}
            max={4096}
          />
        </div>

        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Amazon Bedrock agents use a fixed voice-to-voice model. 
            Language configuration, hints, and pronunciations are handled natively by the voice model 
            and are not configurable separately.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}