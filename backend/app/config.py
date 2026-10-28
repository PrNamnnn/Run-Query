import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from root or backend directory
env_path = Path(__file__).resolve().parent.parent / ".env"
if not env_path.exists():
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"

load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL", "")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
# Support both modern publishable/secret key names and standard anon/service-role names
SUPABASE_ANON_KEY = (
    os.getenv("SUPABASE_PUBLISHABLE_KEY") or 
    os.getenv("SUPABASE_ANON_KEY") or 
    os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
)
SUPABASE_SERVICE_ROLE_KEY = (
    os.getenv("SUPABASE_SECRET_KEY") or 
    os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
)
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_JWKS_URL = os.getenv(
    "SUPABASE_JWKS_URL",
    f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else ""
)

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))

# Parse CORS origins: normalize by stripping whitespace and trailing slashes
CORS_ORIGINS_RAW = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,https://run-query.vercel.app"
)
CORS_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in CORS_ORIGINS_RAW.split(",")
    if origin.strip()
]

# Narrowly scoped regex matching only the trusted Run Query project deployment origins on Vercel
# Supports production domain, branch previews, and deployment hashes for project 'run-query' / user 'prnamnnns'
CORS_ORIGIN_REGEX = os.getenv(
    "CORS_ORIGIN_REGEX",
    r"^https://run-query(-[a-zA-Z0-9_-]+)?(-prnamnnns-projects)?\.vercel\.app$"
)
