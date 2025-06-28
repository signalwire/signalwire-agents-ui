import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Save, Languages, Settings2, Globe } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { 
  LANGUAGE_PRESETS, 
  getUniqueLanguageCodes, 
  supportsMultiCode,
  type LanguagePreset 
} from "@/lib/languagePresets";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface LanguageConfig {
  id: string;
  displayName: string;
  properName: string;
  code: string;
  engine: string;
  model?: string;
  voice: string;
}

export function VoiceLanguageSettings() {
  const [languageConfigs, setLanguageConfigs] = useState<LanguageConfig[]>([]);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadLanguageSettings();
  }, []);

  const loadLanguageSettings = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/api/settings/language-configs");
      if (response.data.configs) {
        setLanguageConfigs(response.data.configs);
      }
      if (response.data.selectedPresets) {
        setSelectedPresets(response.data.selectedPresets);
      }
    } catch (error) {
      console.error("Failed to load language settings:", error);
      toast({ 
        title: "Failed to load language settings",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveLanguageSettings = async () => {
    setIsSaving(true);
    try {
      await api.post("/api/settings/language-configs", {
        configs: languageConfigs,
        selectedPresets
      });
      toast({ title: "Language settings saved successfully" });
    } catch (error) {
      console.error("Failed to save language settings:", error);
      toast({ 
        title: "Failed to save language settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addCustomConfig = () => {
    const newConfig: LanguageConfig = {
      id: `custom-${Date.now()}`,
      displayName: "Custom Language",
      properName: "Custom",
      code: "en-US",
      engine: "elevenlabs",
      voice: ""
    };
    setLanguageConfigs([...languageConfigs, newConfig]);
  };

  const updateConfig = (id: string, updates: Partial<LanguageConfig>) => {
    setLanguageConfigs(configs =>
      configs.map(config => config.id === id ? { ...config, ...updates } : config)
    );
  };

  const deleteConfig = (id: string) => {
    setLanguageConfigs(configs => configs.filter(config => config.id !== id));
  };

  const togglePreset = (presetId: string) => {
    setSelectedPresets(prev =>
      prev.includes(presetId)
        ? prev.filter(id => id !== presetId)
        : [...prev, presetId]
    );
  };

  const addPresetAsConfig = (preset: LanguagePreset) => {
    const config: LanguageConfig = {
      id: `${preset.id}-${Date.now()}`,
      displayName: preset.displayName,
      properName: preset.properName,
      code: preset.code,
      engine: preset.engine,
      model: preset.model,
      voice: preset.suggestedVoices[0] || ""
    };
    setLanguageConfigs([...languageConfigs, config]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-heading-secondary">
            <Languages className="h-5 w-5" />
            Language Configuration
          </CardTitle>
          <CardDescription>
            Configure language presets for agents. These define ASR language codes, TTS engines, and voice settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Available Presets */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Available Presets</h3>
            <div className="space-y-4">
              {getUniqueLanguageCodes().map(langCode => {
                const presets = LANGUAGE_PRESETS.filter(p => p.code === langCode);
                if (presets.length === 0) return null;
                
                return (
                  <div key={langCode} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        {presets[0].properName} ({langCode})
                      </h4>
                      {supportsMultiCode(langCode) && (
                        <Badge variant="secondary">Supports Multi</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {presets.map(preset => (
                        <div
                          key={preset.id}
                          className="flex items-center justify-between p-2 border rounded hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={selectedPresets.includes(preset.id)}
                              onCheckedChange={() => togglePreset(preset.id)}
                            />
                            <span className="text-sm">{preset.displayName}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => addPresetAsConfig(preset)}
                            title="Add as custom config"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {/* Multilingual presets */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Multilingual (Auto-detect)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {LANGUAGE_PRESETS.filter(p => p.code === "multi").map(preset => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between p-2 border rounded hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={selectedPresets.includes(preset.id)}
                          onCheckedChange={() => togglePreset(preset.id)}
                        />
                        <span className="text-sm">{preset.displayName}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addPresetAsConfig(preset)}
                        title="Add as custom config"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Custom Configurations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Custom Configurations</h3>
              <Button onClick={addCustomConfig} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Custom
              </Button>
            </div>
            
            <div className="space-y-4">
              {languageConfigs.map((config) => (
                <Card key={config.id}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`displayName-${config.id}`}>Display Name</Label>
                        <Input
                          id={`displayName-${config.id}`}
                          value={config.displayName}
                          onChange={(e) => updateConfig(config.id, { displayName: e.target.value })}
                          placeholder="e.g., English (US) - ElevenLabs"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`properName-${config.id}`}>Proper Name</Label>
                        <Input
                          id={`properName-${config.id}`}
                          value={config.properName}
                          onChange={(e) => updateConfig(config.id, { properName: e.target.value })}
                          placeholder="e.g., English"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`code-${config.id}`}>Language Code</Label>
                        <Input
                          id={`code-${config.id}`}
                          value={config.code}
                          onChange={(e) => updateConfig(config.id, { code: e.target.value })}
                          placeholder="e.g., en-US or multi"
                        />
                        <p className="text-xs text-muted-foreground">
                          BCP-47 format (e.g., en-US) or "multi" for multilingual
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`engine-${config.id}`}>TTS Engine</Label>
                        <Select
                          value={config.engine}
                          onValueChange={(value) => updateConfig(config.id, { engine: value })}
                        >
                          <SelectTrigger id={`engine-${config.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rime">Rime</SelectItem>
                            <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                            <SelectItem value="openai">OpenAI</SelectItem>
                            <SelectItem value="azure">Azure</SelectItem>
                            <SelectItem value="google">Google</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {config.engine === "rime" && (
                        <div className="space-y-2">
                          <Label htmlFor={`model-${config.id}`}>Model</Label>
                          <Select
                            value={config.model || ""}
                            onValueChange={(value) => updateConfig(config.id, { model: value })}
                          >
                            <SelectTrigger id={`model-${config.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mist">Mist</SelectItem>
                              <SelectItem value="mistv2">Mist v2</SelectItem>
                              <SelectItem value="arcana">Arcana</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor={`voice-${config.id}`}>Voice</Label>
                        <Input
                          id={`voice-${config.id}`}
                          value={config.voice}
                          onChange={(e) => updateConfig(config.id, { voice: e.target.value })}
                          placeholder={
                            config.engine === "elevenlabs" 
                              ? "e.g., adam or adam:eleven_multilingual_v2"
                              : "e.g., nova"
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          {config.engine === "elevenlabs" 
                            ? "Voice name or voice:model format"
                            : "Voice name"}
                        </p>
                      </div>
                      
                      <div className="flex items-end">
                        <Button
                          onClick={() => deleteConfig(config.id)}
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {languageConfigs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No custom configurations. Add one to get started.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveLanguageSettings} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-heading-secondary">
            <Settings2 className="h-5 w-5" />
            Configuration Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">ASR Language Codes</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Use BCP-47 format codes (e.g., en-US, es-MX, fr-FR)</li>
              <li>• Use "multi" for automatic language detection (Deepgram v3)</li>
              <li>• Multi mode supports: English, Spanish, French, German, Hindi, Russian, Portuguese, Japanese, Italian, Dutch</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">TTS Engine Requirements</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Rime:</strong> Requires model field (mist, mistv2, arcana)</li>
              <li>• <strong>ElevenLabs:</strong> Model specified in voice string (e.g., adam:eleven_multilingual_v2)</li>
              <li>• <strong>OpenAI/Azure/Google:</strong> No model field needed</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Voice Configuration</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Rime: Simple voice names (e.g., "nova", "maya")</li>
              <li>• ElevenLabs: Voice name or voice:model format</li>
              <li>• Check engine documentation for available voices</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}