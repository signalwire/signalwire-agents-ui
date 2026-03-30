"""SWAIG (SignalWire AI Gateway) handler endpoints using ephemeral agents."""
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import logging
import json
import uuid
import asyncio
from datetime import datetime

from signalwire_agents import AgentBase
from signalwire_agents.core.function_result import SwaigFunctionResult
from ..core.database import get_db
from ..core.security import decode_jwt_token, decode_skill_jwt_token
from ..models import Agent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/swaig", tags=["swaig"])


class SWAIGRequest(BaseModel):
    """SWAIG function request from SignalWire."""
    function: str
    argument: Dict[str, Any]
    meta_data: Optional[Dict[str, Any]] = None
    global_data: Optional[Dict[str, Any]] = None
    call_id: Optional[str] = None
    call: Optional[Dict[str, Any]] = None
    vars: Optional[Dict[str, Any]] = None
    
    
class SWAIGResponse(BaseModel):
    """SWAIG function response to SignalWire."""
    response: Any
    action: Optional[List[Dict[str, Any]]] = None


def create_mock_post_data(request: SWAIGRequest) -> Dict[str, Any]:
    """Create a mock post_data structure for function execution."""
    # Use provided call_id or generate one
    call_id = request.call_id or f"swaig-{uuid.uuid4()}"
    
    # Use provided call data or create mock data
    call_data = request.call or {
        "call_id": call_id,
        "node_id": "swaig-node",
        "segment_id": "swaig-segment",
        "call_state": "active",
        "direction": "inbound",
        "type": "swaig",
        "from": "+1234567890",
        "to": "+1234567891",
        "headers": {},
        "vars": {}
    }
    
    # Build the post_data structure
    post_data = {
        "function": request.function,
        "argument": {
            "parsed": [request.argument],
            "raw": json.dumps(request.argument)
        },
        "call_id": call_id,
        "call": call_data,
        "vars": request.vars or {}
    }
    
    return post_data


async def execute_with_timeout(coro, timeout_seconds=30):
    """Execute a coroutine with a timeout."""
    try:
        return await asyncio.wait_for(coro, timeout=timeout_seconds)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail=f"Function execution timed out after {timeout_seconds} seconds"
        )


