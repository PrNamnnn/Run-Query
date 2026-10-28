import time
import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel
import jwt
from jwt import PyJWKClient
import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import (
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_JWT_SECRET,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_JWKS_URL
)

logger = logging.getLogger("runquery.auth")

security = HTTPBearer(auto_error=False)

class UserContext(BaseModel):
    user_id: str
    email: str

# In-memory token verification cache: token -> (user_context, expire_timestamp)
_token_cache: Dict[str, tuple[UserContext, float]] = {}

_jwks_client: Optional[PyJWKClient] = None

def get_jwks_client() -> Optional[PyJWKClient]:
    global _jwks_client
    if _jwks_client is None and SUPABASE_JWKS_URL:
        try:
            _jwks_client = PyJWKClient(SUPABASE_JWKS_URL, cache_keys=True, max_cached_keys=16)
        except Exception as e:
            logger.warning(f"Could not initialize PyJWKClient: {e}")
    return _jwks_client

def verify_token_locally(token: str) -> Optional[UserContext]:
    """
    Attempts to decode and verify JWT locally using JWKS (ES256/RS256) or SUPABASE_JWT_SECRET (HS256).
    """
    # 1. Try JWKS asymmetric verification (ES256, RS256)
    jwks = get_jwks_client()
    if jwks:
        try:
            signing_key = jwks.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256", "HS256"],
                options={"verify_aud": False}
            )
            sub = payload.get("sub")
            email = payload.get("email", "")
            if sub:
                return UserContext(user_id=sub, email=email)
        except Exception as e:
            logger.debug(f"JWKS verification failed: {e}")

    # 2. Try HS256 secret verification if configured
    if SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
            sub = payload.get("sub")
            email = payload.get("email", "")
            if sub:
                return UserContext(user_id=sub, email=email)
        except jwt.PyJWTError as e:
            logger.debug(f"Local HS256 JWT verification failed: {e}")

    return None

def verify_token_remotely(token: str) -> Optional[UserContext]:
    """
    Verifies JWT against Supabase Auth API endpoint.
    Used as reliable fallback for remote session checking.
    """
    if not SUPABASE_URL:
        return None

    auth_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": SUPABASE_ANON_KEY or ""
    }

    try:
        resp = requests.get(auth_url, headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            user_id = data.get("id")
            email = data.get("email", "")
            if user_id:
                return UserContext(user_id=user_id, email=email)
        else:
            logger.warning(f"Supabase remote auth responded with status {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.error(f"Error connecting to Supabase Auth API: {e}")

    return None

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> UserContext:
    """
    FastAPI dependency that enforces authentication on protected routes.
    Extracts and validates Supabase Bearer JWT token.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    now = time.time()

    # Check cache first
    cached = _token_cache.get(token)
    if cached:
        user_ctx, expiry = cached
        if now < expiry:
            return user_ctx
        else:
            _token_cache.pop(token, None)

    # 1. Attempt local JWT decode (JWKS / secret)
    user = verify_token_locally(token)

    # 2. Attempt remote Supabase verification if local did not succeed
    if not user:
        user = verify_token_remotely(token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Cache successful verification for 60 seconds
    _token_cache[token] = (user, now + 60)
    return user

def delete_supabase_auth_user(user_id: str) -> bool:
    """
    Deletes user from Supabase Auth service using SUPABASE_SERVICE_ROLE_KEY.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("SUPABASE_SERVICE_ROLE_KEY not configured. Skipping auth service deletion.")
        return False

    url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/admin/users/{user_id}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY
    }

    try:
        resp = requests.delete(url, headers=headers, timeout=8)
        if resp.status_code in [200, 204]:
            logger.info(f"User {user_id} deleted from Supabase Auth successfully.")
            return True
        else:
            logger.error(f"Failed to delete user {user_id} in Supabase Auth: {resp.text}")
            return False
    except Exception as e:
        logger.error(f"Exception deleting user in Supabase Auth: {e}")
        return False
