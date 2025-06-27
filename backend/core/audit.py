"""Audit logging utilities."""
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from typing import Dict, Any, Optional


async def create_audit_log(
    db: AsyncSession,
    action: str,
    entity_type: str,
    entity_id: str,
    metadata: Optional[Dict[str, Any]] = None,
    auth_token: Optional[str] = None
) -> None:
    """Create an audit log entry."""
    await db.execute(
        """
        INSERT INTO audit_log (timestamp, action, entity_type, entity_id, metadata, auth_token)
        VALUES ($1, $2, $3, $4, $5, $6)
        """,
        datetime.utcnow(), action, entity_type, entity_id, metadata or {}, auth_token
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