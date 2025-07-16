"""Amazon Polly voices configuration loader."""
import json
import os
from typing import Dict, List, Optional
from pathlib import Path

class PollyVoicesService:
    """Service for managing Amazon Polly voice configurations."""
    
    def __init__(self):
        self._voices: List[Dict] = []
        self._load_voices()
    
    def _load_voices(self):
        """Load voices from polly_voices.json file."""
        # Try multiple paths
        possible_paths = [
            Path(__file__).parent / "polly_voices.json",
            Path(__file__).parent.parent / "polly_voices.json",
            Path("/app/backend/polly_voices.json"),
        ]
        
        for path in possible_paths:
            if path.exists():
                with open(path, 'r') as f:
                    content = f.read()
                    # Skip the first line if it's not valid JSON
                    if content.startswith('Available Polly Voices'):
                        lines = content.split('\n', 1)
                        if len(lines) > 1:
                            content = lines[1]
                    data = json.loads(content)
                    self._voices = data.get('Voices', [])
                    break
        
        if not self._voices:
            # Fallback to hardcoded minimal set
            self._voices = [
                {
                    "Id": "Joanna",
                    "Name": "Joanna",
                    "Gender": "Female",
                    "LanguageCode": "en-US",
                    "LanguageName": "US English",
                    "SupportedEngines": ["neural", "standard"]
                },
                {
                    "Id": "Matthew",
                    "Name": "Matthew", 
                    "Gender": "Male",
                    "LanguageCode": "en-US",
                    "LanguageName": "US English",
                    "SupportedEngines": ["neural", "standard"]
                }
            ]
    
    def get_voices_for_language(self, language_code: str, engine: Optional[str] = None) -> List[Dict]:
        """Get all voices that support a specific language and optionally engine."""
        filtered_voices = []
        
        for voice in self._voices:
            # Check if voice supports the language
            if voice.get('LanguageCode') == language_code:
                # If engine specified, check if voice supports it
                if engine:
                    if engine in voice.get('SupportedEngines', []):
                        filtered_voices.append(voice)
                else:
                    filtered_voices.append(voice)
        
        return filtered_voices
    
    def get_all_voices(self) -> List[Dict]:
        """Get all available voices."""
        return self._voices
    
    def get_languages(self) -> List[Dict[str, str]]:
        """Get unique languages from all voices."""
        languages = {}
        for voice in self._voices:
            code = voice.get('LanguageCode')
            name = voice.get('LanguageName')
            if code and name:
                languages[code] = name
        
        return [{"code": code, "name": name} for code, name in sorted(languages.items())]
    
    def get_engines(self) -> List[str]:
        """Get all unique engines from all voices."""
        engines = set()
        for voice in self._voices:
            engines.update(voice.get('SupportedEngines', []))
        return sorted(list(engines))
    
    def format_voice_for_swml(self, voice_id: str, engine: str) -> str:
        """Format voice ID for SWML as amazon.<engine>.<voice>."""
        return f"amazon.{engine}.{voice_id}"


# Singleton instance
polly_voices_service = PollyVoicesService()