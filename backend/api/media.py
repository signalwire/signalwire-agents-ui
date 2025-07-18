"""Media library API endpoints."""
import os
import uuid
import json
import hashlib
import aiofiles
import asyncio
import mimetypes
import ipaddress
import socket
from pathlib import Path
from typing import List, Optional, Dict, Any
from urllib.parse import urlparse
from datetime import datetime, timedelta

import aiohttp
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, delete, func, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import verify_jwt_token
from ..core.audit import create_audit_log, get_request_metadata
from ..models import MediaFile, MediaUsage

router = APIRouter()

# Pydantic models
class MediaImportRequest(BaseModel):
    url: str
    category: Optional[str] = None
    description: Optional[str] = None

# Constants
MEDIA_BASE_PATH = Path("/app/data/media")
ALLOWED_AUDIO_TYPES = {
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/ogg': ['.ogg'],
    'audio/webm': ['.webm'],
}
ALLOWED_VIDEO_TYPES = {
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm'],
}

DEFAULT_MEDIA_SETTINGS = {
    'max_audio_size_mb': 50,
    'max_video_size_mb': 200,
    'max_uploads_per_hour': 10,
    'max_imports_per_hour': 20,
    'allowed_audio_types': list(ALLOWED_AUDIO_TYPES.keys()),
    'allowed_video_types': list(ALLOWED_VIDEO_TYPES.keys()),
    'auto_cleanup_days': 90,
    'enable_virus_scan': False,
    'max_total_storage_gb': 50
}


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent security issues."""
    import unicodedata
    import re
    
    # Normalize unicode
    filename = unicodedata.normalize('NFKD', filename)
    
    # Keep only alphanumeric, dash, underscore, dot
    filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    
    # Prevent directory traversal
    filename = filename.replace('..', '_')
    filename = filename.strip('._-')
    
    # Limit length
    name, ext = os.path.splitext(filename)
    if len(name) > 50:
        name = name[:50]
    
    return f"{name}{ext}"


def is_internal_ip(hostname: str) -> bool:
    """Check if hostname resolves to internal IP."""
    try:
        ip = ipaddress.ip_address(hostname)
        return (
            ip.is_private or
            ip.is_reserved or
            ip.is_loopback or
            ip.is_link_local or
            ip.is_multicast
        )
    except ValueError:
        # It's a domain, resolve it
        try:
            ip = socket.gethostbyname(hostname)
            return is_internal_ip(ip)
        except:
            # Can't resolve, block it for safety
            return True


def get_media_url(filename: str, file_type: str, request: Request) -> str:
    """Generate public URL for media file."""
    from ..core.config import settings
    
    scheme = request.headers.get('x-forwarded-proto', 'https')
    # Use configured hostname with port if not standard
    host = settings.hostname
    if settings.port != 443 and settings.port != 80:
        host = f"{host}:{settings.port}"
    
    return f"{scheme}://{host}/media/{file_type}/{filename}"


async def get_media_settings(db: AsyncSession) -> dict:
    """Get media library settings."""
    result = await db.execute(
        text("SELECT settings FROM system_settings WHERE category = 'media_library'")
    )
    row = result.first()
    
    if row and row.settings:
        return row.settings
    return DEFAULT_MEDIA_SETTINGS


async def check_rate_limit(db: AsyncSession, user_id: str, action: str, limit: int) -> bool:
    """Check if user has exceeded rate limit."""
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    
    result = await db.execute(
        select(func.count())
        .select_from(text('audit_logs'))
        .where(
            and_(
                text("user_id = :user_id"),
                text("action = :action"),
                text("timestamp > :timestamp")
            )
        ),
        {"user_id": user_id, "action": action, "timestamp": one_hour_ago}
    )
    
    count = result.scalar() or 0
    return count < limit


@router.get("/media")
async def list_media(
    request: Request,
    db: AsyncSession = Depends(get_db),
    file_type: Optional[str] = Query(None, description="Filter by file type"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search in filename and description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
):
    """List all media files with filtering and search."""
    # Build WHERE clause conditions
    conditions = ["1=1"]  # Start with always-true condition
    params = {}
    
    if file_type:
        conditions.append("m.file_type = :file_type")
        params["file_type"] = file_type
    
    if category:
        conditions.append("m.category = :category")
        params["category"] = category
    
    if search:
        conditions.append("(m.original_filename ILIKE :search OR m.description ILIKE :search)")
        params["search"] = f"%{search}%"
    
    # Build complete query with proper WHERE clause
    query_text = f"""
        SELECT 
            m.*,
            COUNT(DISTINCT u.agent_id) as usage_count
        FROM media_files m
        LEFT JOIN media_usage u ON m.id = u.media_file_id
        WHERE {" AND ".join(conditions)}
        GROUP BY m.id
        ORDER BY m.created_at DESC
        LIMIT :limit OFFSET :offset
    """
    
    params["limit"] = limit
    params["offset"] = skip
    
    result = await db.execute(text(query_text), params)
    files = result.fetchall()
    
    # Convert to dict and add public URLs
    media_files = []
    for file in files:
        file_dict = dict(file._mapping)
        file_dict['url'] = get_media_url(file_dict['filename'], file_dict['file_type'], request)
        media_files.append(file_dict)
    
    # Get total count
    count_query_text = f"""
        SELECT COUNT(DISTINCT m.id)
        FROM media_files m
        WHERE {" AND ".join(conditions)}
    """
    
    # Remove limit and offset from params for count query
    count_params = {k: v for k, v in params.items() if k not in ['limit', 'offset']}
    
    total_result = await db.execute(text(count_query_text), count_params)
    total = total_result.scalar()
    
    return {
        "files": media_files,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/media/upload")
async def upload_media(
    request: Request,
    file: UploadFile = File(...),
    category: Optional[str] = None,
    description: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Upload a new media file."""
    settings = await get_media_settings(db)
    
    # Check rate limit
    token = auth_data['token']
    if not await check_rate_limit(db, str(token.id), 'media_upload', settings['max_uploads_per_hour']):
        raise HTTPException(429, "Upload rate limit exceeded")
    
    # Read first chunk to determine file type
    first_chunk = await file.read(8192)
    await file.seek(0)
    
    # Detect MIME type from filename first, then verify with content
    guessed_type, _ = mimetypes.guess_type(file.filename)
    mime_type = guessed_type or 'application/octet-stream'
    
    # Determine file type
    file_type = None
    allowed_types = {}
    
    if mime_type in settings['allowed_audio_types']:
        file_type = 'audio'
        max_size = settings['max_audio_size_mb'] * 1024 * 1024
        allowed_types = ALLOWED_AUDIO_TYPES
    elif mime_type in settings['allowed_video_types']:
        file_type = 'video'
        max_size = settings['max_video_size_mb'] * 1024 * 1024
        allowed_types = ALLOWED_VIDEO_TYPES
    else:
        raise HTTPException(400, f"File type not allowed: {mime_type}")
    
    # Verify extension matches MIME type
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_types.get(mime_type, []):
        raise HTTPException(400, "File extension doesn't match content type")
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    safe_name = sanitize_filename(file.filename)
    filename = f"{file_id}_{safe_name}"
    file_path = MEDIA_BASE_PATH / file_type / filename
    
    # Ensure directory exists
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Save file with size check
    size = 0
    async with aiofiles.open(file_path, 'wb') as f:
        while chunk := await file.read(8192):
            size += len(chunk)
            if size > max_size:
                # Clean up partial file
                await f.close()
                os.unlink(file_path)
                raise HTTPException(400, f"File too large (max {max_size // 1024 // 1024}MB)")
            await f.write(chunk)
    
    # TODO: Extract duration for audio/video files
    duration = None
    
    # Save to database
    result = await db.execute(
        text("""
        INSERT INTO media_files 
        (filename, original_filename, file_type, mime_type, category, 
         file_size, duration_seconds, file_path, description, uploaded_by)
        VALUES (:filename, :original_filename, :file_type, :mime_type, :category,
                :file_size, :duration_seconds, :file_path, :description, :uploaded_by)
        RETURNING id
        """),
        {
            "filename": filename,
            "original_filename": file.filename,
            "file_type": file_type,
            "mime_type": mime_type,
            "category": category,
            "file_size": size,
            "duration_seconds": duration,
            "file_path": str(file_path),
            "description": description,
            "uploaded_by": str(token.id)
        }
    )
    await db.commit()
    
    media_id = result.scalar()
    
    # Log audit
    await create_audit_log(
        db,
        user_id=str(token.id),
        action="MEDIA_UPLOAD",
        description=f"Uploaded media file: {file.filename}",
        metadata={
            "media_id": str(media_id),
            "filename": filename,
            "size": size
        }
    )
    
    return {
        "id": str(media_id),
        "filename": filename,
        "original_filename": file.filename,
        "file_type": file_type,
        "size": size,
        "url": get_media_url(filename, file_type, request)
    }


