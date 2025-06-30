"""
Skills marketplace API endpoints - delegates to unified API.
This is kept for backward compatibility with the existing frontend.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
import logging

from pydantic import BaseModel

from ..auth import get_current_user
from .skills_unified import (
    list_unified_skills, 
    get_skill_categories,
    install_skill as unified_install_skill,
    uninstall_skill as unified_uninstall_skill,
    toggle_skill as unified_toggle_skill,
    upload_skill as unified_upload_skill,
    UnifiedSkillInfo,
    SkillCategory as UnifiedSkillCategory
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/skills", tags=["skills-marketplace"])


# Legacy models for backward compatibility
class SkillInfo(BaseModel):
    """Legacy skill information model."""
    name: str
    display_name: str
    description: str
    version: str
    author: str = ""
    category: str = "uncategorized"
    required_packages: List[str] = []
    required_env_vars: List[str] = []
    example_params: Dict[str, Any] = {}
    installed: bool = False
    enabled: bool = False
    marketplace: Dict[str, Any] = {}


class SkillCategory(BaseModel):
    """Legacy skill category model."""
    id: str
    name: str
    icon: str
    count: int


class SkillStatusUpdate(BaseModel):
    """Skill status update request."""
    enabled: bool


def convert_unified_to_legacy(skill: UnifiedSkillInfo) -> SkillInfo:
    """Convert unified skill info to legacy format."""
    # Extract example params from parameter schema
    example_params = {}
    for param_name, param_info in skill.parameters.items():
        if param_name not in ["swaig_fields", "tool_name"]:
            if "default" in param_info:
                example_params[param_name] = param_info["default"]
            elif param_info.get("type") == "string":
                example_params[param_name] = f"your-{param_name}"
            elif param_info.get("type") == "integer":
                example_params[param_name] = 0
            elif param_info.get("type") == "boolean":
                example_params[param_name] = False
    
    return SkillInfo(
        name=skill.name,
        display_name=skill.display_name,
        description=skill.description,
        version=skill.version,
        author=skill.marketplace.get("author", "SignalWire"),
        category=skill.category,
        required_packages=skill.required_packages,
        required_env_vars=skill.required_env_vars,
        example_params=example_params,
        installed=skill.installed,
        enabled=skill.enabled,
        marketplace=skill.marketplace
    )


@router.get("/marketplace", response_model=List[SkillInfo])
async def list_marketplace_skills(
    current_user=Depends(get_current_user)
) -> List[SkillInfo]:
    """Get all available skills from the marketplace."""
    
    # Get unified skills
    unified_skills = await list_unified_skills(
        category=None,
        search=None,
        installed_only=False,
        current_user=current_user
    )
    
    # Convert to legacy format
    return [convert_unified_to_legacy(skill) for skill in unified_skills]


@router.get("/categories", response_model=List[SkillCategory])
async def get_categories(
    current_user=Depends(get_current_user)
) -> List[SkillCategory]:
    """Get all skill categories."""
    
    # Get unified categories
    unified_categories = await get_skill_categories(current_user=current_user)
    
    # Convert to legacy format (they're already compatible)
    return [
        SkillCategory(
            id=cat.id,
            name=cat.name,
            icon=cat.icon,
            count=cat.count
        )
        for cat in unified_categories
    ]


@router.post("/{skill_name}/install")
async def install_skill(
    skill_name: str,
    current_user=Depends(get_current_user)
) -> Dict[str, str]:
    """Install a skill from the marketplace."""
    return await unified_install_skill(skill_name, current_user)


@router.delete("/{skill_name}")
async def uninstall_skill(
    skill_name: str,
    current_user=Depends(get_current_user)
) -> Dict[str, str]:
    """Uninstall a skill."""
    return await unified_uninstall_skill(skill_name, current_user)


@router.patch("/{skill_name}")
async def update_skill_status(
    skill_name: str,
    status_update: SkillStatusUpdate,
    current_user=Depends(get_current_user)
) -> Dict[str, str]:
    """Update skill enabled/disabled status."""
    from .skills_unified import SkillToggleRequest
    
    toggle_request = SkillToggleRequest(enabled=status_update.enabled)
    return await unified_toggle_skill(skill_name, toggle_request, current_user)


@router.post("/upload")
async def upload_custom_skill(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
) -> Dict[str, str]:
    """Upload a custom skill package."""
    return await unified_upload_skill(file, current_user)