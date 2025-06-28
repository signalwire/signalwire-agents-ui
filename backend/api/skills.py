"""Skills API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
import logging
from pydantic import BaseModel
import importlib
import inspect

from ..core.security import verify_jwt_token
from ..core.skill_param_extractor import SkillParameterExtractor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/skills", tags=["skills"])


class SkillInfo(BaseModel):
    """Skill information model."""
    name: str
    description: str
    params: List[Dict[str, Any]]
    functions: List[str]


def get_skill_modules():
    """Get all available skill modules using SignalWire SDK's skill registry."""
    skills = []
    
    try:
        # Try to use the SDK's skill registry if available
        try:
            from signalwire_agents.skills import skill_registry
            
            # Get all available skills from the registry
            available_skills = skill_registry.list_skills()
            
            for skill_info in available_skills:
                skills.append({
                    'name': skill_info['name'],
                    'description': skill_info.get('description', f'{skill_info["name"]} functionality'),
                    'version': skill_info.get('version', '1.0.0'),
                    'required_packages': skill_info.get('required_packages', []),
                    'required_env_vars': skill_info.get('required_env_vars', []),
                    'supports_multiple_instances': skill_info.get('supports_multiple_instances', False)
                })
                
            logger.info(f"Loaded {len(skills)} skills from SDK registry")
            
        except ImportError:
            logger.warning("SDK skill registry not available, using fallback discovery")
            
            # Fallback: manually check for known skills
            import signalwire_agents.skills
            import pkgutil
            
            # Discover skill modules in the skills package
            skills_path = signalwire_agents.skills.__path__
            for importer, modname, ispkg in pkgutil.iter_modules(skills_path):
                if not ispkg and modname.endswith('_skill'):
                    skill_name = modname.replace('_skill', '')
                    skills.append({
                        'name': skill_name,
                        'description': f'{skill_name.replace("_", " ").title()} functionality',
                        'version': '1.0.0',
                        'required_packages': [],
                        'required_env_vars': [],
                        'supports_multiple_instances': False
                    })
            
        # If no skills found via registry, use a minimal hardcoded list
        if not skills:
            logger.info("No skills found via registry, using hardcoded list")
            # Core skills that should always be available
            core_skills = [
                {'name': 'datetime', 'description': 'Get current date and time information'},
                {'name': 'math', 'description': 'Perform mathematical calculations'},
                {'name': 'joke', 'description': 'Tell jokes and humor'},
                {'name': 'web_search', 'description': 'Search the web using Google Custom Search'},
                {'name': 'wikipedia_search', 'description': 'Search Wikipedia for information'},
                {'name': 'weather_api', 'description': 'Get weather information'},
                {'name': 'datasphere', 'description': 'SignalWire DataSphere integration'},
                {'name': 'swml_transfer', 'description': 'Transfer calls to other numbers'},
                {'name': 'spider', 'description': 'Web scraping capabilities'},
                {'name': 'api_ninjas_trivia', 'description': 'Trivia questions and answers'},
                {'name': 'mcp_gateway', 'description': 'MCP protocol support'},
                {'name': 'play_background_file', 'description': 'Play background audio files'},
            ]
            
            for skill in core_skills:
                skills.append({
                    'name': skill['name'],
                    'description': skill['description'],
                    'version': '1.0.0',
                    'required_packages': [],
                    'required_env_vars': [],
                    'supports_multiple_instances': False
                })
                
    except Exception as e:
        logger.error(f"Error loading skills: {e}")
    
    return skills


@router.get("/", response_model=List[SkillInfo])
async def get_available_skills(
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> List[SkillInfo]:
    """Get all available skills from the signalwire-agents package."""
    skills = []
    
    # Get skill modules
    skill_modules = get_skill_modules()
    
    # Convert to SkillInfo format
    for skill_data in skill_modules:
        skill_name = skill_data['name']
        
        # Try to extract parameters dynamically from the skill code
        params = SkillParameterExtractor.get_skill_parameters(skill_name)
        
        # Define functions based on skill type
        functions = []
        if skill_name == "datetime":
            functions = ["get_current_time", "get_current_date", "get_time_difference"]
        elif skill_name == "math":
            functions = ["calculate", "solve_equation"]
        elif skill_name == "joke":
            functions = ["tell_joke"]
        elif skill_name == "web_search":
            functions = ["search_web"]
        elif skill_name == "wikipedia_search":
            functions = ["search_wikipedia"]
        elif skill_name == "weather_api":
            functions = ["get_weather", "get_forecast"]
        elif skill_name == "datasphere":
            functions = ["search_documents"]
        elif skill_name == "swml_transfer":
            functions = ["transfer_call"]
        elif skill_name == "spider":
            functions = ["scrape_url", "crawl_website"]
        elif skill_name == "api_ninjas_trivia":
            functions = ["get_trivia"]
        elif skill_name == "mcp_gateway":
            functions = ["call_mcp_tool"]
        elif skill_name == "play_background_file":
            functions = ["play_background_file", "stop_background_file"]
        
        skills.append(SkillInfo(
            name=skill_name,
            description=skill_data['description'],
            params=params,
            functions=functions
        ))
    
    # If no skills found, return default list
    if not skills:
        skills = [
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
            ),
            SkillInfo(
                name="web_search",
                description="Search the web for information",
                params=[
                    {"name": "api_key", "type": "string", "required": True, "description": "Google API Key"},
                    {"name": "search_engine_id", "type": "string", "required": True, "description": "Search Engine ID"},
                    {"name": "num_results", "type": "number", "default": 3, "description": "Number of results"}
                ],
                functions=["web_search"]
            ),
            SkillInfo(
                name="weather",
                description="Get weather information",
                params=[
                    {"name": "api_key", "type": "string", "required": True, "description": "Weather API Key"}
                ],
                functions=["get_weather"]
            )
        ]
    
    return skills