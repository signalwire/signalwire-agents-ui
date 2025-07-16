import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { pollyVoicesApi } from '@/api/pollyVoices'
import { useQuery } from '@tanstack/react-query'

interface AmazonVoiceSelectorProps {
  languageCode: string
  voice: string
  engine?: string
  onVoiceChange: (voice: string) => void
  onEngineChange: (engine: string) => void
}

export function AmazonVoiceSelector({ 
  languageCode, 
  voice, 
  engine = 'neural',
  onVoiceChange, 
  onEngineChange 
}: AmazonVoiceSelectorProps) {
  const [selectedEngine, setSelectedEngine] = useState(engine)
  const [availableEngines, setAvailableEngines] = useState<string[]>([])

  // Fetch all voices for the language
  const { data: voices = [], isLoading } = useQuery({
    queryKey: ['polly-voices', languageCode],
    queryFn: () => pollyVoicesApi.getVoicesByLanguage(languageCode),
    enabled: !!languageCode
  })

  // Filter voices by selected engine
  const filteredVoices = voices.filter(v => 
    v.SupportedEngines.includes(selectedEngine)
  )

  // Get unique engines from voices for this language
  useEffect(() => {
    if (voices.length > 0) {
      const engines = new Set<string>()
      voices.forEach(v => {
        v.SupportedEngines.forEach(e => engines.add(e))
      })
      const sortedEngines = Array.from(engines).sort((a, b) => {
        // Prioritize neural, then standard, then others
        const priority: Record<string, number> = { neural: 0, standard: 1 }
        return (priority[a] ?? 99) - (priority[b] ?? 99)
      })
      setAvailableEngines(sortedEngines)
      
      // If current engine isn't available, switch to first available
      if (!sortedEngines.includes(selectedEngine) && sortedEngines.length > 0) {
        setSelectedEngine(sortedEngines[0])
        onEngineChange(sortedEngines[0])
      }
    }
  }, [voices, selectedEngine, onEngineChange])

  // Parse voice string to extract engine and voice ID
  const parseVoice = (voiceStr: string): { engine: string, voiceId: string } => {
    if (voiceStr && voiceStr.startsWith('amazon.')) {
      const parts = voiceStr.split('.')
      if (parts.length >= 3) {
        return { engine: parts[1], voiceId: parts[2] }
      }
    }
    return { engine: selectedEngine, voiceId: voiceStr }
  }

  const { voiceId } = parseVoice(voice)

  const handleEngineChange = (newEngine: string) => {
    setSelectedEngine(newEngine)
    onEngineChange(newEngine)
    
    // Check if current voice supports new engine
    const currentVoice = voices.find(v => v.Id === voiceId)
    if (currentVoice && !currentVoice.SupportedEngines.includes(newEngine)) {
      // Find first voice that supports new engine
      const newVoice = voices.find(v => v.SupportedEngines.includes(newEngine))
      if (newVoice) {
        onVoiceChange(`amazon.${newEngine}.${newVoice.Id}`)
      }
    } else if (voiceId) {
      // Update voice string with new engine
      onVoiceChange(`amazon.${newEngine}.${voiceId}`)
    }
  }

  const handleVoiceChange = (voiceId: string) => {
    onVoiceChange(`amazon.${selectedEngine}.${voiceId}`)
  }

  return (
    <div className="space-y-4">
      {/* Engine Selection */}
      <div className="space-y-2">
        <Label>Amazon Engine</Label>
        <Select
          value={selectedEngine}
          onValueChange={handleEngineChange}
          disabled={availableEngines.length <= 1}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableEngines.map(eng => (
              <SelectItem key={eng} value={eng}>
                {eng.charAt(0).toUpperCase() + eng.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {availableEngines.length <= 1 && (
          <p className="text-xs text-muted-foreground">
            Only {selectedEngine} engine available for this language
          </p>
        )}
      </div>

      {/* Voice Selection */}
      <div className="space-y-2">
        <Label>Voice</Label>
        <Select
          value={voiceId}
          onValueChange={handleVoiceChange}
          disabled={isLoading || filteredVoices.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? "Loading voices..." : "Select a voice"} />
          </SelectTrigger>
          <SelectContent>
            {filteredVoices.map(voice => (
              <SelectItem key={voice.Id} value={voice.Id}>
                {voice.Name} ({voice.Gender})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isLoading && filteredVoices.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No voices available for {selectedEngine} engine
          </p>
        )}
      </div>
    </div>
  )
}