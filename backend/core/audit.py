"""Audit logging utilities."""
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from typing import Dict, Any, Optional
import json


async def create_audit_log(
    db: AsyncSession,
    user_id: str,
    action: str,
    description: str,
    metadata: Optional[Dict[str, Any]] = None
) -> None:
    """Create an audit log entry."""
    from sqlalchemy import text
    await db.execute(
        text("""
        INSERT INTO audit_logs (user_id, action, description, metadata, timestamp)
        VALUES (:user_id, :action, :description, :metadata, :timestamp)
        """),
        {
            "user_id": user_id,
            "action": action,
            "description": description,
            "metadata": json.dumps(metadata or {}),
            "timestamp": datetime.utcnow()
        }
    )
    await db.commit()


def get_request_metadata(request: Request) -> Dict[str, Any]:
    """Extract metadata from request for audit logging."""
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "method": request.method,
        "path": request.url.path
    }