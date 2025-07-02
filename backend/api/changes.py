"""Server-Sent Events endpoint for real-time change notifications."""
import asyncio
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Set
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sse_starlette.sse import EventSourceResponse

from ..core.database import get_db
from ..auth import get_current_user_optional
from ..models import User

router = APIRouter(prefix="/changes", tags=["changes"])

# Store last known state per connection
class ChangeTracker:
    def __init__(self):
        self.last_check_time: Dict[str, datetime] = {}
        self.active_connections: Set[str] = set()
    
    def register_connection(self, connection_id: str):
        self.active_connections.add(connection_id)
        self.last_check_time[connection_id] = datetime.utcnow()
    
    def unregister_connection(self, connection_id: str):
        self.active_connections.discard(connection_id)
        self.last_check_time.pop(connection_id, None)
    
    def get_last_check(self, connection_id: str) -> datetime:
        return self.last_check_time.get(connection_id, datetime.utcnow() - timedelta(minutes=5))
    
    def update_last_check(self, connection_id: str):
        self.last_check_time[connection_id] = datetime.utcnow()

change_tracker = ChangeTracker()


async def check_for_changes(db: AsyncSession, since: datetime, current_user_id: Optional[str] = None) -> Dict[str, Any]:
    """Check for agent changes since the given timestamp."""
    # Query for changed agents
    query = """
        SELECT 
            id, 
            name, 
            updated_at, 
            updated_by,
            version
        FROM agents 
        WHERE updated_at > :since
        ORDER BY updated_at DESC
        LIMIT 100
    """
    
    result = await db.execute(text(query), {"since": since})
    changed_agents = []
    
    for row in result:
        changed_agents.append({
            "id": str(row.id),
            "name": row.name,
            "updated_at": row.updated_at.isoformat(),
            "updated_by": row.updated_by,
            "version": row.version,
            "is_own_change": row.updated_by == current_user_id if current_user_id else False
        })
    
    # Get count of total changes
    count_query = """
        SELECT COUNT(*) as count
        FROM agents 
        WHERE updated_at > :since
    """
    count_result = await db.execute(text(count_query), {"since": since})
    total_changes = count_result.scalar()
    
    return {
        "changes": changed_agents,
        "total_count": total_changes,
        "since": since.isoformat(),
        "current_time": datetime.utcnow().isoformat()
    }


@router.get("/stream")
async def changes_stream(
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Stream agent changes via Server-Sent Events.
    Sends updates when agents are created, updated, or deleted.
    """
    connection_id = f"{current_user.id if current_user else 'anonymous'}_{datetime.utcnow().timestamp()}"
    change_tracker.register_connection(connection_id)
    
    async def event_generator():
        try:
            # Send initial connection event
            yield {
                "event": "connected",
                "data": json.dumps({
                    "connection_id": connection_id,
                    "user_id": current_user.id if current_user else None
                })
            }
            
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                
                # Get changes since last check
                last_check = change_tracker.get_last_check(connection_id)
                changes = await check_for_changes(
                    db, 
                    last_check, 
                    current_user.id if current_user else None
                )
                
                # Only send if there are changes
                if changes["changes"]:
                    yield {
                        "event": "agent-changes",
                        "data": json.dumps(changes)
                    }
                
                # Update last check time
                change_tracker.update_last_check(connection_id)
                
                # Wait before next check (5 seconds)
                await asyncio.sleep(5)
                
        except asyncio.CancelledError:
            # Client disconnected
            pass
        finally:
            change_tracker.unregister_connection(connection_id)
    
    return EventSourceResponse(event_generator())


@router.get("/check")
async def check_changes(
    since: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Check for changes since a given timestamp.
    This is a fallback for clients that can't use SSE.
    """
    # Parse since timestamp or default to 5 minutes ago
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
        except:
            since_dt = datetime.utcnow() - timedelta(minutes=5)
    else:
        since_dt = datetime.utcnow() - timedelta(minutes=5)
    
    changes = await check_for_changes(
        db, 
        since_dt, 
        current_user.id if current_user else None
    )
    
    return changes