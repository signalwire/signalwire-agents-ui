import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Volume2 } from 'lucide-react'

interface BedrockVoice {
  id: string
  name: string
  language: string
  gender: string
}

// Bedrock voice options provided by the user
const BEDROCK_VOICES: BedrockVoice[] = [
  { id: 'tiffany', name: 'Tiffany', language: 'English (US)', gender: 'feminine' },
  { id: 'matthew', name: 'Matthew', language: 'English (US)', gender: 'masculine' },
  { id: 'amy', name: 'Amy', language: 'English (UK)', gender: 'feminine' },
  { id: 'lupe', name: 'Lupe', language: 'Spanish (LatAm)', gender: 'feminine' },
  { id: 'carlos', name: 'Carlos', language: 'Spanish (LatAm)', gender: 'masculine' },
]

interface BedrockVoiceSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function BedrockVoiceSelector({ value, onChange }: BedrockVoiceSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Bedrock Voice
        </CardTitle>
        <CardDescription>
          Select a voice model for your Bedrock agent
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={value} onValueChange={onChange}>
          <div className="space-y-3">
            {BEDROCK_VOICES.map((voice) => (
              <div key={voice.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value={voice.id} id={voice.id} />
                <Label
                  htmlFor={voice.id}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{voice.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {voice.language} • {voice.gender}
                      </p>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">
                      {voice.id}
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  )
}