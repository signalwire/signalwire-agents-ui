"""Post-prompt data collection handler."""
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import logging
import uuid
from datetime import datetime

from ..core.database import get_db
from ..core.security import decode_skill_jwt_token
from ..models import CallSummary, Agent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/post-prompt", tags=["post-prompt"])


@router.post("/receive")
async def receive_post_prompt(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Receive and store post-prompt data from SignalWire."""
    
    try:
        # Get raw body
        data = await request.json()
        
        # Extract token from global_data
        global_data = data.get("global_data", {})
        token = global_data.get("auth_token")
        
        if not token:
            logger.error("No auth_token found in global_data")
            raise HTTPException(status_code=401, detail="Missing authentication token")
        
        # Validate token
        try:
            token_data = decode_skill_jwt_token(token)
            agent_id = token_data.get("agent_id")
        except Exception as e:
            logger.error(f"Failed to decode post-prompt token: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        if not agent_id:
            raise HTTPException(status_code=401, detail="Invalid token - missing agent_id")
        
        # Verify agent exists
        agent = await db.get(Agent, agent_id)
        if not agent:
            logger.error(f"Agent not found: {agent_id}")
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Extract key fields from post data
        call_id = data.get("call_id")
        if not call_id:
            logger.error("No call_id in post-prompt data")
            raise HTTPException(status_code=400, detail="Missing call_id")
        
        # Check if we already have this call summary
        existing = await db.execute(
            select(CallSummary).where(CallSummary.call_id == call_id)
        )
        if existing.scalar_one_or_none():
            logger.info(f"Call summary already exists for call_id: {call_id}")
            return {"status": "already_processed"}
        
        # Extract summary text
        post_prompt_data = data.get("post_prompt_data", {})
        summary_text = post_prompt_data.get("raw", "")
        
        # Calculate cost based on token usage
        total_input_tokens = data.get("total_input_tokens", 0)
        total_output_tokens = data.get("total_output_tokens", 0)
        
        # Rough cost estimation (adjust based on actual pricing)
        # Example: $0.01 per 1K input tokens, $0.03 per 1K output tokens
        total_cost = (total_input_tokens * 0.00001) + (total_output_tokens * 0.00003)
        
        # Create and store summary
        summary = CallSummary(
            id=str(uuid.uuid4()),
            agent_id=agent_id,
            call_id=call_id,
            ai_session_id=data.get("ai_session_id"),
            call_start_date=data.get("call_start_date"),
            call_end_date=data.get("call_end_date"),
            caller_id_name=data.get("caller_id_name", "Unknown"),
            caller_id_number=data.get("caller_id_number", "Unknown"),
            post_prompt_summary=summary_text,
            call_log=data.get("call_log", []),
            swaig_log=data.get("swaig_log", []),
            total_minutes=data.get("total_minutes", 0),
            total_input_tokens=total_input_tokens,
            total_output_tokens=total_output_tokens,
            total_cost=total_cost,
            raw_data=data
        )
        
        db.add(summary)
        await db.commit()
        
        logger.info(f"Stored call summary for agent {agent_id}, call {call_id}")
        
        return {
            "status": "success",
            "summary_id": summary.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing post-prompt data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{agent_id}")
async def receive_post_prompt_by_agent(
    agent_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Alternative endpoint that includes agent_id in URL for easier routing."""
    
    try:
        # Get raw body
        data = await request.json()
        
        # Inject agent_id into token validation
        data["_agent_id_from_url"] = agent_id
        
        # Verify agent exists first
        agent = await db.get(Agent, agent_id)
        if not agent:
            logger.error(f"Agent not found: {agent_id}")
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Process as normal but use URL agent_id for validation
        return await receive_post_prompt(request, db)
        
    except Exception as e:
        logger.error(f"Error in agent-specific post-prompt handler: {e}", exc_info=True)
        raise