"""Skills testing API endpoints."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import logging
import json
import uuid
import asyncio
from datetime import datetime

from signalwire_agents import AgentBase
from signalwire_agents.core.function_result import SwaigFunctionResult
from ..auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/skills/test", tags=["skills-test"])


class SkillTestRequest(BaseModel):
    """Request model for testing a skill function."""
    skill_name: str = Field(..., description="Name of the skill to test")
    skill_params: Dict[str, Any] = Field(default_factory=dict, description="Skill configuration parameters")
    function_name: str = Field(..., description="Name of the function to test")
    test_args: Dict[str, Any] = Field(default_factory=dict, description="Arguments to pass to the function")


class SkillTestResponse(BaseModel):
    """Response model for skill test results."""
    success: bool = Field(..., description="Whether the test succeeded")
    result: Optional[Dict[str, Any]] = Field(None, description="Function result if successful")
    error: Optional[str] = Field(None, description="Error message if failed")
    execution_time: float = Field(..., description="Time taken to execute in seconds")
    logs: List[str] = Field(default_factory=list, description="Execution logs")


class SkillFunctionsResponse(BaseModel):
    """Response model for listing skill functions."""
    skill_name: str
    functions: List[Dict[str, Any]]


def create_test_post_data(function_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """Create a mock post_data structure for testing."""
    call_id = f"test-{uuid.uuid4()}"
    
    return {
        "function": function_name,
        "argument": {
            "parsed": [args],
            "raw": json.dumps(args)
        },
        "call_id": call_id,
        "call": {
            "call_id": call_id,
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
        "vars": {}
    }


async def execute_with_timeout(coro, timeout_seconds=30):
    """Execute a coroutine with a timeout."""
    try:
        return await asyncio.wait_for(coro, timeout=timeout_seconds)
    except asyncio.TimeoutError:
        raise TimeoutError(f"Function execution timed out after {timeout_seconds} seconds")


@router.post("/", response_model=SkillTestResponse)
async def test_skill_function(
    request: SkillTestRequest,
    current_user=Depends(get_current_user)
) -> SkillTestResponse:
    """Test a skill function using an ephemeral agent."""
    
    logger.info(f"Testing skill function: skill={request.skill_name}, function={request.function_name}")
    logger.info(f"Skill params received: {request.skill_params}")
    logger.info(f"Test args: {request.test_args}")
    
    start_time = datetime.now()
    ephemeral_agent = None
    logs = []
    
    try:
        # Create ephemeral agent for testing
        agent_name = f"test-{request.skill_name}-{uuid.uuid4().hex[:8]}"
        logs.append(f"Creating test agent: {agent_name}")
        ephemeral_agent = AgentBase(name=agent_name)
        
        # Add the skill
        logs.append(f"Adding skill '{request.skill_name}' with params: {list(request.skill_params.keys())}")
        try:
            ephemeral_agent.add_skill(request.skill_name, request.skill_params)
        except Exception as e:
            return SkillTestResponse(
                success=False,
                error=f"Failed to load skill: {str(e)}",
                execution_time=(datetime.now() - start_time).total_seconds(),
                logs=logs
            )
        
        # Skills are automatically registered when added
        logs.append("Skills loaded and ready for testing")
        
        # Create mock post_data for testing
        post_data = create_test_post_data(request.function_name, request.test_args)
        logs.append(f"Executing function '{request.function_name}' with args: {request.test_args}")
        
        # Execute the function
        try:
            # Call on_function_call - it might be sync or async
            result = ephemeral_agent.on_function_call(
                request.function_name,
                request.test_args,
                post_data
            )
            
            # If it's a coroutine, await it with timeout
            if asyncio.iscoroutine(result):
                result = await execute_with_timeout(result, timeout_seconds=30)
        except asyncio.TimeoutError:
            raise TimeoutError("Function execution timed out after 30 seconds")
        
        # Format the result
        execution_time = (datetime.now() - start_time).total_seconds()
        logs.append(f"Function executed successfully in {execution_time:.3f}s")
        
        if isinstance(result, SwaigFunctionResult):
            return SkillTestResponse(
                success=True,
                result={
                    "action": result.action or "return",
                    "response": result.response,
                    "metadata": getattr(result, 'metadata', {})
                },
                execution_time=execution_time,
                logs=logs
            )
        elif isinstance(result, dict):
            return SkillTestResponse(
                success=True,
                result=result,
                execution_time=execution_time,
                logs=logs
            )
        else:
            return SkillTestResponse(
                success=True,
                result={
                    "action": "return",
                    "response": str(result)
                },
                execution_time=execution_time,
                logs=logs
            )
            
    except TimeoutError as e:
        logs.append(str(e))
        return SkillTestResponse(
            success=False,
            error=str(e),
            execution_time=30.0,
            logs=logs
        )
    except Exception as e:
        error_msg = str(e)
        logs.append(f"Error: {error_msg}")
        logger.error(f"Error testing skill function: {e}", exc_info=True)
        return SkillTestResponse(
            success=False,
            error=error_msg,
            execution_time=(datetime.now() - start_time).total_seconds(),
            logs=logs
        )
    finally:
        # Clean up
        if ephemeral_agent:
            try:
                logs.append("Test agent cleanup completed")
                # AgentBase doesn't have a cleanup method
                del ephemeral_agent
            except Exception as e:
                logs.append(f"Warning: Error during cleanup: {e}")
                logger.error(f"Error cleaning up test agent: {e}")


@router.post("/functions/{skill_name}", response_model=SkillFunctionsResponse)
async def get_skill_functions(
    skill_name: str,
    skill_params: Dict[str, Any] = {},
    current_user=Depends(get_current_user)
) -> SkillFunctionsResponse:
    """Get available functions for a skill."""
    
    ephemeral_agent = None
    try:
        # Create an ephemeral agent to load the skill and get its functions
        ephemeral_agent = AgentBase(name=f"inspect-{skill_name}")
        
        # Use the actual configured parameters from the agent
        try:
            ephemeral_agent.add_skill(skill_name, skill_params)
        except Exception as e:
            logger.error(f"Failed to add skill {skill_name}: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to load skill '{skill_name}': {str(e)}"
            )
        
        # Skills are automatically registered when added, no need to initialize
        
        # Get the registered functions from the agent's tool registry
        functions = []
        
        # Access the tool registry and get all functions
        if hasattr(ephemeral_agent, '_tool_registry'):
            all_functions = ephemeral_agent._tool_registry.get_all_functions()
            
            for func_name, func_obj in all_functions.items():
                # Handle both SWAIGFunction objects and dict definitions
                if isinstance(func_obj, dict):
                    # DataMap function
                    func_info = {
                        "name": func_name,
                        "description": func_obj.get("description", ""),
                        "parameters": func_obj.get("parameters", {})
                    }
                else:
                    # Regular function object
                    func_info = {
                        "name": func_name,
                        "description": func_obj.description if hasattr(func_obj, 'description') else "",
                        "parameters": func_obj.parameters if hasattr(func_obj, 'parameters') else {}
                    }
                
                # Convert parameters to arguments format
                func_info["arguments"] = []
                
                # Check if parameters are in JSON Schema format (with properties)
                if isinstance(func_info["parameters"], dict):
                    if "properties" in func_info["parameters"]:
                        # JSON Schema format
                        for param_name, param_schema in func_info["parameters"]["properties"].items():
                            arg_info = {
                                "name": param_name,
                                "type": param_schema.get("type", "string"),
                                "description": param_schema.get("description", ""),
                                "required": param_name in func_info["parameters"].get("required", [])
                            }
                            if "enum" in param_schema:
                                arg_info["enum"] = param_schema["enum"]
                            if "default" in param_schema:
                                arg_info["default"] = param_schema["default"]
                            func_info["arguments"].append(arg_info)
                    else:
                        # Simple format (parameter name -> schema)
                        for param_name, param_schema in func_info["parameters"].items():
                            if isinstance(param_schema, dict):
                                arg_info = {
                                    "name": param_name,
                                    "type": param_schema.get("type", "string"),
                                    "description": param_schema.get("description", ""),
                                    "required": param_schema.get("required", False)
                                }
                                if "enum" in param_schema:
                                    arg_info["enum"] = param_schema["enum"]
                                if "default" in param_schema:
                                    arg_info["default"] = param_schema["default"]
                                func_info["arguments"].append(arg_info)
                
                functions.append(func_info)
        
        return SkillFunctionsResponse(
            skill_name=skill_name,
            functions=functions
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting skill functions: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get skill functions: {str(e)}"
        )
    finally:
        # Clean up
        if ephemeral_agent:
            try:
                del ephemeral_agent
            except Exception as e:
                logger.error(f"Error cleaning up inspection agent: {e}")