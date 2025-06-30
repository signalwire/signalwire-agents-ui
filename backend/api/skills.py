"""
Skills API endpoints - simplified to use unified skills API.
This is kept for backward compatibility but delegates to the unified API.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
import logging
from pydantic import BaseModel

from ..core.security import verify_jwt_token
from .skills_unified import list_unified_skills

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/skills", tags=["skills"])


class SkillInfo(BaseModel):
    """Skill information model for backward compatibility."""
    name: str
    description: str
    params: List[Dict[str, Any]]
    functions: List[str]


@router.get("/", response_model=List[SkillInfo])
async def get_available_skills(
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> List[SkillInfo]:
    """Get all available skills - delegates to unified API for consistency."""
    
    try:
        # Get unified skills list
        unified_skills = await list_unified_skills(
            category=None,
            search=None,
            installed_only=False,
            current_user=auth_data
        )
        
        # Convert to legacy format
        legacy_skills = []
        
        for skill in unified_skills:
            # Convert parameter schema to legacy format
            params = []
            for param_name, param_info in skill.parameters.items():
                # Skip base parameters like swaig_fields
                if param_name in ["swaig_fields", "tool_name"]:
                    continue
                    
                param_dict = {
                    "name": param_name,
                    "type": param_info.get("type", "string"),
                    "required": param_info.get("required", False),
                    "description": param_info.get("description", ""),
                }
                
                # Add optional fields if present
                if "default" in param_info:
                    param_dict["default"] = param_info["default"]
                if "env_var" in param_info:
                    param_dict["env_var"] = param_info["env_var"]
                if "hidden" in param_info:
                    param_dict["hidden"] = param_info["hidden"]
                if "min" in param_info:
                    param_dict["min"] = param_info["min"]
                if "max" in param_info:
                    param_dict["max"] = param_info["max"]
                if "enum" in param_info:
                    param_dict["enum"] = param_info["enum"]
                    
                params.append(param_dict)
            
            # Define functions based on skill type
            # This is a simplified mapping - in reality, skills register their own functions
            functions_map = {
                "datetime": ["get_current_time", "get_current_date", "get_time_difference"],
                "math": ["calculate", "solve_equation"],
                "joke": ["tell_joke"],
                "web_search": ["search_web"],
                "wikipedia_search": ["search_wikipedia"],
                "weather_api": ["get_weather", "get_forecast"],
                "weather": ["get_weather", "get_forecast"],
                "datasphere": ["search_documents"],
                "swml_transfer": ["transfer_call"],
                "spider": ["scrape_url", "crawl_website"],
                "api_ninjas_trivia": ["get_trivia"],
                "mcp_gateway": ["call_mcp_tool"],
                "play_background_file": ["play_background_file", "stop_background_file"],
                "tts_say": ["say_text"],
                "knowledge_base": ["search_knowledge", "add_knowledge"],
                "contacts": ["search_contacts", "add_contact", "update_contact"],
                "calendar": ["get_events", "create_event", "update_event"],
                "user_vars": ["get_var", "set_var", "delete_var"],
                "stock_prices": ["get_stock_price", "get_stock_history"],
            }
            
            functions = functions_map.get(skill.name, [f"{skill.name}_function"])
            
            legacy_skills.append(SkillInfo(
                name=skill.name,
                description=skill.description,
                params=params,
                functions=functions
            ))
        
        return legacy_skills
        
    except Exception as e:
        logger.error(f"Failed to get skills: {e}")
        
        # Return minimal fallback list
        return [
            SkillInfo(
                name="datetime",
                description="Get current date and time information",
                params=[],
                functions=["get_current_time", "get_current_date"]
            ),
            SkillInfo(
                name="math",
                description="Perform mathematical calculations",
                params=[],
                functions=["calculate"]
            )
        ]