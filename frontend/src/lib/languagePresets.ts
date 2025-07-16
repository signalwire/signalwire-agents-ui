export interface LanguagePreset {
  id: string;
  displayName: string;
  properName: string;
  code: string;
  engine: string;
  model?: string;
  voice: string;
  voiceDisplayName?: string; // For showing in UI
  suggestedVoices: string[];
}

// Languages that support "multi" code for ASR
const MULTI_SUPPORTED_LANGS = [
  "en", "es", "fr", "de", "hi", "ru", "pt", "ja", "it", "nl"
];

// Map Rime's 3-letter codes to BCP-47
// const RIME_CODE_MAP: Record<string, string[]> = {
//   "eng": ["en-US", "en-GB", "en-AU", "en-IN", "en-NZ"],
//   "spa": ["es-ES", "es-MX", "es-US", "es-AR", "es-CO", "es-419"],
//   "fra": ["fr-FR", "fr-CA", "fr-BE", "fr-CH"],
//   "ger": ["de-DE", "de-AT", "de-CH"],
//   "any": ["multi"] // Arcana multilingual voices
// };

// Rime voice data
export const RIME_VOICES = {
  mist: {
    eng: ["abbie", "allison", "ally", "alona", "alpine", "amber", "ana", "antoine", "armon", 
          "bayou", "blaze", "blossom", "boulder", "breeze", "brenda", "brittany", "brook", 
          "carol", "cedar", "colin", "courtney", "cove", "creek", "dew", "elena", "elliot", 
          "ember", "eva", "falcon", "fjord", "flower", "geoff", "gerald", "glacier", "granite", 
          "grove", "gulch", "gypsum", "hank", "hawk", "helen", "hera", "iris", "ironwood", 
          "jen", "joe", "joy", "juan", "jungle", "kendra", "kendrick", "kenneth", "kevin", 
          "kris", "lagoon", "linda", "loquat", "lotus", "madison", "marge", "marina", 
          "marissa", "marsh", "marta", "maya", "mesa", "moon", "moraine", "nicholas", 
          "nyles", "peak", "pearl", "petal", "phil", "rain", "rainforest", "reba", "rex", 
          "rick", "ritu", "river", "rob", "rodney", "rohan", "rosco", "samantha", "sandy", 
          "selena", "seth", "sharon", "spore", "stan", "steppe", "stone", "storm", "stream", 
          "summit", "talon", "tamra", "tanya", "thunder", "tibur", "tj", "tundra", "tyler", 
          "violet", "viv", "wildflower", "willow", "wolf", "yadira", "zest"]
  },
  mistv2: {
    eng: ["abbie", "allison", "ally", "alona", "amber", "ana", "antoine", "armon", "brenda", 
          "brittany", "carol", "colin", "courtney", "elena", "elliot", "eva", "geoff", 
          "gerald", "gypsum", "hank", "helen", "hera", "jen", "joe", "joy", "juan", "kendra", 
          "kendrick", "kenneth", "kevin", "kris", "linda", "madison", "marge", "marina", 
          "marissa", "marta", "maya", "nicholas", "nyles", "phil", "reba", "rex", "rick", 
          "ritu", "rob", "rodney", "rohan", "rosco", "samantha", "sandy", "selena", "seth", 
          "sharon", "stan", "tamra", "tanya", "tibur", "tj", "tyler", "viv", "yadira", "zest"],
    spa: ["isa", "mari", "pablo"],
    fra: ["alois", "juliette", "marguerite"],
    ger: ["amalia", "frieda", "karolina", "klaus"]
  },
  arcana: {
    eng: ["andromeda", "astra", "celeste", "estelle", "esther", "luna", "orion"],
    any: ["pola", "tauro", "ursa"]
  }
};

// Helper to get Rime voices for a specific model and language
export function getRimeVoices(model: string, language: string): string[] {
  const langCode = language.split('-')[0]; // Get base language code
  const modelVoices = RIME_VOICES[model as keyof typeof RIME_VOICES];
  
  if (!modelVoices) return [];
  
  // Map language codes to Rime's internal codes
  const langMap: Record<string, string> = {
    'en': 'eng',
    'es': 'spa',
    'fr': 'fra',
    'de': 'ger',
    'multi': 'any'
  };
  
  const rimeLang = langMap[langCode] || 'eng';
  return modelVoices[rimeLang as keyof typeof modelVoices] || [];
}

// OpenAI voices
const OPENAI_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

