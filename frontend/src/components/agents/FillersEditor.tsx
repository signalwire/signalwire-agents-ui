import { useState, useEffect } from 'react'
import { Plus, X, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface FillersEditorProps {
  value: any
  onChange: (value: any) => void
  skillType?: string
}

interface Fillers {
  [language: string]: string[]
}

interface SwaigFieldsData {
  fillers: Fillers
  [key: string]: any
}

// Common language codes
const COMMON_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
]

// Default fillers by skill type
const DEFAULT_FILLERS: Record<string, string[]> = {
  search: [
    "Let me search for that...",
    "Looking that up for you...",
    "Searching for that information..."
  ],
  weather: [
    "Checking the weather...",
    "Getting weather information...",
    "Looking up the forecast..."
  ],
  api: [
    "Fetching that data...",
    "Processing your request...",
    "Retrieving information..."
  ],
  default: [
    "Just a moment...",
    "Working on that...",
    "Processing..."
  ]
}

export function FillersEditor({ value, onChange, skillType = 'default' }: FillersEditorProps) {
  const [activeTab, setActiveTab] = useState('default')
  const [showAddLanguage, setShowAddLanguage] = useState(false)
  const [newLanguageCode, setNewLanguageCode] = useState('')
  
  // Parse the value to extract fillers
  const parseValue = () => {
    if (!value || typeof value !== 'object') {
      return { fillers: { default: [] } }
    }
    
    // If value already has fillers structure, use it
    if (value.fillers && typeof value.fillers === 'object') {
      // Ensure default exists
      if (!value.fillers.default) {
        value.fillers.default = []
      }
      return value
    }
    
    // Otherwise, wrap existing data
    return { ...value, fillers: { default: [] } }
  }
  
  const [data, setData] = useState<SwaigFieldsData>(parseValue())
  const fillers: Fillers = data.fillers || { default: [] }
  
  // Get sorted language tabs (default first, then alphabetically)
  const languageTabs = Object.keys(fillers).sort((a, b) => {
    if (a === 'default') return -1
    if (b === 'default') return 1
    return a.localeCompare(b)
  })
  
  // Update parent when data changes
  useEffect(() => {
    onChange(data)
  }, [data])
  
  const addFiller = (language: string, filler: string) => {
    if (!filler.trim()) return
    
    setData((prev: SwaigFieldsData) => ({
      ...prev,
      fillers: {
        ...prev.fillers,
        [language]: [...(prev.fillers[language] || []), filler.trim()]
      }
    }))
  }
  
  const removeFiller = (language: string, index: number) => {
    setData((prev: SwaigFieldsData) => ({
      ...prev,
      fillers: {
        ...prev.fillers,
        [language]: prev.fillers[language].filter((_: string, i: number) => i !== index)
      }
    }))
  }
  
  const addLanguage = (code: string) => {
    if (!code || fillers[code]) return
    
    setData((prev: SwaigFieldsData) => ({
      ...prev,
      fillers: {
        ...prev.fillers,
        [code]: []
      }
    }))
    
    setActiveTab(code)
    setShowAddLanguage(false)
    setNewLanguageCode('')
  }
  
  const removeLanguage = (language: string) => {
    if (language === 'default') return // Can't remove default
    
    const newFillers = { ...fillers }
    delete newFillers[language]
    
    setData((prev: SwaigFieldsData) => ({
      ...prev,
      fillers: newFillers
    }))
    
    if (activeTab === language) {
      setActiveTab('default')
    }
  }
  
  const loadDefaults = (language: string) => {
    const defaultSet = DEFAULT_FILLERS[skillType] || DEFAULT_FILLERS.default
    setData((prev: SwaigFieldsData) => ({
      ...prev,
      fillers: {
        ...prev.fillers,
        [language]: [...defaultSet]
      }
    }))
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>SWAIG Fillers</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAddLanguage(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Language
        </Button>
      </div>
      
      <Card className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-flow-col auto-cols-fr mb-4">
            {languageTabs.map(lang => (
              <TabsTrigger key={lang} value={lang} className="gap-1">
                {lang === 'default' ? (
                  <>
                    <Globe className="h-3 w-3" />
                    Default
                  </>
                ) : (
                  lang
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {languageTabs.map(language => (
            <TabsContent key={language} value={language} className="space-y-4">
              <div className="space-y-2">
                {fillers[language]?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-4">No fillers added yet</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => loadDefaults(language)}
                    >
                      Load Default Fillers
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {fillers[language]?.map((filler, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input value={filler} readOnly className="flex-1" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFiller(language, index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Add a filler phrase..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const input = e.currentTarget
                      addFiller(language, input.value)
                      input.value = ''
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    const input = e.currentTarget.parentElement?.querySelector('input')
                    if (input) {
                      addFiller(language, input.value)
                      input.value = ''
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {language !== 'default' && (
                <div className="pt-2 border-t">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeLanguage(language)}
                  >
                    Remove {language}
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </Card>
      
      {/* Add Language Dialog */}
      <Dialog open={showAddLanguage} onOpenChange={setShowAddLanguage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Language</DialogTitle>
            <DialogDescription>
              Add a new language for fillers. Use standard language codes (e.g., en-US, es-MX).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Common Languages</Label>
              <div className="grid grid-cols-2 gap-2">
                {COMMON_LANGUAGES
                  .filter(lang => !fillers[lang.code])
                  .map(lang => (
                    <Button
                      key={lang.code}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addLanguage(lang.code)}
                    >
                      {lang.name} ({lang.code})
                    </Button>
                  ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Custom Language Code</Label>
              <div className="flex gap-2">
                <Input
                  value={newLanguageCode}
                  onChange={(e) => setNewLanguageCode(e.target.value)}
                  placeholder="e.g., fr-CA"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addLanguage(newLanguageCode)
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => addLanguage(newLanguageCode)}
                  disabled={!newLanguageCode || !!fillers[newLanguageCode]}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}