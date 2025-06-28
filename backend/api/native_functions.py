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


# TODO: This list should be dynamically loaded from the SignalWire SDK
# For now, providing a comprehensive list of known native functions
AVAILABLE_NATIVE_FUNCTIONS = [
    # Flow control
    NativeFunctionInfo(
        name="wait_for_user",
        description="Wait for user input before continuing",
        category="flow"
    ),
    NativeFunctionInfo(
        name="next_step",
        description="Move to the next step in a structured flow",
        category="flow"
    ),
    NativeFunctionInfo(
        name="change_context",
        description="Switch to a different conversation context",
        category="flow"
    ),
    NativeFunctionInfo(
        name="end_conversation",
        description="End the conversation gracefully",
        category="flow"
    ),
    
    # Call control
    NativeFunctionInfo(
        name="transfer",
        description="Transfer the call to another number",
        category="call"
    ),
    NativeFunctionInfo(
        name="end_call",
        description="End the current call",
        category="call"
    ),
    NativeFunctionInfo(
        name="hangup",
        description="Hang up the call immediately",
        category="call"
    ),
    
    # Audio
    NativeFunctionInfo(
        name="play_audio",
        description="Play an audio file",
        category="audio"
    ),
    NativeFunctionInfo(
        name="record_audio",
        description="Record audio from the user",
        category="audio"
    ),
    NativeFunctionInfo(
        name="play_background_file",
        description="Play background music or audio",
        category="audio"
    ),
    NativeFunctionInfo(
        name="stop_background_file",
        description="Stop playing background audio",
        category="audio"
    ),
    
    # Utilities
    NativeFunctionInfo(
        name="check_time",
        description="Check the current time",
        category="utility"
    ),
    NativeFunctionInfo(
        name="get_date",
        description="Get the current date",
        category="utility"
    ),
    NativeFunctionInfo(
        name="log_message",
        description="Log a message for debugging",
        category="utility"
    ),
    
    # Communication
    NativeFunctionInfo(
        name="send_sms",
        description="Send an SMS message",
        category="communication"
    ),
    NativeFunctionInfo(
        name="send_email",
        description="Send an email",
        category="communication"
    ),
    
    # User interaction
    NativeFunctionInfo(
        name="get_digits",
        description="Collect DTMF digits from the user",
        category="interaction"
    ),
    NativeFunctionInfo(
        name="get_speech",
        description="Collect speech input from the user",
        category="interaction"
    ),
    NativeFunctionInfo(
        name="pause",
        description="Pause for a specified duration",
        category="interaction"
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