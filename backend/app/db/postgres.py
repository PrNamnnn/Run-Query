import re
import atexit
import logging
from contextlib import contextmanager
from typing import Optional, Generator
import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from app.config import DATABASE_URL

logger = logging.getLogger("runquery.db")

_pool: Optional[ConnectionPool] = None

def get_normalized_conn_string(url: str) -> str:
    if not url:
        return ""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url

def get_pool() -> Optional[ConnectionPool]:
    global _pool
    if _pool is None and DATABASE_URL:
        conn_str = get_normalized_conn_string(DATABASE_URL)
        try:
            _pool = ConnectionPool(
                conninfo=conn_str,
                min_size=1,
                max_size=15,
                max_idle=300,
                timeout=10.0,
                open=True
            )
            logger.info("PostgreSQL connection pool initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize PostgreSQL pool: {e}")
            _pool = None
    return _pool

def close_pool():
    global _pool
    if _pool is not None:
        try:
            _pool.close()
        except Exception:
            pass
        _pool = None

atexit.register(close_pool)

@contextmanager
def get_db_connection(autocommit: bool = False) -> Generator[psycopg.Connection, None, None]:
    pool = get_pool()
    if pool is not None:
        with pool.connection() as conn:
            conn.autocommit = autocommit
            yield conn
    else:
        conn_str = get_normalized_conn_string(DATABASE_URL)
        if not conn_str:
            raise RuntimeError(
                "DATABASE_URL environment variable is not configured. "
                "Please configure Supabase PostgreSQL in your .env file."
            )
        conn = psycopg.connect(conn_str, autocommit=autocommit)
        try:
            yield conn
        finally:
            conn.close()

def get_user_schema_name(user_id: str) -> str:
    """
    Constructs a safe, isolated PostgreSQL schema name for a specific user ID.
    Guarantees identifier safety without dynamic SQL injection risks.
    """
    clean_id = re.sub(r"[^a-zA-Z0-9_]", "_", user_id).lower()
    return f"usr_{clean_id}"

def init_database():
    """
    Initializes required public metadata tables in Supabase PostgreSQL:
    - public.datasets
    - public.saved_queries
    - public.query_history
    """
    if not DATABASE_URL:
        logger.warning("DATABASE_URL is not set. Skipping database initialization.")
        return

    sql_schema = """
    -- Datasets metadata
    CREATE TABLE IF NOT EXISTS public.datasets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        display_name TEXT NOT NULL,
        table_name TEXT NOT NULL,
        row_count INTEGER NOT NULL DEFAULT 0,
        columns JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT unique_user_table UNIQUE (user_id, table_name)
    );

    CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON public.datasets(user_id);

    -- Saved Queries
    CREATE TABLE IF NOT EXISTS public.saved_queries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        name TEXT NOT NULL,
        query TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_saved_queries_user_id ON public.saved_queries(user_id);

    -- Query History
    CREATE TABLE IF NOT EXISTS public.query_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        query TEXT NOT NULL,
        execution_time_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        row_count INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_query_history_user_timestamp ON public.query_history(user_id, created_at DESC);
    """

    try:
        with get_db_connection(autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(sql_schema)
        logger.info("Database metadata schema initialized successfully.")
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
        raise e
