"""
Unified skills API that uses SDK's skill registry as the single source of truth.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Dict, Any, Optional
import os
import tempfile
import zipfile
import shutil
from pathlib import Path
import logging

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Try to import from the SDK
SDK_AVAILABLE = False
try:
    from signalwire.skills.registry import skill_registry
    SDK_AVAILABLE = True
    
    def list_skills_with_params():
        """Get skills with parameter information"""
        skills_schema = {}
        
        # Get basic skill list
        skills_list = skill_registry.list_skills()
        
        for skill_info in skills_list:
            skill_name = skill_info['name']
            
            # Try to get the skill class to extract parameter schema
            try:
                skill_class = skill_registry.get_skill_class(skill_name)
                
                # Extract parameter schema if available
                parameters = {}
                if hasattr(skill_class, 'get_parameter_schema'):
                    try:
                        parameters = skill_class.get_parameter_schema()
                        logger.debug(f"Got parameters for {skill_name}: {parameters}")
                    except Exception as e:
                        logger.error(f"Failed to get parameters for {skill_name}: {e}")
                        parameters = {}
                
                # Build skill schema
                skills_schema[skill_name] = {
                    'name': skill_name,
                    'description': skill_info.get('description', f'{skill_name} functionality'),
                    'version': skill_info.get('version', '1.0.0'),
                    'supports_multiple_instances': getattr(skill_class, 'SUPPORTS_MULTIPLE_INSTANCES', False),
                    'required_packages': getattr(skill_class, 'REQUIRED_PACKAGES', []),
                    'required_env_vars': getattr(skill_class, 'REQUIRED_ENV_VARS', []),
                    'parameters': parameters,
                    'source': 'built-in'
                }
                
            except Exception as e:
                # If we can't load the skill class, use basic info
                skills_schema[skill_name] = {
                    'name': skill_name,
                    'description': skill_info.get('description', f'{skill_name} functionality'),
                    'version': skill_info.get('version', '1.0.0'),
                    'supports_multiple_instances': False,
                    'required_packages': [],
                    'required_env_vars': [],
                    'parameters': {},
                    'source': 'built-in'
                }
        
        return skills_schema
    
    # Import other SDK functions
    try:
        from signalwire import add_skill_directory, register_skill
    except ImportError:
        # Define stubs if not available
        def add_skill_directory(path):
            if hasattr(skill_registry, 'add_skill_directory'):
                return skill_registry.add_skill_directory(path)
            return None
            
        def register_skill(skill_class):
            return skill_registry.register_skill(skill_class)
            
except ImportError as e:
    logger.error(f"Failed to import from SDK: {e}")
    SDK_AVAILABLE = False
    list_skills_with_params = lambda: {}
    add_skill_directory = lambda x: None
    register_skill = lambda x: None

from ..core.marketplace_metadata import get_marketplace_service
from ..auth import get_current_user

router = APIRouter()

# Directory for installed third-party skills
INSTALLED_SKILLS_DIR = Path(os.environ.get("SIGNALWIRE_INSTALLED_SKILLS_DIR", "/app/installed_skills"))
INSTALLED_SKILLS_DIR.mkdir(exist_ok=True, parents=True)

# Add installed skills directory to SDK if available
if SDK_AVAILABLE:
    try:
        add_skill_directory(str(INSTALLED_SKILLS_DIR))
    except Exception as e:
        logger.warning(f"Could not add installed skills directory to SDK: {e}")


class UnifiedSkillInfo(BaseModel):
    """Unified skill information combining SDK data and marketplace metadata"""
    # Core SDK fields
    name: str = Field(..., description="Skill identifier")
    description: str = Field(..., description="Skill description")
    version: str = Field(..., description="Skill version")
    supports_multiple_instances: bool = Field(False, description="Whether skill supports multiple instances")
    required_packages: List[str] = Field(default_factory=list, description="Required Python packages")
    required_env_vars: List[str] = Field(default_factory=list, description="Required environment variables")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Parameter schema")
    source: Optional[str] = Field(None, description="Skill source (built-in, external, etc)")
    
    # Marketplace metadata fields
    display_name: str = Field(..., description="Display name for UI")
    category: str = Field("uncategorized", description="Skill category")
    tags: List[str] = Field(default_factory=list, description="Skill tags")
    installed: bool = Field(True, description="Whether skill is installed")
    enabled: bool = Field(True, description="Whether skill is enabled")
    marketplace: Dict[str, Any] = Field(default_factory=dict, description="Marketplace metadata")


class SkillCategory(BaseModel):
    """Skill category information"""
    id: str
    name: str
    icon: str
    count: int


class SkillToggleRequest(BaseModel):
    """Request to toggle skill enabled state"""
    enabled: bool


@router.get("/", response_model=List[UnifiedSkillInfo])
async def list_unified_skills(
    category: Optional[str] = None,
    search: Optional[str] = None,
    installed_only: bool = False,
    current_user=Depends(get_current_user)
) -> List[UnifiedSkillInfo]:
    """Get unified list of all available skills from SDK with marketplace metadata"""
    
    if not SDK_AVAILABLE:
        raise HTTPException(status_code=503, detail="SignalWire SDK not available")
    
    try:
        # Get all skills from SDK
        sdk_skills = list_skills_with_params()
        marketplace_service = get_marketplace_service()
        
        unified_skills = []
        
        for skill_name, skill_data in sdk_skills.items():
            # Get marketplace metadata
            marketplace_meta = marketplace_service.get_metadata(skill_name)
            
            # Determine if skill is installed (all SDK skills are considered installed)
            # In the future, we can check if it's from the installed_skills directory
            is_installed = True
            
            # Get parameters - use SDK parameters if available, otherwise use marketplace defaults
            parameters = skill_data.get("parameters", {})
            if not parameters and "default_parameters" in marketplace_meta:
                # Use marketplace metadata as fallback since SDK doesn't expose parameters
                parameters = marketplace_meta["default_parameters"]
            
            # Build unified skill info
            unified = UnifiedSkillInfo(
                name=skill_name,
                description=skill_data.get("description", ""),
                version=skill_data.get("version", "1.0.0"),
                supports_multiple_instances=skill_data.get("supports_multiple_instances", False),
                required_packages=skill_data.get("required_packages", []),
                required_env_vars=skill_data.get("required_env_vars", []),
                parameters=parameters,
                source=skill_data.get("source", "built-in"),
                display_name=marketplace_meta.get("display_name", skill_name.replace("_", " ").title()),
                category=marketplace_meta.get("category", "uncategorized"),
                tags=marketplace_meta.get("tags", []),
                installed=is_installed,
                enabled=True,  # TODO: Track enabled state per user
                marketplace={
                    "featured": marketplace_meta.get("featured", False),
                    "downloads": marketplace_meta.get("downloads", 0),
                    "rating": marketplace_meta.get("rating", 0.0),
                    "verified": marketplace_meta.get("verified", False)
                }
            )
            
            # Apply filters
            if category and category != "all" and unified.category != category:
                continue
            
            if search:
                search_lower = search.lower()
                if not (search_lower in unified.name.lower() or 
                       search_lower in unified.description.lower() or
                       search_lower in unified.display_name.lower() or
                       any(search_lower in tag for tag in unified.tags)):
                    continue
            
            if installed_only and not unified.installed:
                continue
            
            unified_skills.append(unified)
        
        # Sort by featured status and rating
        unified_skills.sort(
            key=lambda s: (
                -s.marketplace.get("featured", False),
                -s.marketplace.get("rating", 0),
                -s.marketplace.get("downloads", 0)
            )
        )
        
        return unified_skills
        
    except Exception as e:
        logger.error(f"Failed to list unified skills: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories", response_model=List[SkillCategory])
async def get_skill_categories(
    current_user=Depends(get_current_user)
) -> List[SkillCategory]:
    """Get all available skill categories with counts"""
    
    marketplace_service = get_marketplace_service()
    categories_dict = marketplace_service.get_categories()
    
    # Convert to list of SkillCategory objects
    categories = [
        SkillCategory(
            id=cat_id,
            name=cat_data["name"],
            icon=cat_data["icon"],
            count=cat_data["count"]
        )
        for cat_id, cat_data in categories_dict.items()
    ]
    
    # Sort by count descending
    categories.sort(key=lambda c: -c.count)
    
    return categories


@router.get("/{skill_name}", response_model=UnifiedSkillInfo)
async def get_skill_details(
    skill_name: str,
    current_user=Depends(get_current_user)
) -> UnifiedSkillInfo:
    """Get detailed information about a specific skill"""
    
    if not SDK_AVAILABLE:
        raise HTTPException(status_code=503, detail="SignalWire SDK not available")
    
    try:
        # Get all skills and find the requested one
        sdk_skills = list_skills_with_params()
        
        if skill_name not in sdk_skills:
            raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' not found")
        
        skill_data = sdk_skills[skill_name]
        marketplace_service = get_marketplace_service()
        marketplace_meta = marketplace_service.get_metadata(skill_name)
        
        return UnifiedSkillInfo(
            name=skill_name,
            description=skill_data.get("description", ""),
            version=skill_data.get("version", "1.0.0"),
            supports_multiple_instances=skill_data.get("supports_multiple_instances", False),
            required_packages=skill_data.get("required_packages", []),
            required_env_vars=skill_data.get("required_env_vars", []),
            parameters=skill_data.get("parameters", {}),
            source=skill_data.get("source", "built-in"),
            display_name=marketplace_meta.get("display_name", skill_name.replace("_", " ").title()),
            category=marketplace_meta.get("category", "uncategorized"),
            tags=marketplace_meta.get("tags", []),
            installed=True,
            enabled=True,
            marketplace={
                "featured": marketplace_meta.get("featured", False),
                "downloads": marketplace_meta.get("downloads", 0),
                "rating": marketplace_meta.get("rating", 0.0),
                "verified": marketplace_meta.get("verified", False)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get skill details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{skill_name}/install")
async def install_skill(
    skill_name: str,
    current_user=Depends(get_current_user)
) -> Dict[str, str]:
    """Install a skill (currently just increments download count)"""
    
    marketplace_service = get_marketplace_service()
    new_count = marketplace_service.increment_downloads(skill_name)
    
    # TODO: Implement actual skill installation
    # This would involve downloading skill files and extracting to INSTALLED_SKILLS_DIR
    
    return {
        "status": "success",
        "message": f"Skill '{skill_name}' installed successfully",
        "downloads": str(new_count)
    }


@router.post("/{skill_name}/uninstall")
async def uninstall_skill(
    skill_name: str,
    current_user=Depends(get_current_user)
) -> Dict[str, str]:
    """Uninstall a third-party skill"""
    
    skill_dir = INSTALLED_SKILLS_DIR / skill_name
    
    if not skill_dir.exists():
        raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' is not installed")
    
    try:
        # Remove skill directory
        shutil.rmtree(skill_dir)
        
        return {
            "status": "success",
            "message": f"Skill '{skill_name}' uninstalled successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to uninstall skill: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{skill_name}")
async def toggle_skill(
    skill_name: str,
    request: SkillToggleRequest,
    current_user=Depends(get_current_user)
) -> Dict[str, str]:
    """Toggle skill enabled/disabled state"""
    
    # TODO: Implement per-user skill enable/disable state
    # For now, this is not implemented
    logger.warning(f"Skill toggle requested for '{skill_name}' but feature not implemented")
    
    raise HTTPException(
        status_code=501,
        detail="Skill enable/disable feature is not yet implemented. Skills are always available when installed."
    )


@router.post("/upload")
async def upload_skill(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
) -> Dict[str, str]:
    """Upload and install a custom skill package"""
    
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only ZIP files are supported")
    
    temp_dir = None
    try:
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        temp_file = Path(temp_dir) / file.filename
        
        # Save uploaded file
        with open(temp_file, 'wb') as f:
            content = await file.read()
            f.write(content)
        
        # Extract and validate
        with zipfile.ZipFile(temp_file, 'r') as zf:
            # Check for required files
            namelist = zf.namelist()
            skill_py_files = [f for f in namelist if f.endswith('skill.py')]
            
            if not skill_py_files:
                raise HTTPException(status_code=400, detail="No skill.py file found in package")
            
            # Extract to temporary location
            extract_dir = Path(temp_dir) / "extracted"
            zf.extractall(extract_dir)
            
            # Find the skill directory (might be nested)
            skill_dir = None
            for skill_py in skill_py_files:
                parent = (extract_dir / skill_py).parent
                if parent.name and parent.name != "extracted":
                    skill_dir = parent
                    break
            
            if not skill_dir:
                raise HTTPException(status_code=400, detail="Invalid package structure")
            
            # Copy to installed skills directory
            skill_name = skill_dir.name
            target_dir = INSTALLED_SKILLS_DIR / skill_name
            
            if target_dir.exists():
                raise HTTPException(status_code=409, detail=f"Skill '{skill_name}' already exists")
            
            shutil.copytree(skill_dir, target_dir)
            
            # Update marketplace metadata
            marketplace_service = get_marketplace_service()
            marketplace_service.update_metadata(skill_name, {
                "display_name": skill_name.replace("_", " ").title(),
                "category": "uncategorized",
                "installed": True,
                "downloads": 0,
                "rating": 0.0,
                "verified": False
            })
            
            return {
                "status": "success",
                "message": f"Skill '{skill_name}' uploaded successfully",
                "skill_name": skill_name
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload skill: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temporary directory
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)