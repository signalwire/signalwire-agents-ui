"""SWAIG (SignalWire AI Gateway) handler endpoints."""
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import logging
import os

from signalwire_agents import AgentBase
from ..core.database import get_db
from ..core.security import decode_jwt_token
from ..models import Agent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/swaig", tags=["swaig"])


class SWAIGRequest(BaseModel):
    """SWAIG function request from SignalWire."""
    function: str
    argument: Dict[str, Any]
    meta_data: Optional[Dict[str, Any]] = None
    
    
class SWAIGResponse(BaseModel):
    """SWAIG function response to SignalWire."""
    response: Any
    action: Optional[List[Dict[str, Any]]] = None


@router.post("/function")
async def handle_swaig_function(
    request: SWAIGRequest,
    req: Request,
    db: AsyncSession = Depends(get_db)
) -> SWAIGResponse:
    """Handle SWAIG function calls from SignalWire using the SDK."""
    
    # Extract auth from request headers (Basic auth)
    auth_header = req.headers.get("authorization", "")
    if auth_header.startswith("Basic "):
        import base64
        try:
            # Decode basic auth
            encoded = auth_header.split(" ")[1]
            decoded = base64.b64decode(encoded).decode()
            username, token = decoded.split(":", 1)
            
            # Decode the JWT token to get agent_id, skill_name, and skill_params
            token_data = decode_jwt_token(token)
            agent_id = token_data.get("agent_id")
            skill_name = token_data.get("skill_name", "general")
            skill_params = token_data.get("skill_params", {})
            
        except Exception as e:
            logger.error(f"Failed to decode auth header: {e}")
            # Fall back to meta_data token
            if not request.meta_data or "token" not in request.meta_data:
                raise HTTPException(status_code=401, detail="Missing authentication token")
            
            try:
                token_data = decode_jwt_token(request.meta_data["token"])
                agent_id = token_data.get("agent_id")
                skill_name = token_data.get("skill_name")
                skill_params = token_data.get("skill_params", {})
            except Exception as e:
                logger.error(f"Failed to decode SWAIG token: {e}")
                raise HTTPException(status_code=401, detail="Invalid token")
    else:
        # No basic auth, try meta_data
        if not request.meta_data or "token" not in request.meta_data:
            raise HTTPException(status_code=401, detail="Missing authentication token")
        
        try:
            token_data = decode_jwt_token(request.meta_data["token"])
            agent_id = token_data.get("agent_id")
            skill_name = token_data.get("skill_name")
            skill_params = token_data.get("skill_params", {})
        except Exception as e:
            logger.error(f"Failed to decode SWAIG token: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")
    
    # Log the function call
    logger.info(f"SWAIG function call: agent={agent_id}, skill={skill_name}, function={request.function}")
    
    # Create an ephemeral agent and load the skill
    try:
        # Create a minimal agent just for skill execution
        ephemeral_agent = AgentBase(name=f"SWAIG-{agent_id}")
        
        # For "general" auth (non-skill specific), determine skill from function name
        if skill_name == "general":
            # Map function names to skills
            function_to_skill = {
                "get_current_time": "datetime",
                "get_current_date": "datetime",
                "get_time_difference": "datetime",
                "calculate": "math",
                "solve_equation": "math",
                "tell_joke": "joke",
                "search_web": "web_search",
                "search_wikipedia": "wikipedia_search",
                "get_weather": "weather_api",
                "get_forecast": "weather_api",
                "search_documents": "datasphere",
                "transfer_call": "swml_transfer",
                "scrape_url": "spider",
                "crawl_website": "spider",
                "get_trivia": "api_ninjas_trivia",
                "call_mcp_tool": "mcp_gateway",
                "play_background_file": "play_background_file",
                "stop_background_file": "play_background_file",
            }
            
            skill_name = function_to_skill.get(request.function)
            if not skill_name:
                # Try to find skill by searching loaded skills
                # This is a fallback that won't work without more context
                return SWAIGResponse(
                    response=f"Unknown function: {request.function}"
                )
        
        # Add the skill with its parameters
        try:
            ephemeral_agent.add_skill(skill_name, skill_params)
        except Exception as e:
            logger.warning(f"Failed to load skill {skill_name} with SDK: {e}")
            # Fall back to manual handling for core skills
            return handle_skill_manually(skill_name, request.function, request.argument, skill_params)
        
        # Create a mock SWAIG context for the skill
        class MockSWAIG:
            def __init__(self, function_name: str, args: Dict[str, Any]):
                self.function_name = function_name
                self.args = args
                self.result = None
                
            async def execute(self):
                """Execute the skill function."""
                # This would normally be handled by SignalWire's runtime
                # For now, we'll simulate it
                pass
        
        # Try to find and execute the function
        # In a real implementation, SignalWire would handle this
        # For now, we'll use manual handlers as fallback
        return handle_skill_manually(skill_name, request.function, request.argument, skill_params)
        
    except Exception as e:
        logger.error(f"Error handling SWAIG function: {e}")
        return SWAIGResponse(
            response=f"Error executing function: {str(e)}"
        )


