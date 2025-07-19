"""Application configuration."""
import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Build version
    build_version: str = Field(
        default=os.getenv("BUILD_VERSION", "dev"),
        description="Build version or commit hash"
    )
    
    # Database
    database_url: str = Field(
        default="postgresql://agent_builder:changeme@localhost:5432/agent_builder",
        description="PostgreSQL connection URL"
    )
    
    # Security
    jwt_secret: str = Field(
        default="change-this-to-a-long-random-string",
        description="Secret key for JWT tokens"
    )
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 1  # Default 1 hour expiration
    
    # SignalWire JWT for skills
    signalwire_jwt_secret: str = Field(
        default="change-this-for-signalwire-skill-tokens",
        description="Secret key for SignalWire skill JWT tokens"
    )
    
    # Server
    hostname: str = Field(
        default="tatooine.cantina.cloud",
        description="Server hostname"
    )
    port: int = Field(
        default=8430,
        description="HTTPS port"
    )
    api_port: int = Field(
        default=8000,
        description="Internal API port"
    )
    
    # Rate limiting
    rate_limit_api: int = Field(
        default=100,
        description="API calls per minute"
    )
    rate_limit_swml: int = Field(
        default=1000,
        description="SWML requests per hour"
    )
    
    # CORS
    cors_origins: list[str] = Field(
        default=["*"],
        description="Allowed CORS origins"
    )
    
    # Development
    debug: bool = Field(
        default=False,
        description="Debug mode"
    )
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()


def get_swml_url(agent_id: str, request=None) -> str:
    """Get the public SWML URL for an agent.
    
    When behind a proxy (detected by X-Forwarded headers), use the Host header as-is
    since the proxy handles port mapping. For direct connections, use our configured
    hostname and port.
    """
    if request:
        # Check if we're behind a proxy by looking for forwarded headers
        if 'x-forwarded-proto' in request.headers or 'x-forwarded-host' in request.headers:
            # Behind a proxy - use the Host header as-is (proxy handles port mapping)
            host = request.headers.get('host', settings.hostname)
            scheme = request.headers.get('x-forwarded-proto', 'https')
            return f"{scheme}://{host}/agents/{agent_id}/swml"
        else:
            # Direct connection - use our configured settings
            return f"https://{settings.hostname}:{settings.port}/agents/{agent_id}/swml"
    else:
        # Fallback to configured values for backward compatibility
        return f"https://{settings.hostname}:{settings.port}/agents/{agent_id}/swml"


def get_swaig_handler_url() -> str:
    """Get the SWAIG handler URL."""
    # Use our own SWAIG handler endpoint
    return f"https://{settings.hostname}:{settings.port}/api/swaig/function"