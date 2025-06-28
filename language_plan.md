# Language Configuration Plan

## Overview
The language configuration system needs to properly handle SignalWire's complex language requirements, including ASR language codes, TTS engines, voices, and models.

## Language Configuration Object Structure

Each language configuration will have:
```javascript
{
  displayName: string,    // UI display name (e.g., "English (US)")
  properName: string,     // Name for AI (e.g., "English")
  code: string,          // ASR language code (e.g., "en-US" or "multi")
  engine: string,        // TTS engine (e.g., "rime", "elevenlabs", "openai")
  model?: string,        // Model name (only for Rime, blank for others)
  voice: string          // Voice name or voice:model format
}
```

## Key Concepts

### ASR Language Codes (BCP-47 Format)
- **Specific codes**: `en-US`, `es-MX`, `fr-FR`, etc. - for single language recognition
- **Multi code**: `"multi"` - for automatic multi-language detection (Deepgram v3)
- Multi-supported languages: English, Spanish, French, German, Hindi, Russian, Portuguese, Japanese, Italian, Dutch
- **Important**: SignalWire requires BCP-47 format codes (e.g., `en-US`), not ISO 639-2 three-letter codes
  - Even though Rime internally uses "eng", "spa", "fra", "ger", we always use BCP-47 in configurations

### TTS Engine Configuration
1. **Rime**: 
   - Requires `model` field (mist, mistv2, arcana)
   - Voice names are simple (e.g., "nova")
   - Different voices per language/model combination

2. **ElevenLabs**:
   - No `model` field in config (leave blank)
   - Model specified in voice string: `"voice:model"` (e.g., "adam:eleven_multilingual_v2")
   - All voices support multiple languages on multilingual models

3. **OpenAI/Azure/Google**:
   - No `model` field needed
   - Simple voice names

## Implementation Components

### 1. Language Presets Database
Create comprehensive presets from available data:

#### English Variants
- English (US) - en-US
- English (UK) - en-GB  
- English (Australia) - en-AU
- English (India) - en-IN
- English (New Zealand) - en-NZ

#### Spanish Variants
- Spanish (Spain) - es-ES
- Spanish (Mexico) - es-MX
- Spanish (US) - es-US
- Spanish (Argentina) - es-AR
- Spanish (Colombia) - es-CO
- Spanish (Latin America) - es-419

#### Other Major Languages
- French (France) - fr-FR
- French (Canada) - fr-CA
- German - de-DE
- Portuguese (Brazil) - pt-BR
- Portuguese (Portugal) - pt-PT
- Chinese (Simplified) - zh-CN
- Japanese - ja-JP
- Korean - ko-KR
- Russian - ru-RU
- Italian - it-IT
- Dutch - nl-NL

#### Special Configuration
- Multilingual (Auto-detect) - code: "multi"

### 2. Voice Presets by Engine

#### Rime Voices (from rime.json)
- **Mist model**: Large selection of English voices (uses BCP-47 codes, not Rime's internal "eng")
- **MistV2 model**: 
  - English (en-US, en-GB, etc.)
  - Spanish (es-ES, es-MX, etc.) - voices: isa, mari, pablo
  - French (fr-FR, fr-CA, etc.) - voices: alois, juliette, marguerite
  - German (de-DE, de-CH, etc.) - voices: amalia, frieda, karolina, klaus
- **Arcana model**: Multilingual voices (pola, tauro, ursa) - use standard BCP-47 codes or "multi"

#### ElevenLabs Voices (from elevenlabs.json)
- Extract voice names from JSON
- Support models: eleven_multilingual_v2, eleven_turbo_v2_5, etc.
- Note which voices support which languages

#### OpenAI Voices
- alloy, echo, fable, onyx, nova, shimmer

### 3. UI Components

#### Language Builder Component
1. **Language Selection**
   - Dropdown with all preset languages
   - "Custom Configuration" option
   - For multi-supported languages, show toggle: "Use multi-language detection"

2. **Engine Selection**
   - Filter engines based on language support (from tts_language_support.md)
   - Show compatibility warnings

3. **Model Selection** (Rime only)
   - Show dropdown when Rime selected
   - Options: mist, mistv2, arcana

4. **Voice Configuration**
   - Dropdown with suggested voices based on engine/language
   - Free text input for custom
   - Format helper showing examples:
     - Rime: `"nova"`
     - ElevenLabs: `"adam"` or `"adam:eleven_multilingual_v2"`
     - OpenAI: `"alloy"`

### 4. Data Flow

1. **Admin stores language presets** → Database
2. **Agent Builder loads presets** → Populate dropdowns
3. **User selects/customizes** → Generate language config
4. **Save to agent config** → Used in SWML generation

### 5. Backend Storage

Store in settings table:
```json
{
  "language_presets": [
    {
      "id": "en-us-rime-mist",
      "displayName": "English (US) - Rime",
      "properName": "English",
      "code": "en-US",  // BCP-47 format, not Rime's "eng"
      "engine": "rime",
      "model": "mist",
      "suggestedVoices": ["nova", "allison", "rick", "eva"]
    },
    {
      "id": "multi-elevenlabs",
      "displayName": "Multilingual - ElevenLabs",
      "properName": "Multiple Languages",
      "code": "multi",
      "engine": "elevenlabs",
      "model": "",
      "suggestedVoices": ["adam", "bella", "josh", "rachel"]
    }
  ]
}
```

### 6. Migration Strategy

1. Update database schema to store new format
2. Create default presets from JSON files
3. Update VoiceLanguageSettings component
4. Update Agent Builder to use new language configs
5. Ensure backward compatibility

## Benefits

1. **User-Friendly**: Presets make common configurations easy
2. **Flexible**: Custom option for advanced users
3. **Accurate**: Properly handles engine-specific requirements
4. **Scalable**: Easy to add new languages/engines/voices
5. **Maintainable**: Clear separation of concerns

## Next Steps

1. Create language preset data from JSON files
2. Build new VoiceLanguageSettings component
3. Update agent configuration to use new format
4. Test with various engine/language combinations