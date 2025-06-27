"""SWML document generation."""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import jwt

from .config import settings, get_swaig_handler_url
from .security import create_skill_jwt_token


def build_pom_from_sections(sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Build a Prompt Object Model from sections configuration."""
    pom = []
    
    for section in sections:
        pom_section = {
            "section": section.get("title", "Section"),
            "content": []
        }
        
        # Add body text if present
        if body := section.get("body"):
            pom_section["content"].append({
                "type": "text",
                "text": body
            })
        
        # Add bullets if present
        if bullets := section.get("bullets"):
            pom_section["content"].append({
                "type": "unordered_list",
                "items": bullets
            })
        
        pom.append(pom_section)
    
    return pom


def generate_skill_functions(skills: List[Dict[str, Any]], agent_id: str) -> List[Dict[str, Any]]:
    """Generate SWAIG function definitions for configured skills."""
    functions = []
    
    for skill_config in skills:
        skill_name = skill_config.get("name")
        skill_params = skill_config.get("params", {})
        
        # Get skill metadata from SDK
        try:
            from signalwire_agents.skills.registry import skill_registry
            skill_info = skill_registry.get_skill_info(skill_name)
            
            if not skill_info:
                continue
                
            # Get the registered functions from the skill
            # This is a simplified version - in reality we'd need to instantiate the skill
            # For now, we'll create standard function entries based on common patterns
            
            # Generate JWT token for this skill
            token = create_skill_jwt_token(agent_id, skill_name, skill_params)
            
            # Add metadata with token to each function
            # Most skills register functions with predictable names
            if skill_name == "datetime":
                functions.extend([
                    {
                        "function": "get_current_time",
                        "description": "Get the current time, optionally in a specific timezone",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "timezone": {
                                    "type": "string",
                                    "description": "Timezone name (e.g., 'America/New_York', 'Europe/London'). Defaults to UTC."
                                }
                            }
                        },
                        "meta_data": {"token": token}
                    },
                    {
                        "function": "get_current_date",
                        "description": "Get the current date",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "timezone": {
                                    "type": "string",
                                    "description": "Timezone name for the date. Defaults to UTC."
                                }
                            }
                        },
                        "meta_data": {"token": token}
                    }
                ])
            elif skill_name == "math":
                functions.append({
                    "function": "calculate",
                    "description": "Perform mathematical calculations",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "expression": {
                                "type": "string",
                                "description": "Mathematical expression to evaluate"
                            }
                        },
                        "required": ["expression"]
                    },
                    "meta_data": {"token": token}
                })
            elif skill_name == "web_search":
                functions.append({
                    "function": "web_search",
                    "description": "Search the web for information",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query"
                            }
                        },
                        "required": ["query"]
                    },
                    "meta_data": {"token": token}
                })
            # Add more skill patterns as needed
            
        except ImportError:
            # If SDK not available, skip
            pass
    
    return functions


def generate_swml(agent_config: Dict[str, Any], agent_id: str) -> Dict[str, Any]:
    """Generate a SWML document from agent configuration."""
    # Build the main AI configuration
    ai_config = {
        "voice": agent_config.get("voice", "nova"),
        "prompt": {
            "temperature": 0.7,
            "top_p": 0.9,
            "content": build_pom_from_sections(agent_config.get("prompt_sections", []))
        }
    }
    
    # Add language configuration
    language = agent_config.get("language", "en-US")
    ai_config["languages"] = [{
        "name": "English",
        "code": language,
        "voice": agent_config.get("voice", "nova")
    }]
    
    # Add hints if provided
    if hints := agent_config.get("hints"):
        ai_config["hints"] = hints
    
    # Add parameters
    default_params = {
        "end_of_speech_timeout": 2000,
        "attention_timeout": 20000,
        "background_file_volume": -20,
        "ai_model": "gpt-4o-mini"
    }
    ai_config["params"] = {**default_params, **agent_config.get("params", {})}
    
    # Build SWAIG configuration
    swaig_config = {
        "defaults": {
            "web_hook_url": get_swaig_handler_url()
        }
    }
    
    # Add skill functions
    if skills := agent_config.get("skills"):
        functions = generate_skill_functions(skills, agent_id)
        if functions:
            swaig_config["functions"] = functions
    
    ai_config["SWAIG"] = swaig_config
    
    # Add post-prompt if configured
    if post_prompt := agent_config.get("post_prompt"):
        ai_config["post_prompt"] = post_prompt
        if post_prompt_url := agent_config.get("post_prompt_url"):
            ai_config["post_prompt_url"] = post_prompt_url
        else:
            # Use generic handler
            ai_config["post_prompt_url"] = f"https://{settings.hostname}:{settings.port}/api/post-prompt/{agent_id}"
    
    # Build the complete SWML document
    swml = {
        "version": "1.0",
        "sections": {
            "main": [
                {"answer": {}},
                {"ai": ai_config}
            ]
        }
    }
    
    return swml