@router.post("/media/import")
async def import_from_url(
    request: Request,
    import_data: MediaImportRequest,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Import media from external URL."""
    settings = await get_media_settings(db)
    
    # Check rate limit
    token = auth_data['token']
    if not await check_rate_limit(db, str(token.id), 'media_import', settings['max_imports_per_hour']):
        raise HTTPException(429, "Import rate limit exceeded")
    
    # Validate URL
    parsed = urlparse(import_data.url)
    if parsed.scheme not in ['http', 'https']:
        raise HTTPException(400, "Only HTTP(S) URLs allowed")
    
    # Prevent SSRF
    if is_internal_ip(parsed.hostname):
        raise HTTPException(400, "Internal URLs not allowed")
    
    # Download file
    try:
        async with aiohttp.ClientSession() as session:
            timeout = aiohttp.ClientTimeout(total=30)
            async with session.get(import_data.url, timeout=timeout, allow_redirects=False) as response:
                if response.status != 200:
                    raise HTTPException(400, f"Failed to fetch URL: {response.status}")
                
                # Check content type
                content_type = response.headers.get('Content-Type', '').split(';')[0]
                
                # Determine file type
                file_type = None
                if content_type in settings['allowed_audio_types']:
                    file_type = 'audio'
                    max_size = settings['max_audio_size_mb'] * 1024 * 1024
                elif content_type in settings['allowed_video_types']:
                    file_type = 'video'
                    max_size = settings['max_video_size_mb'] * 1024 * 1024
                else:
                    raise HTTPException(400, f"Content type not allowed: {content_type}")
                
                # Generate filename from URL
                original_name = parsed.path.split('/')[-1] or 'imported_file'
                if not Path(original_name).suffix:
                    # Add extension based on content type
                    ext = {
                        'audio/mpeg': '.mp3',
                        'audio/wav': '.wav',
                        'audio/ogg': '.ogg',
                        'audio/webm': '.webm',
                        'video/mp4': '.mp4',
                        'video/webm': '.webm',
                    }.get(content_type, '')
                    original_name += ext
                
                # Generate unique filename
                file_id = str(uuid.uuid4())
                safe_name = sanitize_filename(original_name)
                filename = f"{file_id}_{safe_name}"
                file_path = MEDIA_BASE_PATH / file_type / filename
                
                # Ensure directory exists
                file_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Download with size limit
                size = 0
                async with aiofiles.open(file_path, 'wb') as f:
                    async for chunk in response.content.iter_chunked(8192):
                        size += len(chunk)
                        if size > max_size:
                            await f.close()
                            os.unlink(file_path)
                            raise HTTPException(400, f"File too large (max {max_size // 1024 // 1024}MB)")
                        await f.write(chunk)
                
                # For now, trust the content-type header
                # TODO: Add proper MIME type validation when libmagic is available
                
    except aiohttp.ClientError as e:
        raise HTTPException(400, f"Failed to download file: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        if file_path.exists():
            os.unlink(file_path)
        raise HTTPException(500, f"Import failed: {str(e)}")
    
    # Save to database
    result = await db.execute(
        text("""
        INSERT INTO media_files 
        (filename, original_filename, file_type, mime_type, category, 
         file_size, file_path, description, uploaded_by, source_type, external_url)
        VALUES (:filename, :original_filename, :file_type, :mime_type, :category,
                :file_size, :file_path, :description, :uploaded_by, 'imported', :external_url)
        RETURNING id
        """),
        {
            "filename": filename,
            "original_filename": original_name,
            "file_type": file_type,
            "mime_type": content_type,
            "category": import_data.category,
            "file_size": size,
            "file_path": str(file_path),
            "description": import_data.description,
            "uploaded_by": str(token.id),
            "external_url": import_data.url
        }
    )
    await db.commit()
    
    media_id = result.scalar()
    
    # Log audit
    await create_audit_log(
        db,
        user_id=str(token.id),
        action="MEDIA_IMPORT",
        description=f"Imported media from URL: {import_data.url}",
        metadata={
            **get_request_metadata(request),
            "media_id": str(media_id),
            "filename": filename,
            "url": import_data.url,
            "size": size
        }
    )
    
    return {
        "id": str(media_id),
        "filename": filename,
        "original_filename": original_name,
        "file_type": file_type,
        "size": size,
        "url": get_media_url(filename, file_type, request),
        "source_url": import_data.url
    }


@router.delete("/media/{media_id}")
async def delete_media(
    media_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Delete a media file."""
    # Get media file
    result = await db.execute(
        select(text("*")).select_from(text("media_files")).where(text("id = :id")),
        {"id": media_id}
    )
    media = result.first()
    
    if not media:
        raise HTTPException(404, "Media file not found")
    
    # Check if file is in use
    usage_result = await db.execute(
        select(func.count()).select_from(text("media_usage")).where(text("media_file_id = :id")),
        {"id": media_id}
    )
    usage_count = usage_result.scalar() or 0
    
    if usage_count > 0:
        raise HTTPException(400, f"Media file is in use by {usage_count} agent(s)")
    
    # Delete physical file
    try:
        os.unlink(media.file_path)
    except FileNotFoundError:
        pass  # File already deleted
    
    # Delete from database
    await db.execute(
        text("DELETE FROM media_files WHERE id = :id"),
        {"id": media_id}
    )
    await db.commit()
    
    # Log audit
    token = auth_data['token']
    await create_audit_log(
        db,
        user_id=str(token.id),
        action="MEDIA_DELETE",
        description=f"Deleted media file: {media.original_filename}",
        metadata={
            **get_request_metadata(request),
            "media_id": media_id,
            "filename": media.filename
        }
    )
    
    return {"status": "deleted"}


@router.get("/media/{media_id}/usage")
async def get_media_usage(
    media_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Get usage information for a media file."""
    result = await db.execute(
        text("""
        SELECT 
            u.agent_id,
            u.parameter_name,
            a.name as agent_name,
            u.created_at
        FROM media_usage u
        JOIN agents a ON u.agent_id = a.id
        WHERE u.media_file_id = :media_id
        ORDER BY u.created_at DESC
        """),
        {"media_id": media_id}
    )
    
    usage = result.fetchall()
    
    return {
        "total": len(usage),
        "usage": [dict(u._mapping) for u in usage]
    }


@router.post("/media/validate-url")
async def validate_media_url(
    url: str,
    file_type: Optional[str] = None,
    request: Request = None,
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Validate an external media URL."""
    # Validate URL format
    parsed = urlparse(url)
    if parsed.scheme not in ['http', 'https']:
        return {"valid": False, "error": "Only HTTP(S) URLs allowed"}
    
    # Prevent SSRF
    if is_internal_ip(parsed.hostname):
        return {"valid": False, "error": "Internal URLs not allowed"}
    
    try:
        async with aiohttp.ClientSession() as session:
            timeout = aiohttp.ClientTimeout(total=10)
            async with session.head(url, timeout=timeout, allow_redirects=True) as response:
                if response.status != 200:
                    return {"valid": False, "error": f"URL returned status {response.status}"}
                
                content_type = response.headers.get('Content-Type', '').split(';')[0]
                content_length = response.headers.get('Content-Length')
                
                # Check if content type is allowed
                settings = await get_media_settings(None)  # TODO: Pass db session
                allowed_types = settings['allowed_audio_types'] + settings['allowed_video_types']
                
                if content_type not in allowed_types:
                    return {"valid": False, "error": f"Content type not allowed: {content_type}"}
                
                return {
                    "valid": True,
                    "content_type": content_type,
                    "size": int(content_length) if content_length else None,
                    "file_type": 'audio' if content_type in settings['allowed_audio_types'] else 'video'
                }
                
    except Exception as e:
        return {"valid": False, "error": str(e)}


# Media settings endpoints (admin only)
@router.get("/settings/media")
async def get_media_settings_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Get media library settings."""
    settings = await get_media_settings(db)
    
    # Get storage usage stats
    total_size = 0
    file_count = 0
    
    # Ensure media directory exists and get stats safely
    try:
        if MEDIA_BASE_PATH.exists():
            for root, dirs, files in os.walk(MEDIA_BASE_PATH):
                for file in files:
                    try:
                        file_path = os.path.join(root, file)
                        if os.path.isfile(file_path):
                            file_count += 1
                            total_size += os.path.getsize(file_path)
                    except (OSError, FileNotFoundError):
                        # Skip files that can't be accessed
                        continue
        else:
            # Create media directory if it doesn't exist
            MEDIA_BASE_PATH.mkdir(parents=True, exist_ok=True)
            (MEDIA_BASE_PATH / "audio").mkdir(exist_ok=True)
            (MEDIA_BASE_PATH / "video").mkdir(exist_ok=True)
    except Exception as e:
        # Log the error but don't fail the request
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Error accessing media directory: {e}")
        # Continue with zero stats
    
    # Get unused files count
    unused_count = 0
    try:
        result = await db.execute(
            text("""
            SELECT COUNT(*) FROM media_files m
            LEFT JOIN media_usage u ON m.id = u.media_file_id
            WHERE u.media_file_id IS NULL
            """)
        )
        unused_count = result.scalar() or 0
    except Exception as e:
        # Log the error but don't fail the request
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Error querying unused files: {e}")
        # Continue with zero count
    
    return {
        "settings": settings,
        "stats": {
            "total_files": file_count,
            "total_size": total_size,
            "total_size_gb": round(total_size / 1024 / 1024 / 1024, 2),
            "unused_files": unused_count
        }
    }


@router.put("/settings/media")
async def update_media_settings_endpoint(
    settings: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Update media library settings."""
    await db.execute(
        text("""
        INSERT INTO system_settings (category, settings)
        VALUES ('media_library', :settings)
        ON CONFLICT (category) 
        DO UPDATE SET settings = :settings, updated_at = NOW()
        """),
        {"settings": json.dumps(settings)}
    )
    await db.commit()
    
    # Log audit
    token = auth_data['token']
    await create_audit_log(
        db,
        user_id=str(token.id),
        action="SETTINGS_UPDATE",
        description="Updated media library settings",
        metadata={
            **get_request_metadata(request),
            "settings": settings
        }
    )
    
    return {"status": "updated"}