@router.post("/function")
async def handle_swaig_function(
    request: SWAIGRequest,
    req: Request,
    db: AsyncSession = Depends(get_db)
) -> SWAIGResponse:
    """Handle SWAIG function calls from SignalWire using ephemeral agents."""
    
    logger.info(f"SWAIG function endpoint called: function={request.function}, has_meta_data={bool(request.meta_data)}, has_token={'token' in (request.meta_data or {})}")
    
    # Extract authentication
    agent_id = None
    skill_name = None
    skill_params = {}
    
    # Try Basic auth first
    auth_header = req.headers.get("authorization", "")
    if auth_header.startswith("Basic "):
        import base64
        try:
            encoded = auth_header.split(" ")[1]
            decoded = base64.b64decode(encoded).decode()
            username, token = decoded.split(":", 1)
            
            token_data = decode_skill_jwt_token(token)
            agent_id = token_data.get("agent_id")
            skill_name = token_data.get("skill_name", "general")
            skill_params = token_data.get("skill_params", {})
            
        except Exception as e:
            logger.error(f"Failed to decode auth header: {e}")
            auth_header = None  # Fall through to other auth methods
    
    # Fall back to meta_data token if no Basic auth
    if not agent_id and request.meta_data and "token" in request.meta_data:
        try:
            token_data = decode_skill_jwt_token(request.meta_data["token"])
            agent_id = token_data.get("agent_id")
            skill_name = token_data.get("skill_name", "general")
            skill_params = token_data.get("skill_params", {})
        except Exception as e:
            logger.error(f"Failed to decode meta_data token: {e}", exc_info=True)
            raise HTTPException(status_code=401, detail="Invalid token")
    
    if not agent_id:
        raise HTTPException(status_code=401, detail="Missing authentication")
    
    logger.info(f"SWAIG function call: agent={agent_id}, skill={skill_name}, function={request.function}")
    
    # Handle knowledge base search functions
    # Check if this is a knowledge base search function based on skill_name or function name
    is_kb_search = False
    kb_id = None
    kb_config = {}
    
    # Check if this is a KB search based on skill_name from token
    if skill_name == "builtin_knowledge_base":
        is_kb_search = True
        # For builtin KB, we need to get the KB info from skill_params in the token
        kb_id = skill_params.get("knowledge_base_id")
        if kb_id:
            kb_config = {
                "response_prefix": skill_params.get("response_prefix", ""),
                "response_postfix": skill_params.get("response_postfix", ""),
                "no_results_message": skill_params.get("no_results_message", "No information found for '{query}'")
            }
    elif skill_name == "kb_search" and skill_params:
        is_kb_search = True
        kb_id = skill_params.get("knowledge_base_id")
        kb_config = {
            "response_prefix": skill_params.get("response_prefix", ""),
            "response_postfix": skill_params.get("response_postfix", ""),
            "no_results_message": skill_params.get("no_results_message", "No information found for '{query}'")
        }
    # Check if meta_data contains knowledge_base_id (for backward compatibility)
    elif request.meta_data and "knowledge_base_id" in request.meta_data:
        is_kb_search = True
        kb_id = request.meta_data["knowledge_base_id"]
        kb_config = {
            "response_prefix": request.meta_data.get("response_prefix", ""),
            "response_postfix": request.meta_data.get("response_postfix", ""),
            "no_results_message": request.meta_data.get("no_results_message", "No information found for '{query}'")
        }
    # Also handle legacy search_knowledge_base function
    elif request.function == "search_knowledge_base":
        is_kb_search = True
    
    if is_kb_search:
        # Get agent to check if KB is enabled
        from sqlalchemy import select
        from ..models import AgentKnowledgeBase, KnowledgeBase
        
        agent = await db.get(Agent, agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Check if agent has knowledge bases
        result = await db.execute(
            select(AgentKnowledgeBase)
            .where(AgentKnowledgeBase.agent_id == agent_id)
        )
        agent_kbs = result.scalars().all()
        
        if not agent_kbs:
            return SWAIGResponse(
                response="No knowledge bases are configured for this agent."
            )
        
        # Use the knowledge base skill directly
        from ..skills.knowledge_base_skill import KnowledgeBaseSkill
        kb_skill = KnowledgeBaseSkill(agent_id, db)
        
        # Extract arguments
        actual_args = request.argument
        if isinstance(actual_args, dict) and 'parsed' in actual_args:
            parsed_args = actual_args.get('parsed', [])
            if parsed_args and isinstance(parsed_args, list) and len(parsed_args) > 0:
                actual_args = parsed_args[0]
            else:
                actual_args = {}
        
        # Perform search with specific KB if provided
        if kb_id:
            # Search specific knowledge base
            try:
                result = await kb_skill.search_specific_knowledge_base(
                    kb_id=kb_id,
                    query=actual_args.get("query", ""),
                    count=actual_args.get("count", 3),
                    response_prefix=kb_config.get("response_prefix", ""),
                    response_postfix=kb_config.get("response_postfix", ""),
                    no_results_message=kb_config.get("no_results_message")
                )
            except Exception as e:
                logger.error(f"KB search error: {e}", exc_info=True)
                raise
        else:
            # Search all knowledge bases
            result = await kb_skill.search_knowledge_base(
                query=actual_args.get("query", ""),
                count=actual_args.get("count", 3)
            )
        
        return SWAIGResponse(
            response=result["answer"],
            action=None
        )
    
    # Create ephemeral agent
    ephemeral_agent = None
    try:
        # Create agent instance
        ephemeral_agent = AgentBase(name=f"swaig-{agent_id}-{uuid.uuid4().hex[:8]}")
        
        # For "general" auth, map function to skill and get params from agent config
        if skill_name == "general":
            function_to_skill = {
                # Datetime functions
                "get_current_time": "datetime",
                "get_current_date": "datetime",
                "get_time_difference": "datetime",
                # Math functions
                "calculate": "math",
                "solve_equation": "math",
                # Other skills
                "tell_joke": "joke",
                "search_web": "web_search",
                "web_search": "web_search",
                "search_wikipedia": "wikipedia_search",
                "get_weather": "weather",
                "get_forecast": "weather",
                "search_documents": "datasphere",
                "transfer_call": "swml_transfer",
                "scrape_url": "spider",
                "crawl_website": "spider",
                "get_trivia": "api_ninjas_trivia",
                "call_mcp_tool": "mcp_gateway",
                "play_background_file": "play_background_file",
                "stop_background_file": "play_background_file",
            }
            
            # Define internal skills that don't map to external skill modules
            internal_skills = {
                "builtin_knowledge_base": lambda fn: True,  # All unmapped functions default to KB for now
                # Future internal skills can be added here with their detection logic
                # "builtin_workflow": lambda fn: fn.startswith("workflow_"),
                # "builtin_integration": lambda fn: fn.startswith("integrate_"),
            }
            
            mapped_skill = function_to_skill.get(request.function)
            if mapped_skill:
                skill_name = mapped_skill
            else:
                # Check if it's an internal skill
                for internal_skill, detection_func in internal_skills.items():
                    if detection_func(request.function):
                        skill_name = internal_skill
                        logger.info(f"Function {request.function} detected as {internal_skill}")
                        break
                else:
                    # Unknown function
                    logger.warning(f"Function {request.function} not found in mappings or internal skills")
                    skill_name = "builtin_knowledge_base"  # Default to KB for backward compatibility
            
            # Get the actual skill params from the agent's configuration
            if agent_id and skill_name != "general":
                agent = await db.get(Agent, agent_id)
                if agent and agent.config.get('skills'):
                    for skill_config in agent.config['skills']:
                        if skill_config.get('name') == skill_name:
                            skill_params = skill_config.get('params', {})
                            break
        
        # Add the skill to the agent (only if it's not internal)
        if skill_name not in ["general", "builtin_knowledge_base"]:
            try:
                ephemeral_agent.add_skill(skill_name, skill_params)
            except Exception as e:
                logger.error(f"Failed to add skill {skill_name}: {e}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to load skill: {str(e)}"
                )
        
        # Skills are automatically registered when added, no need to initialize
        
        # Create mock post_data
        post_data = create_mock_post_data(request)
        
        # Extract the actual arguments from the nested structure
        # SWAIG sends arguments in a nested format with 'parsed' and 'raw'
        actual_args = request.argument
        if isinstance(actual_args, dict) and 'parsed' in actual_args:
            # Extract from the parsed array
            parsed_args = actual_args.get('parsed', [])
            if parsed_args and isinstance(parsed_args, list) and len(parsed_args) > 0:
                actual_args = parsed_args[0]
            else:
                actual_args = {}
        
        logger.info(f"Extracted arguments for function {request.function}: {actual_args}")
        
        # Execute the function through the agent's handler
        # Call on_function_call - it might be sync or async
        result = ephemeral_agent.on_function_call(
            request.function,
            actual_args,
            post_data
        )
        
        # If it's a coroutine, await it with timeout
        if asyncio.iscoroutine(result):
            result = await execute_with_timeout(result, timeout_seconds=30)
        
        # Convert result to SWAIG response format
        if isinstance(result, SwaigFunctionResult):
            # Handle SwaigFunctionResult
            response = SWAIGResponse(
                response=result.response,
                action=result.action
            )
            logger.info(f"SWAIG function {request.function} returned SwaigFunctionResult: {result.response[:100]}...")
        elif isinstance(result, dict):
            # Handle dict response
            if "response" in result:
                response = SWAIGResponse(
                    response=result["response"],
                    action=result.get("action")
                )
            else:
                # Wrap dict as response
                response = SWAIGResponse(response=result)
            logger.info(f"SWAIG function {request.function} returned dict: {str(result)[:100]}...")
        else:
            # Handle string or other types
            response = SWAIGResponse(response=str(result))
            logger.info(f"SWAIG function {request.function} returned: {str(result)[:100]}...")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing SWAIG function: {e}", exc_info=True)
        return SWAIGResponse(
            response=f"Error executing function: {str(e)}"
        )
    finally:
        # Clean up the ephemeral agent
        if ephemeral_agent:
            try:
                # AgentBase doesn't have a cleanup method
                del ephemeral_agent
            except Exception as e:
                logger.error(f"Error cleaning up ephemeral agent: {e}")


@router.post("/test")
async def test_skill_function(
    skill_name: str,
    skill_params: Dict[str, Any],
    function_name: str,
    test_args: Dict[str, Any],
    req: Request
) -> Dict[str, Any]:
    """Test a skill function using an ephemeral agent.
    
    This endpoint is used by the UI to test skill configurations.
    """
    # Verify authentication — cookie first, then Bearer header
    from ..core.cookies import get_jwt_from_cookie
    token = get_jwt_from_cookie(req)
    if not token:
        auth_header = req.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
    if not token:
        raise HTTPException(status_code=401, detail="Missing authentication")
    try:
        decode_jwt_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    logger.info(f"Testing skill function: skill={skill_name}, function={function_name}")
    
    start_time = datetime.now()
    ephemeral_agent = None
    
    try:
        # Create ephemeral agent for testing
        ephemeral_agent = AgentBase(name=f"test-{skill_name}-{uuid.uuid4().hex[:8]}")
        
        # Add the skill
        success, error = ephemeral_agent.add_skill(skill_name, skill_params)
        if not success:
            return {
                "success": False,
                "error": f"Failed to load skill: {error}",
                "execution_time": (datetime.now() - start_time).total_seconds()
            }
        
        # Initialize the agent
        ephemeral_agent.initialize()
        
        # Create mock post_data for testing
        test_request = SWAIGRequest(
            function=function_name,
            argument=test_args,
            call_id=f"test-{uuid.uuid4()}",
            call={
                "call_id": f"test-{uuid.uuid4()}",
                "node_id": "test-node",
                "segment_id": "test-segment", 
                "call_state": "testing",
                "direction": "inbound",
                "type": "test",
                "from": "+1234567890",
                "to": "+1234567891",
                "headers": {},
                "vars": {}
            },
            vars={}
        )
        
        post_data = create_mock_post_data(test_request)
        
        # Execute with timeout
        result = await execute_with_timeout(
            ephemeral_agent.on_function_call(
                function_name=function_name,
                args=test_args,
                post_data=post_data
            ),
            timeout_seconds=30
        )
        
        # Format the result
        execution_time = (datetime.now() - start_time).total_seconds()
        
        if isinstance(result, SwaigFunctionResult):
            return {
                "success": True,
                "result": {
                    "action": result.action or "return",
                    "response": result.response,
                    "metadata": getattr(result, 'metadata', {})
                },
                "execution_time": execution_time
            }
        elif isinstance(result, dict):
            return {
                "success": True,
                "result": result,
                "execution_time": execution_time
            }
        else:
            return {
                "success": True,
                "result": {
                    "action": "return",
                    "response": str(result)
                },
                "execution_time": execution_time
            }
            
    except asyncio.TimeoutError:
        return {
            "success": False,
            "error": "Function execution timed out after 30 seconds",
            "execution_time": 30.0
        }
    except Exception as e:
        logger.error(f"Error testing skill function: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "execution_time": (datetime.now() - start_time).total_seconds()
        }
    finally:
        # Clean up
        if ephemeral_agent:
            try:
                ephemeral_agent.cleanup()
            except Exception as e:
                logger.error(f"Error cleaning up test agent: {e}")