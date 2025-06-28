"""Skills marketplace API endpoints."""
import os
import json
import shutil
import zipfile
import tempfile
from typing import List, Dict, Any, Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import importlib.util
import inspect

from ..auth import get_current_user
from ..core.config import settings

import logging
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/skills", tags=["skills-marketplace"])


class SkillInfo(BaseModel):
    """Skill information model."""
    name: str
    display_name: str
    description: str
    version: str
    author: Optional[str] = None
    category: Optional[str] = None
    required_packages: List[str] = []
    required_env_vars: List[str] = []
    example_params: Dict[str, Any] = {}
    installed: bool = False
    enabled: bool = False
    marketplace: Optional[Dict[str, Any]] = None


class SkillCategory(BaseModel):
    """Skill category model."""
    id: str
    name: str
    icon: str
    count: int


class SkillStatusUpdate(BaseModel):
    """Skill status update request."""
    enabled: bool


# Hardcoded marketplace data for demo purposes
MARKETPLACE_SKILLS = {
    "datetime": {
        "display_name": "Date & Time",
        "description": "Provides date and time functions for getting current time in various timezones",
        "version": "1.0.0",
        "author": "SignalWire",
        "category": "utilities",
        "marketplace": {
            "verified": True,
            "downloads": 15420,
            "rating": 4.8,
            "featured": True
        }
    },
    "math": {
        "display_name": "Math Calculator",
        "description": "Performs mathematical calculations and expressions",
        "version": "1.0.0",
        "author": "SignalWire",
        "category": "utilities",
        "marketplace": {
            "verified": True,
            "downloads": 12350,
            "rating": 4.9
        }
    },
    "weather_api": {
        "display_name": "Weather API",
        "description": "Get current weather and forecasts for any location using OpenWeatherMap",
        "version": "1.0.0",
        "author": "SignalWire",
        "category": "external-apis",
        "required_env_vars": ["OPENWEATHERMAP_API_KEY"],
        "example_params": {
            "api_key": "your-api-key-here",
            "units": "imperial"
        },
        "marketplace": {
            "verified": True,
            "downloads": 8920,
            "rating": 4.7
        }
    },
    "web_search": {
        "display_name": "Web Search",
        "description": "Search the web using Google Custom Search API",
        "version": "1.0.0",
        "author": "SignalWire",
        "category": "external-apis",
        "required_env_vars": ["GOOGLE_API_KEY", "GOOGLE_SEARCH_ENGINE_ID"],
        "required_packages": ["google-api-python-client"],
        "example_params": {
            "api_key": "your-google-api-key",
            "search_engine_id": "your-search-engine-id"
        },
        "marketplace": {
            "verified": True,
            "downloads": 6750,
            "rating": 4.6,
            "featured": True
        }
    },
    "joke": {
        "display_name": "Joke Teller",
        "description": "Tells jokes on demand - great for lightening the mood",
        "version": "1.0.0",
        "author": "SignalWire",
        "category": "entertainment",
        "marketplace": {
            "verified": True,
            "downloads": 23450,
            "rating": 4.5
        }
    },
    "wikipedia_search": {
        "display_name": "Wikipedia Search",
        "description": "Search and retrieve information from Wikipedia",
        "version": "1.0.0",
        "author": "SignalWire",
        "category": "knowledge",
        "required_packages": ["wikipedia-api"],
        "marketplace": {
            "verified": True,
            "downloads": 5320,
            "rating": 4.8
        }
    },
    "datasphere": {
        "display_name": "DataSphere Integration",
        "description": "Advanced data processing and analysis capabilities",
        "version": "2.0.0",
        "author": "SignalWire",
        "category": "enterprise",
        "required_packages": ["pandas", "numpy"],
        "marketplace": {
            "verified": True,
            "downloads": 3210,
            "rating": 4.9,
            "featured": True
        }
    },
    "swml_transfer": {
        "display_name": "SWML Transfer",
        "description": "Transfer calls to other agents or phone numbers",
        "version": "1.0.0",
        "author": "SignalWire",
        "category": "telephony",
        "marketplace": {
            "verified": True,
            "downloads": 4560,
            "rating": 4.7
        }
    }
}


@router.get("/marketplace", response_model=List[SkillInfo])
async def list_marketplace_skills(
    current_user = Depends(get_current_user)
) -> List[SkillInfo]:
    """List all available skills in the marketplace."""
    skills = []
    
    # Get installed skills from the SDK
    try:
        from signalwire_agents.skills.registry import SkillRegistry
        registry = SkillRegistry()
        installed_skills = set()
        
        # Check which skills are actually installed
        skills_dir = Path(__file__).parent.parent.parent / "signalwire-agents" / "signalwire_agents" / "skills"
        if skills_dir.exists():
            for skill_dir in skills_dir.iterdir():
                if skill_dir.is_dir() and (skill_dir / "skill.py").exists():
                    installed_skills.add(skill_dir.name)
    except Exception as e:
        logger.warning(f"Could not load skill registry: {e}")
        installed_skills = set()
    
    # Build skill list with marketplace data
    for skill_name, skill_data in MARKETPLACE_SKILLS.items():
        skill_info = SkillInfo(
            name=skill_name,
            display_name=skill_data["display_name"],
            description=skill_data["description"],
            version=skill_data["version"],
            author=skill_data.get("author"),
            category=skill_data.get("category"),
            required_packages=skill_data.get("required_packages", []),
            required_env_vars=skill_data.get("required_env_vars", []),
            example_params=skill_data.get("example_params", {}),
            installed=skill_name in installed_skills,
            enabled=skill_name in installed_skills,  # Assume enabled if installed for now
            marketplace=skill_data.get("marketplace")
        )
        skills.append(skill_info)
    
    # Sort by featured, then by downloads
    skills.sort(key=lambda s: (
        not (s.marketplace and s.marketplace.get("featured", False)),
        -(s.marketplace.get("downloads", 0) if s.marketplace else 0)
    ))
    
    return skills


