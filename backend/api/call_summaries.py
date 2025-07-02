"""Call summaries API endpoints."""
from typing import Dict, Any, List, Optional
from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from pydantic import BaseModel

from ..core.database import get_db
from ..models import CallSummary, Agent
from ..core.security import verify_jwt_token

router = APIRouter(prefix="/call-summaries", tags=["call-summaries"])


class CallSummaryWithAgentResponse(BaseModel):
    """Call summary response with agent info."""
    id: str
    agent_id: UUID
    agent_name: str  # Added agent name
    call_id: str
    ai_session_id: Optional[str]
    call_start_date: Optional[int]
    call_end_date: Optional[int]
    caller_id_name: Optional[str]
    caller_id_number: Optional[str]
    post_prompt_summary: Optional[str]
    total_minutes: Optional[float]
    total_input_tokens: Optional[int]
    total_output_tokens: Optional[int]
    total_cost: Optional[float]
    has_recording: bool  # Added recording indicator
    created_at: datetime


class CallSummaryDetailResponse(CallSummaryWithAgentResponse):
    """Detailed call summary with full logs."""
    call_log: List[Dict[str, Any]]
    swaig_log: List[Dict[str, Any]]
    raw_data: Dict[str, Any]


@router.get("")
async def get_all_summaries(
    skip: int = 0,
    limit: int = 20,
    agent_id: Optional[UUID] = Query(None, description="Filter by agent ID"),
    has_recording: Optional[bool] = Query(None, description="Filter by recording status"),
    caller_number: Optional[str] = Query(None, description="Filter by caller number"),
    start_date: Optional[int] = Query(None, description="Filter by start date (Unix timestamp)"),
    end_date: Optional[int] = Query(None, description="Filter by end date (Unix timestamp)"),
    sort_by: str = Query("created_at", description="Sort field: created_at, duration, agent_name"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> List[CallSummaryWithAgentResponse]:
    """Get all call summaries with filtering and sorting."""
    
    # Build query
    query = select(CallSummary).options(joinedload(CallSummary.agent))
    
    # Apply filters
    filters = []
    if agent_id:
        filters.append(CallSummary.agent_id == agent_id)
    if caller_number:
        filters.append(CallSummary.caller_id_number.ilike(f"%{caller_number}%"))
    if start_date:
        filters.append(CallSummary.call_start_date >= start_date)
    if end_date:
        filters.append(CallSummary.call_end_date <= end_date)
    
    if filters:
        query = query.where(and_(*filters))
    
    # Apply sorting
    if sort_by == "duration":
        order_field = CallSummary.total_minutes
    elif sort_by == "agent_name":
        query = query.join(Agent)
        order_field = Agent.name
    else:
        order_field = CallSummary.created_at
    
    if sort_order == "asc":
        query = query.order_by(order_field.asc())
    else:
        query = query.order_by(order_field.desc())
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    summaries = result.scalars().all()
    
    # Filter by recording status if specified
    if has_recording is not None:
        filtered_summaries = []
        for summary in summaries:
            # Check if recording exists in raw_data
            recording_exists = False
            if summary.raw_data and isinstance(summary.raw_data, dict):
                conversation = summary.raw_data.get("conversation", [])
                recording_exists = any(
                    msg.get("type") == "recording" or 
                    msg.get("recording_url") is not None
                    for msg in conversation
                )
            
            if has_recording == recording_exists:
                filtered_summaries.append(summary)
        summaries = filtered_summaries
    
    return [
        CallSummaryWithAgentResponse(
            id=summary.id,
            agent_id=summary.agent_id,
            agent_name=summary.agent.name if summary.agent else "Unknown Agent",
            call_id=summary.call_id,
            ai_session_id=summary.ai_session_id,
            call_start_date=summary.call_start_date,
            call_end_date=summary.call_end_date,
            caller_id_name=summary.caller_id_name,
            caller_id_number=summary.caller_id_number,
            post_prompt_summary=summary.post_prompt_summary,
            total_minutes=summary.total_minutes,
            total_input_tokens=summary.total_input_tokens,
            total_output_tokens=summary.total_output_tokens,
            total_cost=summary.total_cost,
            has_recording=bool(summary.raw_data and any(
                msg.get("type") == "recording" or msg.get("recording_url") is not None
                for msg in summary.raw_data.get("conversation", [])
            )),
            created_at=summary.created_at
        )
        for summary in summaries
    ]


@router.get("/{summary_id}")
async def get_summary_detail(
    summary_id: str,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> CallSummaryDetailResponse:
    """Get detailed call summary including logs."""
    # Get summary with agent info
    result = await db.execute(
        select(CallSummary)
        .options(joinedload(CallSummary.agent))
        .where(CallSummary.id == summary_id)
    )
    summary = result.scalar_one_or_none()
    
    if not summary:
        raise HTTPException(status_code=404, detail="Call summary not found")
    
    # Extract call log from raw data
    call_log = []
    if summary.raw_data:
        # Try different possible field names in order of preference:
        # 1. raw_call_log - most complete log
        # 2. call_log - cleaned/processed log
        # 3. conversation - legacy field name
        call_log = summary.raw_data.get("raw_call_log", 
                   summary.raw_data.get("call_log", 
                   summary.raw_data.get("conversation", [])))
    
    # Extract SWAIG log
    swaig_log = summary.swaig_log or []
    
    return CallSummaryDetailResponse(
        id=summary.id,
        agent_id=summary.agent_id,
        agent_name=summary.agent.name if summary.agent else "Unknown Agent",
        call_id=summary.call_id,
        ai_session_id=summary.ai_session_id,
        call_start_date=summary.call_start_date,
        call_end_date=summary.call_end_date,
        caller_id_name=summary.caller_id_name,
        caller_id_number=summary.caller_id_number,
        post_prompt_summary=summary.post_prompt_summary,
        total_minutes=summary.total_minutes,
        total_input_tokens=summary.total_input_tokens,
        total_output_tokens=summary.total_output_tokens,
        total_cost=summary.total_cost,
        has_recording=bool(summary.raw_data and any(
            msg.get("type") == "recording" or msg.get("recording_url") is not None
            for msg in summary.raw_data.get("conversation", [])
        )),
        created_at=summary.created_at,
        call_log=call_log,
        swaig_log=swaig_log,
        raw_data=summary.raw_data or {}
    )