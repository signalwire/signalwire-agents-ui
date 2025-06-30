"""
Marketplace metadata service for skills.
This provides additional metadata for skills like ratings, downloads, categories, etc.
"""

import json
import os
from typing import Dict, Any, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class MarketplaceMetadataService:
    """Service for managing marketplace metadata for skills"""
    
    def __init__(self, metadata_file: Optional[Path] = None):
        """Initialize the marketplace metadata service
        
        Args:
            metadata_file: Path to the metadata JSON file. If not provided,
                         uses default location in data directory.
        """
        if metadata_file is None:
            data_dir = Path(__file__).parent.parent / "data"
            data_dir.mkdir(exist_ok=True)
            metadata_file = data_dir / "marketplace_metadata.json"
        
        self.metadata_file = metadata_file
        self._metadata = self._load_metadata()
    
    def _load_metadata(self) -> Dict[str, Dict[str, Any]]:
        """Load metadata from file or return default metadata"""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load marketplace metadata: {e}")
        
        # Return default metadata for built-in skills
        return self._get_default_metadata()
    
    def _get_default_metadata(self) -> Dict[str, Dict[str, Any]]:
        """Get default marketplace metadata for built-in skills"""
        return {
            "web_search": {
                "display_name": "Web Search",
                "category": "external-apis",
                "featured": True,
                "downloads": 6750,
                "rating": 4.6,
                "verified": True,
                "tags": ["search", "web", "google"],
                "default_parameters": {
                    "api_key": {
                        "type": "string",
                        "description": "Google Custom Search API key",
                        "required": True,
                        "hidden": True,
                        "env_var": "GOOGLE_SEARCH_API_KEY"
                    },
                    "search_engine_id": {
                        "type": "string", 
                        "description": "Google Custom Search Engine ID",
                        "required": True,
                        "hidden": True,
                        "env_var": "GOOGLE_SEARCH_ENGINE_ID"
                    },
                    "num_results": {
                        "type": "integer",
                        "description": "Default number of search results to return",
                        "default": 1,
                        "required": False,
                        "min": 1,
                        "max": 10
                    }
                }
            },
            "stock_prices": {
                "display_name": "Stock Market Data",
                "category": "external-apis",
                "featured": False,
                "downloads": 3421,
                "rating": 4.3,
                "verified": True,
                "tags": ["finance", "stocks", "market"],
                "default_parameters": {
                    "api_key": {
                        "type": "string",
                        "description": "Alpha Vantage API key",
                        "required": True,
                        "hidden": True,
                        "env_var": "ALPHA_VANTAGE_API_KEY"
                    }
                }
            },
            "weather": {
                "display_name": "Weather Information",
                "category": "external-apis",
                "featured": True,
                "downloads": 8932,
                "rating": 4.8,
                "verified": True,
                "tags": ["weather", "forecast", "temperature"],
                "default_parameters": {
                    "api_key": {
                        "type": "string",
                        "description": "OpenWeatherMap API key",
                        "required": True,
                        "hidden": True,
                        "env_var": "OPENWEATHER_API_KEY"
                    },
                    "units": {
                        "type": "string",
                        "description": "Temperature units",
                        "default": "metric",
                        "required": False,
                        "enum": ["metric", "imperial", "kelvin"]
                    }
                }
            },
            "datetime": {
                "display_name": "Date & Time",
                "category": "utilities",
                "featured": False,
                "downloads": 12543,
                "rating": 5.0,
                "verified": True,
                "tags": ["time", "date", "timezone"]
            },
            "math": {
                "display_name": "Math Operations",
                "category": "utilities",
                "featured": False,
                "downloads": 9876,
                "rating": 4.9,
                "verified": True,
                "tags": ["math", "calculator", "computation"]
            },
            "tts_say": {
                "display_name": "Text to Speech",
                "category": "voice",
                "featured": False,
                "downloads": 5432,
                "rating": 4.5,
                "verified": True,
                "tags": ["tts", "voice", "speech"]
            },
            "knowledge_base": {
                "display_name": "Knowledge Base",
                "category": "knowledge",
                "featured": True,
                "downloads": 7234,
                "rating": 4.7,
                "verified": True,
                "tags": ["knowledge", "database", "facts"]
            },
            "contacts": {
                "display_name": "Contacts Management",
                "category": "business",
                "featured": False,
                "downloads": 2345,
                "rating": 4.2,
                "verified": True,
                "tags": ["contacts", "crm", "database"]
            },
            "calendar": {
                "display_name": "Calendar Integration",
                "category": "business",
                "featured": False,
                "downloads": 4567,
                "rating": 4.4,
                "verified": True,
                "tags": ["calendar", "events", "scheduling"]
            },
            "user_vars": {
                "display_name": "User Variables",
                "category": "utilities",
                "featured": False,
                "downloads": 6789,
                "rating": 4.6,
                "verified": True,
                "tags": ["variables", "storage", "data"]
            }
        }
    
    def get_metadata(self, skill_name: str) -> Dict[str, Any]:
        """Get marketplace metadata for a specific skill
        
        Args:
            skill_name: Name of the skill
            
        Returns:
            Marketplace metadata dict or empty dict if not found
        """
        return self._metadata.get(skill_name, {})
    
    def update_metadata(self, skill_name: str, metadata: Dict[str, Any]) -> None:
        """Update marketplace metadata for a skill
        
        Args:
            skill_name: Name of the skill
            metadata: New metadata to merge with existing
        """
        if skill_name not in self._metadata:
            self._metadata[skill_name] = {}
        
        self._metadata[skill_name].update(metadata)
        self._save_metadata()
    
    def _save_metadata(self) -> None:
        """Save metadata to file"""
        try:
            with open(self.metadata_file, 'w') as f:
                json.dump(self._metadata, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save marketplace metadata: {e}")
    
    def get_categories(self) -> Dict[str, Dict[str, Any]]:
        """Get all available categories with counts
        
        Returns:
            Dict mapping category IDs to category info
        """
        categories = {
            "utilities": {"id": "utilities", "name": "Utilities", "icon": "🛠️", "count": 0},
            "external-apis": {"id": "external-apis", "name": "External APIs", "icon": "🌐", "count": 0},
            "knowledge": {"id": "knowledge", "name": "Knowledge", "icon": "📚", "count": 0},
            "business": {"id": "business", "name": "Business", "icon": "💼", "count": 0},
            "voice": {"id": "voice", "name": "Voice & Audio", "icon": "🎤", "count": 0},
            "uncategorized": {"id": "uncategorized", "name": "Uncategorized", "icon": "📦", "count": 0}
        }
        
        # Count skills per category
        for skill_metadata in self._metadata.values():
            category = skill_metadata.get("category", "uncategorized")
            if category in categories:
                categories[category]["count"] += 1
        
        return categories
    
    def increment_downloads(self, skill_name: str) -> int:
        """Increment download count for a skill
        
        Args:
            skill_name: Name of the skill
            
        Returns:
            New download count
        """
        if skill_name not in self._metadata:
            self._metadata[skill_name] = {}
        
        current = self._metadata[skill_name].get("downloads", 0)
        self._metadata[skill_name]["downloads"] = current + 1
        self._save_metadata()
        
        return self._metadata[skill_name]["downloads"]


# Global instance
_marketplace_service = None

def get_marketplace_service() -> MarketplaceMetadataService:
    """Get the global marketplace metadata service instance"""
    global _marketplace_service
    if _marketplace_service is None:
        _marketplace_service = MarketplaceMetadataService()
    return _marketplace_service