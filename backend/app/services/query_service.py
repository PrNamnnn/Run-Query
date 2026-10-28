import re
import time
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import date, datetime, time as dt_time
from decimal import Decimal
import psycopg
from psycopg import sql
from app.db.postgres import get_db_connection, get_user_schema_name

logger = logging.getLogger("runquery.query")

# Allowed statement starting keywords for SQL practice platform
ALLOWED_START_KEYWORDS = ("SELECT", "WITH", "EXPLAIN", "TABLE")

# Banned keywords that attempt data modification or privileged actions
DANGEROUS_PATTERNS = [
    r"\b(DROP|ALTER|CREATE|TRUNCATE|INSERT|UPDATE|DELETE)\b",
    r"\b(GRANT|REVOKE|COPY|VACUUM|REINDEX|CLUSTER)\b",
    r"\b(SET\s+(ROLE|SESSION\s+AUTHORIZATION))\b",
    r"\b(pg_read_file|pg_read_binary_file|pg_write_file|pg_ls_dir|pg_sleep)\b",
    r"\b(lo_import|lo_export|pg_terminate_backend|pg_reload_conf)\b",
    r"\b(dblink|postgres_fdw)\b"
]

class QueryService:
    @staticmethod
    def strip_comments(sql_query: str) -> str:
        """
        Removes SQL line comments (-- ...) and block comments (/* ... */)
        """
        # Remove single-line comments
        query = re.sub(r"--.*$", "", sql_query, flags=re.MULTILINE)
        # Remove block comments
        query = re.sub(r"/\*.*?\*/", "", query, flags=re.DOTALL)
        return query.strip()

    @classmethod
    def validate_practice_query(cls, query: str, current_user_schema: str) -> Optional[str]:
        """
        Validates that the SQL query is a practice/reading query and doesn't
        attempt cross-schema enumeration or dangerous administration commands.
        """
        cleaned = cls.strip_comments(query).strip()
        if not cleaned:
            return "Query cannot be empty."

        # Check statement start
        first_word_match = re.match(r"^([a-zA-Z]+)", cleaned)
        if not first_word_match:
            return "Invalid SQL syntax: Query must start with a valid statement keyword."

        first_word = first_word_match.group(1).upper()
        if first_word not in ALLOWED_START_KEYWORDS:
            return (
                f"Operation '{first_word}' is restricted. "
                "Run Query supports practice read operations: SELECT, WITH (CTE), EXPLAIN, and TABLE."
            )

        # Disallow prohibited administrative and write patterns
        for pattern in DANGEROUS_PATTERNS:
            if re.search(pattern, cleaned, re.IGNORECASE):
                return (
                    "Restricted operation: Modifications, schema alterations, "
                    "and privileged server functions are disabled for security."
                )

        # Cross-user schema isolation check:
        # User cannot reference other usr_* schemas
        schema_matches = re.findall(r"\b(usr_[a-zA-Z0-9_]+)\b", cleaned, re.IGNORECASE)
        for s in schema_matches:
            if s.lower() != current_user_schema.lower():
                return "Access denied: Queries cannot access schemas or tables belonging to another user."

        return None

    @classmethod
    def serialize_cell(cls, val: Any) -> Any:
        if val is None:
            return None
        if isinstance(val, (int, float, bool, str)):
            return val
        if isinstance(val, Decimal):
            return float(val)
        if isinstance(val, (datetime, date, dt_time)):
            return val.isoformat()
        if isinstance(val, (bytes, bytearray)):
            return val.hex()
        if isinstance(val, (dict, list)):
            return json.dumps(val, default=str)
        return str(val)

    @classmethod
    def format_pg_error(cls, err: psycopg.Error) -> str:
        """
        Extracts clean, user-friendly PostgreSQL error message without leaking
        connection strings, hostnames, ports, or server credentials.
        """
        if hasattr(err, "diag") and err.diag:
            diag = err.diag
            msg = diag.message_primary or str(err)
            detail = diag.message_detail
            hint = diag.message_hint
            context = diag.context

            parts = [f"ERROR: {msg}"]
            if detail:
                parts.append(f"DETAIL: {detail}")
            if hint:
                parts.append(f"HINT: {hint}")
            if context:
                parts.append(f"CONTEXT: {context}")
            return "\n".join(parts)

        raw = str(err).strip()
        # Clean up any potential connection strings from raw exceptions
        raw = re.sub(r"postgresql://[^@]+@[^/]+/[^\s]+", "postgresql://***:***@***", raw)
        return raw

    def record_history(
        self,
        user_id: str,
        query: str,
        execution_time_ms: float,
        status: str,
        row_count: int,
        error: Optional[str] = None
    ):
        """
        Persists query execution into public.query_history in an independent transaction.
        """
        try:
            with get_db_connection(autocommit=True) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO public.query_history 
                        (user_id, query, execution_time_ms, status, row_count, error, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, now());
                        """,
                        (user_id, query, execution_time_ms, status, row_count, error)
                    )
        except Exception as e:
            logger.warning(f"Could not write query history for user {user_id}: {e}")

    def execute_query(
        self,
        sql_query: str,
        user_id: str,
        limit: int = 1000,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Executes query inside a read-only transaction on PostgreSQL with:
        - Strict statement_timeout
        - User schema search_path
        - Read-only transaction enforcement
        - Sanitized error formatting
        """
        cleaned_sql = sql_query.strip()
        user_schema = get_user_schema_name(user_id)

        # 1. Validation check
        validation_error = self.validate_practice_query(cleaned_sql, user_schema)
        if validation_error:
            self.record_history(user_id, cleaned_sql, 0.0, "error", 0, validation_error)
            return {
                "success": False,
                "columns": [],
                "rows": [],
                "row_count": 0,
                "total_count": 0,
                "execution_time_ms": 0.0,
                "error": validation_error
            }

        start_time = time.perf_counter()

        try:
            with get_db_connection(autocommit=False) as conn:
                try:
                    with conn.cursor() as cur:
                        # 2. Configure session security inside user transaction
                        # Set timeout to 15 seconds (15000ms)
                        cur.execute("SET LOCAL statement_timeout = '15000';")
                        # Restrict search_path to user's schema and public
                        cur.execute(sql.SQL('SET LOCAL search_path = {}, public;').format(
                            sql.Identifier(user_schema)
                        ))
                        # Enforce transaction read-only mode
                        cur.execute("SET TRANSACTION READ ONLY;")

                        # 3. Execute query
                        cur.execute(cleaned_sql)

                        columns = [desc.name for desc in cur.description] if cur.description else []

                        # 4. Fetch results up to limit + 1 (to know if more rows exist without loading huge tables)
                        # Maximum practice ceiling: limit capped at 1000
                        cap = min(limit, 1000)
                        raw_rows = cur.fetchmany(cap + 1)
                        total_count = len(raw_rows)
                        if total_count > cap:
                            display_rows = raw_rows[:cap]
                        else:
                            display_rows = raw_rows

                        serialized_rows = [
                            [self.serialize_cell(val) for val in row]
                            for row in display_rows
                        ]

                    conn.rollback()  # Always rollback practice transactions
                except Exception as inner_e:
                    conn.rollback()
                    raise inner_e

            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            self.record_history(user_id, cleaned_sql, duration_ms, "success", len(serialized_rows), None)

            return {
                "success": True,
                "columns": columns,
                "rows": serialized_rows,
                "row_count": len(serialized_rows),
                "total_count": total_count,
                "execution_time_ms": duration_ms,
                "error": None
            }

        except psycopg.Error as pg_err:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            formatted_error = self.format_pg_error(pg_err)
            self.record_history(user_id, cleaned_sql, duration_ms, "error", 0, formatted_error)
            return {
                "success": False,
                "columns": [],
                "rows": [],
                "row_count": 0,
                "total_count": 0,
                "execution_time_ms": duration_ms,
                "error": formatted_error
            }
        except Exception as e:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            err_msg = str(e)
            self.record_history(user_id, cleaned_sql, duration_ms, "error", 0, err_msg)
            return {
                "success": False,
                "columns": [],
                "rows": [],
                "row_count": 0,
                "total_count": 0,
                "execution_time_ms": duration_ms,
                "error": err_msg
            }

query_service = QueryService()
