"""CSRF protection middleware using double-submit cookie pattern."""
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from .cookies import COOKIE_NAME, CSRF_COOKIE_NAME

logger = logging.getLogger(__name__)

# HTTP methods that modify state
UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Paths exempt from CSRF checks (non-browser callers)
CSRF_EXEMPT_PREFIXES = (
    "/api/swaig/",        # SignalWire platform calls
    "/agents/",           # SWML endpoint (SignalWire platform)
    "/api/post-prompt/",  # SignalWire post-prompt callback
    "/api/auth/login",    # Login itself sets the cookie
    "/post-prompt",       # Alternate post-prompt path
)


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method in UNSAFE_METHODS:
            path = request.url.path

            # Skip exempt paths
            if any(path.startswith(prefix) for prefix in CSRF_EXEMPT_PREFIXES):
                return await call_next(request)

            # Skip if request uses Bearer or Basic auth (non-browser API client)
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer ") or auth_header.startswith("Basic "):
                return await call_next(request)

            # If there is a session cookie, validate CSRF
            if request.cookies.get(COOKIE_NAME):
                csrf_cookie = request.cookies.get(CSRF_COOKIE_NAME)
                csrf_header = request.headers.get("x-csrf-token")

                if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
                    logger.warning(f"CSRF validation failed for {request.method} {path}")
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF validation failed"},
                    )

        return await call_next(request)
