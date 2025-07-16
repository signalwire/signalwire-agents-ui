"""Main FastAPI application."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .core.config import settings
from .api import auth, agents, swml, admin, swaig, skills, native_functions, skills_marketplace, skills_unified, skills_test, post_prompt, changes, call_summaries, env_vars, knowledge_bases, agent_knowledge_bases, knowledge_base_documents, media, polly_voices

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Create rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("Starting SignalWire Agent Builder API")
    logger.info(f"Environment: {'DEBUG' if settings.debug else 'PRODUCTION'}")
    logger.info(f"Database: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'configured'}")
    
    # Migrations are now run in start-backend.sh before workers start
    # This prevents multiple workers from trying to run migrations simultaneously
    
    # Preload the embedding model for faster first search
    try:
        logger.info("Preloading embedding model...")
        from .services.embedding_service import EmbeddingService
        embedding_service = EmbeddingService()
        embedding_service.get_model()
        logger.info("Embedding model preloaded successfully")
    except Exception as e:
        logger.warning(f"Failed to preload embedding model: {e}")
        # Don't fail startup if model preload fails
    
    yield
    logger.info("Shutting down SignalWire Agent Builder API")


# Create FastAPI app
app = FastAPI(
    title="SignalWire Agent Builder API",
    description="API for building and managing SignalWire AI agents",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.debug else None,
    redoc_url="/api/redoc" if settings.debug else None,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Include routers
app.include_router(auth.router)
app.include_router(agents.router)
app.include_router(swml.router)  # Public endpoint, no /api prefix
app.include_router(admin.router, prefix="/api")
app.include_router(swaig.router)  # SWAIG handler endpoint
app.include_router(skills.router)  # Skills endpoint
app.include_router(native_functions.router)  # Native functions endpoint
app.include_router(skills_marketplace.router)  # Skills marketplace endpoint
app.include_router(skills_unified.router, prefix="/api/skills/unified")  # Unified skills endpoint
app.include_router(skills_test.router)  # Skills testing endpoint
app.include_router(post_prompt.router)  # Post-prompt handler endpoint
app.include_router(changes.router, prefix="/api")  # SSE changes endpoint
app.include_router(call_summaries.router, prefix="/api")  # Call summaries endpoints
app.include_router(env_vars.router)  # Environment variables endpoints
app.include_router(knowledge_bases.router, prefix="/api")  # Standalone knowledge bases
app.include_router(agent_knowledge_bases.router, prefix="/api")  # Agent-KB associations
app.include_router(knowledge_base_documents.router, prefix="/api")  # KB document management
app.include_router(media.router, prefix="/api")  # Media library endpoints
app.include_router(polly_voices.router)  # Amazon Polly voices endpoints

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy", 
        "service": "agent-builder-api",
        "build_version": settings.build_version
    }


# Root endpoint
@app.get("/api")
async def root():
    """API root endpoint."""
    return {
        "service": "SignalWire Agent Builder API",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/auth/login",
            "agents": "/api/agents",
            "skills": "/api/skills",
            "admin": "/api/admin",
            "health": "/api/health"
        }
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )