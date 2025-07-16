"""API endpoints for Amazon Polly voices."""
from fastapi import APIRouter
from typing import List, Dict, Optional

from ..core.polly_voices import polly_voices_service

router = APIRouter(prefix="/api/polly-voices", tags=["polly-voices"])


@router.get("/")
async def get_all_voices() -> List[Dict]:
    """Get all available Amazon Polly voices."""
    return polly_voices_service.get_all_voices()


@router.get("/languages")
async def get_languages() -> List[Dict[str, str]]:
    """Get all available languages for Amazon Polly voices."""
    return polly_voices_service.get_languages()


@router.get("/engines")
async def get_engines() -> List[str]:
    """Get all available engines for Amazon Polly voices."""
    return polly_voices_service.get_engines()


@router.get("/by-language/{language_code}")
async def get_voices_by_language(language_code: str, engine: Optional[str] = None) -> List[Dict]:
    """Get voices for a specific language and optionally engine."""
    return polly_voices_service.get_voices_for_language(language_code, engine)