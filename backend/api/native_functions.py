"""Native functions API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
import logging
from pydantic import BaseModel

from ..core.security import verify_jwt_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/native-functions", tags=["native-functions"])


class NativeFunctionInfo(BaseModel):
    """Native function information model."""
    name: str
    description: str
    category: str = "general"


# These are the actual native functions available in SignalWire AI agents
AVAILABLE_NATIVE_FUNCTIONS = [
    # Response control
    NativeFunctionInfo(
        name="adjust_response_latency",
        description="How long you will wait for the user to stop talking. Slower speed waits longer.",
        category="control"
    ),
    
    # Time functions
    NativeFunctionInfo(
        name="check_time",
        description="Get the current time.",
        category="utility"
    ),
    
    # Wait functions
    NativeFunctionInfo(
        name="wait_for_user",
        description="Use this function only when the user asks you to wait, hold on, or the equivalent. (the AI will wait until you speak again)",
        category="control"
    ),
    NativeFunctionInfo(
        name="wait_seconds",
        description="Wait a number of seconds then resume",
        category="control"
    ),
]


@router.get("/", response_model=List[NativeFunctionInfo])
async def get_native_functions(
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> List[NativeFunctionInfo]:
    """Get all available native functions.
    
    TODO: This should eventually query the SignalWire SDK to get the actual
    list of available native functions dynamically.
    """
    return AVAILABLE_NATIVE_FUNCTIONS


@router.get("/categories", response_model=Dict[str, List[NativeFunctionInfo]])
async def get_native_functions_by_category(
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> Dict[str, List[NativeFunctionInfo]]:
    """Get native functions grouped by category."""
    categories: Dict[str, List[NativeFunctionInfo]] = {}
    
    for func in AVAILABLE_NATIVE_FUNCTIONS:
        if func.category not in categories:
            categories[func.category] = []
        categories[func.category].append(func)
    
    return categories