import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronUp, Globe, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { LANGUAGE_PRESETS, ELEVENLABS_VOICE_MAP, getRimeVoices } from '@/lib/languagePresets'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { helpContent } from '@/lib/helpContent'
import { AmazonVoiceSelector } from '@/components/agents/AmazonVoiceSelector'

interface LanguageConfig {
  id: string
  name: string  // Language name (e.g., "English", "Spanish")
  code: string  // Language code (e.g., "en-US", "es-MX")
  voice: string
  engine: string
  model?: string
}

interface LanguagesConfigProps {
  languages: LanguageConfig[]
  onChange: (languages: LanguageConfig[]) => void
  languageConfigs: any[]
}

export function LanguagesConfig({ languages, onChange, languageConfigs }: LanguagesConfigProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedLanguages, setExpandedLanguages] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedLanguages)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedLanguages(newExpanded)
  }

  const addLanguage = () => {
    const newLanguage: LanguageConfig = {
      id: `lang-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: 'English',
      code: 'en-US',
      voice: 'adam',
      engine: 'elevenlabs'
    }
    onChange([...languages, newLanguage])
    setExpandedLanguages(new Set([...expandedLanguages, newLanguage.id]))
  }

  const updateLanguage = (id: string, updates: Partial<LanguageConfig>) => {
    onChange(languages.map(lang => 
      lang.id === id ? { ...lang, ...updates } : lang
    ))
  }

  const removeLanguage = (id: string) => {
    onChange(languages.filter(lang => lang.id !== id))
    const newExpanded = new Set(expandedLanguages)
    newExpanded.delete(id)
    setExpandedLanguages(newExpanded)
  }

  const getAllConfigs = () => {
    const presetConfigs = LANGUAGE_PRESETS.map(preset => ({
      id: preset.id,
      displayName: preset.displayName,
      properName: preset.properName,
      code: preset.code,
      engine: preset.engine,
      model: preset.model,
      voice: preset.suggestedVoices[0] || ''
    }))
    
    const customConfigs = languageConfigs || []
    
    return [...presetConfigs, ...customConfigs]
  }

  const applyPreset = (langId: string, presetId: string) => {
    const preset = getAllConfigs().find(c => c.id === presetId)
    if (preset) {
      updateLanguage(langId, {
        name: preset.properName,
        code: preset.code,
        engine: preset.engine,
        model: preset.model,
        voice: preset.voice
      })
    }
  }

  // Get language name from code
  const getLanguageName = (code: string): string => {
    const langNames: Record<string, string> = {
      'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
      'pt': 'Portuguese', 'it': 'Italian', 'ja': 'Japanese', 'ko': 'Korean',
      'zh': 'Chinese', 'ru': 'Russian', 'hi': 'Hindi', 'nl': 'Dutch',
      'multi': 'Multilingual'
    }
    const baseLang = code.split('-')[0]
    return langNames[baseLang] || 'Custom'
  }

  // Get unique language codes from all configurations
  const getAvailableLanguageCodes = () => {
    const codes = new Map<string, string>()
    
    // Add multilingual as first option
    codes.set('multi', 'Multilingual (Auto-detect)')
    
    // Add codes from all configs
    getAllConfigs().forEach(config => {
      if (config.code && config.code !== 'multi') {
        codes.set(config.code, config.properName || getLanguageName(config.code))
      }
    })
    
    // Sort by name, keeping multi first
    const sortedCodes = Array.from(codes.entries()).sort((a, b) => {
      if (a[0] === 'multi') return -1
      if (b[0] === 'multi') return 1
      return a[1].localeCompare(b[1])
    })
    
    return sortedCodes
  }

  // Generate summary for collapsed state
  const getSummary = () => {
    if (languages.length === 0) {
      return 'No languages configured'
    }
    if (languages.length === 1) {
      const lang = languages[0]
      return `${lang.name} (${lang.code}) - ${lang.engine}`
    }
    return `${languages.length} languages configured`
  }

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-heading-secondary">
                  <Globe className="h-5 w-5" />
                  Languages
                </CardTitle>
                <CardDescription>
                  {isExpanded ? 'Configure multiple languages and voices for your agent' : getSummary()}
                </CardDescription>
              </div>
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
        {languages.map((language, index) => (
          <Card key={language.id}>
            <Collapsible
              open={expandedLanguages.has(language.id)}
              onOpenChange={() => toggleExpanded(language.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {expandedLanguages.has(language.id) ? (
                          <ChevronUp className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span className="font-medium truncate">
                          Language {index + 1}: {language.name}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 ml-6">
                        <Badge variant="secondary" className="text-xs">{language.code}</Badge>
                        <Badge variant="outline" className="text-xs">{language.engine}</Badge>
                        {language.voice && (
                          <Badge variant="outline" className="text-xs truncate max-w-[150px]">
                            {(() => {
                              // For ElevenLabs, try to resolve the voice ID to a name
                              if (language.engine === 'elevenlabs') {
                                const matchingVoice = Object.values(ELEVENLABS_VOICE_MAP).find(v => v.id === language.voice)
                                return matchingVoice ? matchingVoice.name : language.voice
                              }
                              // For Amazon, extract the voice name from the format
                              if (language.engine === 'amazon' && language.voice.startsWith('amazon.')) {
                                const parts = language.voice.split('.')
                                return parts[2] || language.voice
                              }
                              return language.voice
                            })()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {languages.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="flex-shrink-0 ml-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeLanguage(language.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  {/* Preset Selection */}
                  <div className="space-y-2">
                    <Label>Apply Preset</Label>
                    <Select
                      value=""
                      onValueChange={(value) => applyPreset(language.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a preset configuration" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAllConfigs().map((config) => (
                          <SelectItem key={config.id} value={config.id}>
                            <div className="flex items-center gap-2">
                              <span>{config.displayName}</span>
                              {config.code === 'multi' && (
                                <Badge variant="outline" className="text-xs">Multi</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Language Name */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Language Name</Label>
                        <HelpTooltip content="The name used in SWML (e.g., 'English', 'Spanish')" />
                      </div>
                      <Input
                        value={language.name}
                        onChange={(e) => updateLanguage(language.id, { name: e.target.value })}
                        placeholder="e.g., English"
                      />
                    </div>

                    {/* Language Code */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Language Code</Label>
                        <HelpTooltip content={helpContent.agent.language} />
                      </div>
                      <Select
                        value={language.code}
                        onValueChange={(newCode) => {
                          const codeName = getAvailableLanguageCodes().find(([code]) => code === newCode)?.[1] || getLanguageName(newCode)
                          updateLanguage(language.id, { 
                            code: newCode,
                            // Always update the name to match the selected language
                            name: codeName
                          })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableLanguageCodes().map(([code, name]) => (
                            <SelectItem key={code} value={code}>
                              <div className="flex items-center gap-2">
                                <span>{name} ({code})</span>
                                {code === 'multi' && (
                                  <Badge variant="outline" className="text-xs">Multi</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* TTS Engine */}
                    <div className="space-y-2">
                      <Label>TTS Engine</Label>
                      <Select
                        value={language.engine}
                        onValueChange={(value) => updateLanguage(language.id, { engine: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amazon">Amazon</SelectItem>
                          <SelectItem value="rime">Rime</SelectItem>
                          <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="azure">Azure</SelectItem>
                          <SelectItem value="google">Google</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Model (for Rime) */}
                    {language.engine === 'rime' && (
                      <div className="space-y-2">
                        <Label>Model</Label>
                        <Select
                          value={language.model || ''}
                          onValueChange={(value) => updateLanguage(language.id, { model: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mist">Mist</SelectItem>
                            <SelectItem value="mistv2">Mist v2</SelectItem>
                            <SelectItem value="arcana">Arcana</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Voice */}
                    {language.engine === 'amazon' ? (
                      <AmazonVoiceSelector
                        languageCode={language.code}
                        voice={language.voice}
                        engine={language.model}
                        onVoiceChange={(voice) => updateLanguage(language.id, { voice })}
                        onEngineChange={(engine) => updateLanguage(language.id, { model: engine })}
                      />
                    ) : (
                    <div className="space-y-2">
                      <Label>Voice</Label>
                      {language.engine === 'elevenlabs' ? (
                        <div className="space-y-2">
                          <Select
                            value={(() => {
                              if (!language.voice) return ''
                              const matchingEntry = Object.entries(ELEVENLABS_VOICE_MAP).find(([, voice]) => 
                                voice.id === language.voice
                              )
                              return matchingEntry ? matchingEntry[0] : '__custom__'
                            })()}
                            onValueChange={(value) => {
                              if (value === '__custom__') {
                                updateLanguage(language.id, { voice: '' })
                              } else {
                                const voice = ELEVENLABS_VOICE_MAP[value as keyof typeof ELEVENLABS_VOICE_MAP]
                                updateLanguage(language.id, { voice: voice.id })
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a voice" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__custom__">Custom Voice ID</SelectItem>
                              {Object.entries(ELEVENLABS_VOICE_MAP).map(([key, voice]) => (
                                <SelectItem key={key} value={key}>
                                  {voice.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {(language.voice === '' || !Object.values(ELEVENLABS_VOICE_MAP).some(v => v.id === language.voice)) && (
                            <Input
                              value={language.voice}
                              onChange={(e) => updateLanguage(language.id, { voice: e.target.value })}
                              placeholder="Enter custom voice ID"
                            />
                          )}
                        </div>
                      ) : language.engine === 'rime' ? (
                        <Select
                          value={language.voice}
                          onValueChange={(value) => updateLanguage(language.id, { voice: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a voice" />
                          </SelectTrigger>
                          <SelectContent>
                            {getRimeVoices(language.model || 'mist', language.code).map((voice) => (
                              <SelectItem key={voice} value={voice}>
                                {voice}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={language.voice}
                          onChange={(e) => updateLanguage(language.id, { voice: e.target.value })}
                          placeholder="Enter voice name"
                        />
                      )}
                    </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}

        <Button type="button" onClick={addLanguage} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Language
        </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}