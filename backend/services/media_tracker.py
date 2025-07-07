"""Media usage tracking service."""
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select
from uuid import UUID


async def extract_media_urls(config: Dict[str, Any]) -> Dict[str, str]:
    """Extract media URLs from agent config and their parameter names."""
    media_urls = {}
    
    # Check params for media URLs
    params = config.get('params', {})
    media_params = [
        'background_file', 'hold_music',
        'video_talking_file', 'video_idle_file', 'video_listening_file'
    ]
    
    for param in media_params:
        if param in params and params[param]:
            media_urls[param] = params[param]
    
    return media_urls


async def update_media_usage(
    db: AsyncSession,
    agent_id: UUID,
    config: Dict[str, Any]
) -> None:
    """Update media usage tracking for an agent."""
    from ..models import MediaFile, MediaUsage
    
    # Extract media URLs from config
    media_urls = await extract_media_urls(config)
    
    # Delete existing usage records for this agent
    await db.execute(
        delete(MediaUsage).where(MediaUsage.agent_id == agent_id)
    )
    
    # Insert new usage records
    for param_name, url in media_urls.items():
        # Extract filename from URL to find media file
        # URL format: https://domain/media/{filename}
        match = re.search(r'/media/([^/]+)$', url)
        if match:
            filename = match.group(1)
            
            # Find media file by filename
            result = await db.execute(
                select(MediaFile).where(MediaFile.filename == filename)
            )
            media_file = result.scalar_one_or_none()
            
            if media_file:
                # Insert usage record
                usage = MediaUsage(
                    media_file_id=media_file.id,
                    agent_id=agent_id,
                    parameter_name=param_name
                )
                db.add(usage)


async def clear_media_usage(
    db: AsyncSession,
    agent_id: UUID
) -> None:
    """Clear all media usage records for an agent."""
    from ..models import MediaUsage
    await db.execute(
        delete(MediaUsage).where(MediaUsage.agent_id == agent_id)
    )