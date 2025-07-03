"""Environment variable resolver for skills."""
import os
import logging
from typing import Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
import asyncio
from ..models import EnvVar

logger = logging.getLogger(__name__)


class EnvVarResolver:
    """Resolves environment variables with priority order:
    1. Explicitly provided value (override)
    2. User-defined env var (from database)
    3. System env var (from shell)
    4. Default value from schema
    """
    
    def __init__(self, db):
        """Initialize with either sync or async session."""
        self.db = db
        self._cache: Dict[str, str] = {}
        self._is_async = isinstance(db, AsyncSession)
        if self._is_async:
            # For async sessions, we'll load cache on demand
            self._cache_loaded = False
        else:
            self._load_cache_sync()
    
    def _load_cache_sync(self):
        """Load all env vars into memory cache (sync version)."""
        try:
            env_vars = self.db.query(EnvVar).all()
            self._cache = {var.name: var.value for var in env_vars}
            logger.debug(f"Loaded {len(self._cache)} user-defined env vars")
        except Exception as e:
            logger.error(f"Failed to load env vars cache: {e}")
            self._cache = {}
    
    async def _load_cache_async(self):
        """Load all env vars into memory cache (async version)."""
        try:
            result = await self.db.execute(select(EnvVar))
            env_vars = result.scalars().all()
            self._cache = {var.name: var.value for var in env_vars}
            self._cache_loaded = True
            logger.debug(f"Loaded {len(self._cache)} user-defined env vars")
        except Exception as e:
            logger.error(f"Failed to load env vars cache: {e}")
            self._cache = {}
            self._cache_loaded = True
    
    def resolve(self, env_var_name: str, provided_value: Optional[Any] = None, 
                default_value: Optional[Any] = None) -> Optional[Any]:
        """Resolve an environment variable value.
        
        Args:
            env_var_name: Name of the environment variable
            provided_value: Explicitly provided value (highest priority)
            default_value: Default value from schema (lowest priority)
            
        Returns:
            Resolved value based on priority order
        """
        # 1. Explicitly provided value takes precedence
        if provided_value is not None:
            return provided_value
        
        # 2. Check user-defined env var
        if env_var_name in self._cache:
            return self._cache[env_var_name]
        
        # 3. Check system env var
        system_value = os.environ.get(env_var_name)
        if system_value is not None:
            return system_value
        
        # 4. Use default value
        return default_value
    
    def resolve_skill_params(self, skill_params: Dict[str, Any], 
                           param_schema: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Resolve all parameters for a skill using env vars.
        
        Args:
            skill_params: Current skill parameters
            param_schema: Parameter schema from skill
            
        Returns:
            Resolved parameters with env vars applied
        """
        resolved = {}
        
        for param_name, schema in param_schema.items():
            # Get env var name from schema if specified
            env_var_name = schema.get('env_var')
            provided_value = skill_params.get(param_name)
            default_value = schema.get('default')
            
            if env_var_name:
                # Use env var resolution
                resolved[param_name] = self.resolve(
                    env_var_name, 
                    provided_value, 
                    default_value
                )
            else:
                # No env var, use provided or default
                resolved[param_name] = provided_value if provided_value is not None else default_value
        
        return resolved
    
    def get_env_var_status(self, env_var_name: str) -> Dict[str, Any]:
        """Get status of an environment variable.
        
        Returns dict with:
        - exists: bool - whether env var exists
        - source: 'user' | 'system' | None - where it's defined
        - is_set: bool - whether it has any value
        """
        if env_var_name in self._cache:
            return {
                "exists": True,
                "source": "user",
                "is_set": True
            }
        elif env_var_name in os.environ:
            return {
                "exists": True,
                "source": "system",
                "is_set": True
            }
        else:
            return {
                "exists": False,
                "source": None,
                "is_set": False
            }
    
    def refresh_cache(self):
        """Refresh the cache from database."""
        self._load_cache()