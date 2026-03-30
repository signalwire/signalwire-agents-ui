"""Cookie utilities for httpOnly JWT storage."""
import secrets
from fastapi import Response, Request

COOKIE_NAME = "session"
CSRF_COOKIE_NAME = "csrf_token"
COOKIE_PATH = "/"


def _is_secure(request: Request) -> bool:
    """Determine if Secure flag should be set based on request scheme."""
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    return scheme == "https"


def set_auth_cookie(
    response: Response,
    request: Request,
    jwt_token: str,
    remember_me: bool = False,
):
    """Set the httpOnly session cookie and the CSRF double-submit cookie."""
    secure = _is_secure(request)
    max_age = 30 * 24 * 3600 if remember_me else 7 * 24 * 3600

    response.set_cookie(
        key=COOKIE_NAME,
        value=jwt_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        path=COOKIE_PATH,
        max_age=max_age,
    )

    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,  # Frontend must read this
        secure=secure,
        samesite="lax",
        path=COOKIE_PATH,
        max_age=max_age,
    )


def clear_auth_cookies(response: Response, request: Request):
    """Clear both auth and CSRF cookies."""
    secure = _is_secure(request)
    for name in (COOKIE_NAME, CSRF_COOKIE_NAME):
        response.delete_cookie(
            key=name, path=COOKIE_PATH, secure=secure, samesite="lax"
        )


def get_jwt_from_cookie(request: Request) -> str | None:
    """Extract the JWT from the session cookie."""
    return request.cookies.get(COOKIE_NAME)