@router.get("/categories", response_model=List[SkillCategory])
async def list_skill_categories(
    current_user = Depends(get_current_user)
) -> List[SkillCategory]:
    """List all skill categories."""
    categories = {
        "utilities": {"name": "Utilities", "icon": "🛠️", "count": 0},
        "external-apis": {"name": "External APIs", "icon": "🌐", "count": 0},
        "entertainment": {"name": "Entertainment", "icon": "🎮", "count": 0},
        "knowledge": {"name": "Knowledge", "icon": "📚", "count": 0},
        "enterprise": {"name": "Enterprise", "icon": "🏢", "count": 0},
        "telephony": {"name": "Telephony", "icon": "📞", "count": 0},
    }
    
    # Count skills per category
    for skill_data in MARKETPLACE_SKILLS.values():
        category = skill_data.get("category", "uncategorized")
        if category in categories:
            categories[category]["count"] += 1
    
    return [
        SkillCategory(
            id=cat_id,
            name=cat_data["name"],
            icon=cat_data["icon"],
            count=cat_data["count"]
        )
        for cat_id, cat_data in categories.items()
        if cat_data["count"] > 0
    ]


@router.post("/{skill_name}/install")
async def install_skill(
    skill_name: str,
    current_user = Depends(get_current_user)
) -> Dict[str, str]:
    """Install a skill from the marketplace."""
    if skill_name not in MARKETPLACE_SKILLS:
        raise HTTPException(404, f"Skill '{skill_name}' not found in marketplace")
    
    # In a real implementation, this would:
    # 1. Download the skill from a repository
    # 2. Install required packages
    # 3. Copy to the skills directory
    # 4. Validate the skill
    
    # For now, we'll just return success if it's a known skill
    return {"status": "success", "message": f"Skill '{skill_name}' installed successfully"}


@router.patch("/{skill_name}", response_model=Dict[str, str])
async def update_skill_status(
    skill_name: str,
    update: SkillStatusUpdate,
    current_user = Depends(get_current_user)
) -> Dict[str, str]:
    """Enable or disable a skill."""
    if skill_name not in MARKETPLACE_SKILLS:
        raise HTTPException(404, f"Skill '{skill_name}' not found")
    
    # In a real implementation, this would update configuration
    status = "enabled" if update.enabled else "disabled"
    return {"status": "success", "message": f"Skill '{skill_name}' {status}"}


@router.post("/upload")
async def upload_custom_skill(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
) -> Dict[str, str]:
    """Upload a custom skill package."""
    if not file.filename.endswith('.zip'):
        raise HTTPException(400, "Only ZIP files are supported")
    
    # Create temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        zip_path = temp_path / file.filename
        
        # Save uploaded file
        try:
            with open(zip_path, 'wb') as f:
                content = await file.read()
                f.write(content)
        except Exception as e:
            raise HTTPException(500, f"Failed to save uploaded file: {str(e)}")
        
        # Extract and validate
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(temp_path)
            
            # Find skill.py
            skill_files = list(temp_path.rglob('skill.py'))
            if not skill_files:
                raise HTTPException(400, "No skill.py file found in the package")
            
            skill_file = skill_files[0]
            skill_dir = skill_file.parent
            
            # Basic validation - check if it's a valid SkillBase
            spec = importlib.util.spec_from_file_location("custom_skill", skill_file)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Find SkillBase subclass
            skill_class = None
            for name, obj in inspect.getmembers(module):
                if (inspect.isclass(obj) and 
                    name != 'SkillBase' and
                    'SkillBase' in [base.__name__ for base in obj.__bases__]):
                    skill_class = obj
                    break
            
            if not skill_class:
                raise HTTPException(400, "No valid SkillBase class found in skill.py")
            
            # Validate required attributes
            if not hasattr(skill_class, 'SKILL_NAME'):
                raise HTTPException(400, "Skill class must have SKILL_NAME attribute")
            
            skill_name = skill_class.SKILL_NAME
            
            # In a real implementation, we would:
            # 1. Copy to the skills directory
            # 2. Install requirements if present
            # 3. Register in database
            
            return {
                "status": "success",
                "message": f"Custom skill '{skill_name}' uploaded successfully"
            }
            
        except zipfile.BadZipFile:
            raise HTTPException(400, "Invalid ZIP file")
        except Exception as e:
            logger.error(f"Failed to process skill upload: {e}")
            raise HTTPException(500, f"Failed to process skill: {str(e)}")


@router.delete("/{skill_name}")
async def uninstall_skill(
    skill_name: str,
    current_user = Depends(get_current_user)
) -> Dict[str, str]:
    """Uninstall a skill."""
    # In a real implementation, this would:
    # 1. Check if skill is in use by any agents
    # 2. Remove from skills directory
    # 3. Clean up any data
    
    return {"status": "success", "message": f"Skill '{skill_name}' uninstalled"}