def handle_skill_manually(skill_name: str, function: str, args: Dict[str, Any], params: Dict[str, Any]) -> SWAIGResponse:
    """Manual fallback handler for skills."""
    
    if skill_name == "datetime":
        return handle_datetime_skill(function, args)
    elif skill_name == "math":
        return handle_math_skill(function, args)
    elif skill_name == "joke":
        return handle_joke_skill(function, args)
    elif skill_name == "web_search":
        return handle_web_search_skill(function, args, params)
    elif skill_name in ["weather_api", "weather"]:
        return handle_weather_skill(function, args, params)
    else:
        return SWAIGResponse(response=f"Skill {skill_name} not implemented in manual handler")


def handle_datetime_skill(function: str, args: Dict[str, Any]) -> SWAIGResponse:
    """Handle datetime skill functions."""
    from datetime import datetime
    import pytz
    
    if function == "get_current_time":
        timezone_name = args.get("timezone", "UTC")
        try:
            tz = pytz.timezone(timezone_name)
            current_time = datetime.now(tz)
            return SWAIGResponse(
                response=f"The current time in {timezone_name} is {current_time.strftime('%I:%M %p')}"
            )
        except pytz.UnknownTimeZoneError:
            return SWAIGResponse(
                response=f"Unknown timezone: {timezone_name}"
            )
            
    elif function == "get_current_date":
        timezone_name = args.get("timezone", "UTC")
        try:
            tz = pytz.timezone(timezone_name)
            current_date = datetime.now(tz)
            return SWAIGResponse(
                response=f"Today's date is {current_date.strftime('%B %d, %Y')}"
            )
        except pytz.UnknownTimeZoneError:
            return SWAIGResponse(
                response=f"Unknown timezone: {timezone_name}"
            )
    
    elif function == "get_time_difference":
        timezone1 = args.get("timezone1", "UTC")
        timezone2 = args.get("timezone2", "UTC")
        try:
            tz1 = pytz.timezone(timezone1)
            tz2 = pytz.timezone(timezone2)
            now = datetime.now()
            time1 = tz1.localize(now)
            time2 = tz2.localize(now)
            diff_hours = (time2.utcoffset() - time1.utcoffset()).total_seconds() / 3600
            return SWAIGResponse(
                response=f"The time difference between {timezone1} and {timezone2} is {diff_hours} hours"
            )
        except pytz.UnknownTimeZoneError as e:
            return SWAIGResponse(
                response=f"Unknown timezone: {e}"
            )
    
    else:
        return SWAIGResponse(response=f"Unknown datetime function: {function}")


def handle_math_skill(function: str, args: Dict[str, Any]) -> SWAIGResponse:
    """Handle math skill functions."""
    if function == "calculate":
        expression = args.get("expression", "")
        if not expression:
            return SWAIGResponse(response="No expression provided")
        
        try:
            # Basic safety check - only allow certain characters
            allowed_chars = "0123456789+-*/()., "
            if not all(c in allowed_chars for c in expression):
                return SWAIGResponse(response="Invalid characters in expression")
            
            # Evaluate the expression
            result = eval(expression)
            return SWAIGResponse(response=f"The result is {result}")
        except Exception as e:
            return SWAIGResponse(response=f"Error calculating: {str(e)}")
    
    else:
        return SWAIGResponse(response=f"Unknown math function: {function}")


def handle_joke_skill(function: str, args: Dict[str, Any]) -> SWAIGResponse:
    """Handle joke skill functions."""
    if function == "tell_joke":
        # Simple joke implementation
        jokes = [
            "Why don't scientists trust atoms? Because they make up everything!",
            "Why did the scarecrow win an award? He was outstanding in his field!",
            "Why don't eggs tell jokes? They'd crack up!",
            "What do you call a fake noodle? An impasta!",
            "Why did the bicycle fall over? It was two tired!"
        ]
        import random
        return SWAIGResponse(response=random.choice(jokes))
    else:
        return SWAIGResponse(response=f"Unknown joke function: {function}")


def handle_web_search_skill(function: str, args: Dict[str, Any], params: Dict[str, Any]) -> SWAIGResponse:
    """Handle web search skill functions."""
    if function in ["web_search", "search_web"]:
        query = args.get("query", "")
        if not query:
            return SWAIGResponse(response="No search query provided")
        
        # Check for required parameters
        api_key = params.get("api_key") or os.getenv("GOOGLE_API_KEY")
        search_engine_id = params.get("search_engine_id") or os.getenv("GOOGLE_SEARCH_ENGINE_ID")
        
        if not api_key or not search_engine_id:
            return SWAIGResponse(
                response="Web search is not configured. Please provide API key and search engine ID."
            )
        
        # Here you would implement actual Google Custom Search API call
        # For now, return a placeholder response
        return SWAIGResponse(
            response=f"I would search for '{query}' but the search integration is not yet implemented."
        )
    
    else:
        return SWAIGResponse(response=f"Unknown web search function: {function}")


def handle_weather_skill(function: str, args: Dict[str, Any], params: Dict[str, Any]) -> SWAIGResponse:
    """Handle weather skill functions."""
    if function == "get_weather":
        location = args.get("location", "")
        if not location:
            return SWAIGResponse(response="No location provided")
        
        # Check for required parameters
        api_key = params.get("api_key") or os.getenv("OPENWEATHERMAP_API_KEY")
        
        if not api_key:
            return SWAIGResponse(
                response="Weather API is not configured. Please provide an API key."
            )
        
        # Here you would implement actual weather API call
        # For now, return a placeholder response
        return SWAIGResponse(
            response=f"I would get weather for '{location}' but the weather integration is not yet implemented."
        )
    
    else:
        return SWAIGResponse(response=f"Unknown weather function: {function}")