// ElevenLabs voice mappings (name -> voice_id)
export const ELEVENLABS_VOICE_MAP: Record<string, { id: string; name: string }> = {
  // Common voices with their IDs
  "adam": { id: "pNInz6obpgDQGcFmaJgB", name: "Adam" },
  "antoni": { id: "ErXwobaYiN019PkySvjV", name: "Antoni" },
  "arnold": { id: "VR6AewLTigWG4xSOukaG", name: "Arnold" },
  "bella": { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella" },
  "callum": { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum" },
  "charlie": { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie" },
  "charlotte": { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte" },
  "clyde": { id: "2EiwWnXFnvU5JabPnv8n", name: "Clyde" },
  "daniel": { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel" },
  "dave": { id: "CYw3kZ02Hs0563khs1Fj", name: "Dave" },
  "domi": { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi" },
  "dorothy": { id: "ThT5KcBeYPX3keUQqHPh", name: "Dorothy" },
  "drew": { id: "29vD33N1CtxCmqQRPOHJ", name: "Drew" },
  "emily": { id: "LcfcDJNUP1GQjkzn1xUU", name: "Emily" },
  "emma": { id: "MF3mGyEYCl7XYWbV9V6O", name: "Emma" },
  "ethan": { id: "g5CIjZEefAph4nQFvHAz", name: "Ethan" },
  "fin": { id: "D38z5RcWu1voky8WS1ja", name: "Fin" },
  "freya": { id: "jsCqWAovK2LkecY7zXl4", name: "Freya" },
  "gigi": { id: "jBpfuIE2acCO8z3wKNLl", name: "Gigi" },
  "giovanni": { id: "zcAOhNBS3c14rBihAFp1", name: "Giovanni" },
  "glinda": { id: "z9fAnlkpzviPz146aGWa", name: "Glinda" },
  "grace": { id: "oWAxZDx7w5VEj9dCyTzz", name: "Grace" },
  "harry": { id: "SOYHLrjzK2X1ezoPC6cr", name: "Harry" },
  "james": { id: "ZQe5CZNOzWyzPSCn5a3c", name: "James" },
  "jeremy": { id: "bVMeCyTHy58xNoL34h3p", name: "Jeremy" },
  "jessie": { id: "t0jbNlBVZ17f02VDIeMI", name: "Jessie" },
  "josh": { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh" },
  "liam": { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam" },
  "lily": { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily" },
  "matilda": { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda" },
  "matthew": { id: "Yko7PKHZNXotIFUBG7I9", name: "Matthew" },
  "michael": { id: "flq6f7yk4E4fJM5XTYuZ", name: "Michael" },
  "mimi": { id: "zrHiDhphv9ZnVXBqCLjz", name: "Mimi" },
  "nicole": { id: "piTKgcLEGmPE4e6mEKli", name: "Nicole" },
  "patrick": { id: "ODq5zmih8GrVes37Dizd", name: "Patrick" },
  "paul": { id: "5Q0t7uMcjvnagumLfvZi", name: "Paul" },
  "rachel": { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel" },
  "sam": { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam" },
  "serena": { id: "pMsXgVXv3BLzUgSXRplE", name: "Serena" },
  "thomas": { id: "GBv7mTt0atIp3Br8iCZE", name: "Thomas" }
};

// Generate language presets
export const LANGUAGE_PRESETS: LanguagePreset[] = [
  // English variants with multiple engines
  // Amazon voices first
  {
    id: "en-us-amazon-neural",
    displayName: "English (US) - Amazon Neural",
    properName: "English",
    code: "en-US",
    engine: "amazon",
    model: "neural",
    voice: "amazon.neural.Joanna",
    voiceDisplayName: "Joanna",
    suggestedVoices: ["Joanna", "Matthew", "Salli", "Kimberly", "Kendra", "Justin", "Joey", "Ivy"]
  },
  {
    id: "en-us-amazon-generative",
    displayName: "English (US) - Amazon Generative",
    properName: "English",
    code: "en-US",
    engine: "amazon",
    model: "generative",
    voice: "amazon.generative.Matthew",
    voiceDisplayName: "Matthew",
    suggestedVoices: ["Matthew", "Ruth", "Danielle", "Joanna", "Stephen"]
  },
  {
    id: "en-gb-amazon-neural",
    displayName: "English (UK) - Amazon Neural",
    properName: "English",
    code: "en-GB",
    engine: "amazon",
    model: "neural",
    voice: "amazon.neural.Amy",
    voiceDisplayName: "Amy",
    suggestedVoices: ["Amy", "Emma", "Brian", "Arthur"]
  },
  {
    id: "es-es-amazon-neural",
    displayName: "Spanish (Spain) - Amazon Neural",
    properName: "Spanish",
    code: "es-ES",
    engine: "amazon",
    model: "neural",
    voice: "amazon.neural.Lucia",
    voiceDisplayName: "Lucia",
    suggestedVoices: ["Lucia", "Sergio"]
  },
  {
    id: "es-mx-amazon-neural",
    displayName: "Spanish (Mexico) - Amazon Neural",
    properName: "Spanish",
    code: "es-MX",
    engine: "amazon",
    model: "neural",
    voice: "amazon.neural.Mia",
    voiceDisplayName: "Mia",
    suggestedVoices: ["Mia", "Andres"]
  },
  {
    id: "fr-fr-amazon-neural",
    displayName: "French (France) - Amazon Neural",
    properName: "French",
    code: "fr-FR",
    engine: "amazon",
    model: "neural",
    voice: "amazon.neural.Lea",
    voiceDisplayName: "Léa",
    suggestedVoices: ["Lea", "Remi"]
  },
  {
    id: "de-de-amazon-neural",
    displayName: "German - Amazon Neural",
    properName: "German",
    code: "de-DE",
    engine: "amazon",
    model: "neural",
    voice: "amazon.neural.Vicki",
    voiceDisplayName: "Vicki",
    suggestedVoices: ["Vicki", "Daniel"]
  },
  {
    id: "it-it-amazon-neural",
    displayName: "Italian - Amazon Neural",
    properName: "Italian",
    code: "it-IT",
    engine: "amazon",
    model: "neural",
    voice: "amazon.neural.Bianca",
    voiceDisplayName: "Bianca",
    suggestedVoices: ["Bianca", "Adriano"]
  },
  {
    id: "pt-br-amazon-neural",
    displayName: "Portuguese (Brazil) - Amazon Neural",
    properName: "Portuguese",
    code: "pt-BR",
    engine: "amazon",
    model: "neural",
    voice: "amazon.neural.Camila",
    voiceDisplayName: "Camila",
    suggestedVoices: ["Camila", "Vitoria", "Thiago"]
  },
  {
    id: "ja-jp-amazon-neural",
    displayName: "Japanese - Amazon Neural",
    properName: "Japanese",
    code: "ja-JP",
    engine: "amazon",
    model: "neural",
    voice: "amazon.neural.Kazuha",
    voiceDisplayName: "Kazuha",
    suggestedVoices: ["Kazuha", "Tomoko", "Takumi"]
  },
  {
    id: "ko-kr-amazon-neural",
    displayName: "Korean - Amazon Neural",
    properName: "Korean",
    code: "ko-KR",
    engine: "amazon",
    model: "neural",
    voice: "amazon.neural.Seoyeon",
    voiceDisplayName: "Seoyeon",
    suggestedVoices: ["Seoyeon", "Jihye"]
  },
  // Rime voices
  {
    id: "en-us-rime-mist",
    displayName: "English (US) - Rime",
    properName: "English",
    code: "en-US",
    engine: "rime",
    model: "mist",
    voice: "nova",
    suggestedVoices: ["nova", "allison", "rick", "eva", "maya", "colin"]
  },
  {
    id: "en-us-rime-mistv2",
    displayName: "English (US) - Rime v2",
    properName: "English",
    code: "en-US",
    engine: "rime",
    model: "mistv2",
    voice: "allison",
    suggestedVoices: ["allison", "rick", "maya", "colin", "eva", "samantha"]
  },
  {
    id: "en-us-elevenlabs",
    displayName: "English (US) - ElevenLabs",
    properName: "English",
    code: "en-US",
    engine: "elevenlabs",
    voice: "pNInz6obpgDQGcFmaJgB", // adam
    voiceDisplayName: "Adam",
    suggestedVoices: ["adam", "bella", "josh", "rachel", "sam", "emily"]
  },
  {
    id: "en-us-openai",
    displayName: "English (US) - OpenAI",
    properName: "English",
    code: "en-US",
    engine: "openai",
    voice: "nova",
    suggestedVoices: OPENAI_VOICES
  },
  {
    id: "en-gb-rime-mist",
    displayName: "English (UK) - Rime",
    properName: "English",
    code: "en-GB",
    engine: "rime",
    model: "mist",
    voice: "helen",
    suggestedVoices: ["helen", "gerald", "iris", "cedar", "pearl"]
  },
  {
    id: "en-gb-elevenlabs",
    displayName: "English (UK) - ElevenLabs",
    properName: "English",
    code: "en-GB",
    engine: "elevenlabs",
    voice: "SOYHLrjzK2X1ezoPC6cr",
    voiceDisplayName: "Harry",
    suggestedVoices: ["charlotte", "james", "lily", "harry", "thomas"]
  },
  
  // Spanish variants
  {
    id: "es-es-rime-mistv2",
    displayName: "Spanish (Spain) - Rime v2",
    properName: "Spanish",
    code: "es-ES",
    engine: "rime",
    model: "mistv2",
    voice: "isa",
    suggestedVoices: ["isa", "mari", "pablo"]
  },
  {
    id: "es-es-elevenlabs",
    displayName: "Spanish (Spain) - ElevenLabs",
    properName: "Spanish",
    code: "es-ES",
    engine: "elevenlabs",
    voice: "ErXwobaYiN019PkySvjV",
    voiceDisplayName: "Antoni",
    suggestedVoices: ["antonio", "isabella", "carlos", "maria"]
  },
  {
    id: "es-mx-rime-mistv2",
    displayName: "Spanish (Mexico) - Rime v2",
    properName: "Spanish",
    code: "es-MX",
    engine: "rime",
    model: "mistv2",
    voice: "mari",
    suggestedVoices: ["isa", "mari", "pablo"]
  },
  {
    id: "es-mx-elevenlabs",
    displayName: "Spanish (Mexico) - ElevenLabs",
    properName: "Spanish",
    code: "es-MX",
    engine: "elevenlabs",
    voice: "AZnzlk1XvdvUeBnXmlld",
    voiceDisplayName: "Domi",
    suggestedVoices: ["pedro", "sofia", "diego", "valentina"]
  },
  
  // French variants
  {
    id: "fr-fr-rime-mistv2",
    displayName: "French (France) - Rime v2",
    properName: "French",
    code: "fr-FR",
    engine: "rime",
    model: "mistv2",
    voice: "juliette",
    suggestedVoices: ["alois", "juliette", "marguerite"]
  },
  {
    id: "fr-fr-elevenlabs",
    displayName: "French (France) - ElevenLabs",
    properName: "French",
    code: "fr-FR",
    engine: "elevenlabs",
    voice: "jBpfuIE2acCO8z3wKNLl",
    voiceDisplayName: "Gigi",
    suggestedVoices: ["nicolas", "sophie", "pierre", "camille"]
  },
  {
    id: "fr-ca-rime-mistv2",
    displayName: "French (Canada) - Rime v2",
    properName: "French",
    code: "fr-CA",
    engine: "rime",
    model: "mistv2",
    voice: "marguerite",
    suggestedVoices: ["alois", "juliette", "marguerite"]
  },
  
  // German variants
  {
    id: "de-de-rime-mistv2",
    displayName: "German (Germany) - Rime v2",
    properName: "German",
    code: "de-DE",
    engine: "rime",
    model: "mistv2",
    voice: "klaus",
    suggestedVoices: ["amalia", "frieda", "karolina", "klaus"]
  },
  {
    id: "de-de-elevenlabs",
    displayName: "German (Germany) - ElevenLabs",
    properName: "German",
    code: "de-DE",
    engine: "elevenlabs",
    voice: "onwK4e9ZLuTAKqWW03F9",
    voiceDisplayName: "Daniel",
    suggestedVoices: ["hans", "greta", "wilhelm", "anna"]
  },
  
  // Multilingual configurations
  {
    id: "multi-rime-arcana",
    displayName: "Multilingual - Rime Arcana",
    properName: "Multiple Languages",
    code: "multi",
    engine: "rime",
    model: "arcana",
    voice: "pola",
    suggestedVoices: ["pola", "tauro", "ursa"]
  },
  {
    id: "multi-elevenlabs",
    displayName: "Multilingual - ElevenLabs",
    properName: "Multiple Languages",
    code: "multi",
    engine: "elevenlabs",
    voice: "pNInz6obpgDQGcFmaJgB",
    voiceDisplayName: "Adam",
    suggestedVoices: ["adam", "bella", "josh", "rachel", "giovanni", "freya"]
  },
  
  // Other major languages (no Rime support)
  {
    id: "pt-br-elevenlabs",
    displayName: "Portuguese (Brazil) - ElevenLabs",
    properName: "Portuguese",
    code: "pt-BR",
    engine: "elevenlabs",
    voice: "5Q0t7uMcjvnagumLfvZi",
    voiceDisplayName: "Paul",
    suggestedVoices: ["paulo", "beatriz", "ricardo", "juliana"]
  },
  {
    id: "it-it-elevenlabs",
    displayName: "Italian (Italy) - ElevenLabs",
    properName: "Italian",
    code: "it-IT",
    engine: "elevenlabs",
    voice: "zcAOhNBS3c14rBihAFp1",
    voiceDisplayName: "Giovanni",
    suggestedVoices: ["giovanni", "sofia", "marco", "giulia"]
  },
  {
    id: "ja-jp-elevenlabs",
    displayName: "Japanese (Japan) - ElevenLabs",
    properName: "Japanese",
    code: "ja-JP",
    engine: "elevenlabs",
    voice: "Yko7PKHZNXotIFUBG7I9",
    voiceDisplayName: "Matthew",
    suggestedVoices: ["takashi", "yuki", "hiroshi", "sakura"]
  },
  {
    id: "ko-kr-elevenlabs",
    displayName: "Korean (Korea) - ElevenLabs",
    properName: "Korean",
    code: "ko-KR",
    engine: "elevenlabs",
    voice: "TX3LPaxmHKxFdv7VOQHJ",
    voiceDisplayName: "Liam",
    suggestedVoices: ["minho", "jiyoung", "junho", "soyeon"]
  },
  {
    id: "zh-cn-elevenlabs",
    displayName: "Chinese (Simplified) - ElevenLabs",
    properName: "Chinese",
    code: "zh-CN",
    engine: "elevenlabs",
    voice: "pFZP5JQG7iQjIQuC4Bku",
    voiceDisplayName: "Lily",
    suggestedVoices: ["lei", "xiaoli", "chen", "mei"]
  },
  {
    id: "ru-ru-elevenlabs",
    displayName: "Russian (Russia) - ElevenLabs",
    properName: "Russian",
    code: "ru-RU",
    engine: "elevenlabs",
    voice: "yoZ06aMxZJJ28mfd3POQ",
    voiceDisplayName: "Sam",
    suggestedVoices: ["dmitri", "natasha", "ivan", "katya"]
  },
  {
    id: "hi-in-elevenlabs",
    displayName: "Hindi (India) - ElevenLabs",
    properName: "Hindi",
    code: "hi-IN",
    engine: "elevenlabs",
    voice: "piTKgcLEGmPE4e6mEKli",
    voiceDisplayName: "Nicole",
    suggestedVoices: ["raj", "priya", "arjun", "ananya"]
  },
  {
    id: "nl-nl-elevenlabs",
    displayName: "Dutch (Netherlands) - ElevenLabs",
    properName: "Dutch",
    code: "nl-NL",
    engine: "elevenlabs",
    voice: "MF3mGyEYCl7XYWbV9V6O",
    voiceDisplayName: "Emma",
    suggestedVoices: ["jan", "lisa", "pieter", "emma"]
  }
];

// Helper function to check if a language code supports multi
export function supportsMultiCode(langCode: string): boolean {
  const baseLang = langCode.split("-")[0];
  return MULTI_SUPPORTED_LANGS.includes(baseLang);
}

// Helper function to get all presets for a language
export function getPresetsForLanguage(langCode: string): LanguagePreset[] {
  return LANGUAGE_PRESETS.filter(preset => 
    preset.code === langCode || 
    (preset.code === "multi" && supportsMultiCode(langCode))
  );
}

// Helper function to get all unique language codes
export function getUniqueLanguageCodes(): string[] {
  const codes = new Set(LANGUAGE_PRESETS.map(p => p.code).filter(c => c !== "multi"));
  return Array.from(codes).sort();
}

// Helper function to get ElevenLabs voice ID from name
export function getElevenLabsVoiceId(voiceName: string): string {
  const voice = ELEVENLABS_VOICE_MAP[voiceName.toLowerCase()];
  return voice?.id || voiceName; // Return original if not found
}

// Helper function to get ElevenLabs voice display name from ID
export function getElevenLabsVoiceName(voiceId: string): string {
  if (!voiceId) return 'Unknown';
  
  // Search by ID
  for (const [, voice] of Object.entries(ELEVENLABS_VOICE_MAP)) {
    if (voice.id === voiceId) {
      return voice.name;
    }
  }
  
  return voiceId; // Return original if not found
}

// Helper function to format voice for ElevenLabs with model
export function formatElevenLabsVoice(voice: string, model?: string): string {
  if (model && !voice.includes(":")) {
    return `${voice}:${model}`;
  }
  return voice;
}