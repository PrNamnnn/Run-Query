import pytest
from app.services.csv_service import CSVService
from app.services.query_service import QueryService
from app.services.auth_service import get_current_user, UserContext
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
import jwt

# -----------------------------------------------------------------------------
# 1. AUTHENTICATION & ACCESS CONTROL TESTS
# -----------------------------------------------------------------------------

def test_unauthenticated_api_access_blocked():
    """Verify that unauthenticated requests without credentials raise 401."""
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(None)
    assert exc_info.value.status_code == 401

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=""))
    assert exc_info.value.status_code == 401

def test_invalid_bearer_token_rejected():
    """Verify that forged, malformed, or fake Bearer tokens return 401."""
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials="fake_token_12345"))
    assert exc_info.value.status_code == 401

def test_valid_jwt_extraction():
    """Verify that a valid Supabase JWT token successfully extracts UserContext."""
    import app.services.auth_service as auth_mod
    auth_mod.SUPABASE_JWT_SECRET = "test_secret_for_pytest"

    token = jwt.encode(
        {"sub": "test-uuid-001", "email": "analyst@runquery.io", "exp": 9999999999},
        "test_secret_for_pytest",
        algorithm="HS256"
    )
    user = get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
    assert user.user_id == "test-uuid-001"
    assert user.email == "analyst@runquery.io"

# -----------------------------------------------------------------------------
# 2. SQL QUERY SECURITY & ISOLATION TESTS
# -----------------------------------------------------------------------------

def test_query_validation_allowed_statements():
    """Verify that practice read statements (SELECT, WITH, EXPLAIN) are permitted."""
    schema = "usr_test_user_1"

    assert QueryService.validate_practice_query("SELECT * FROM orders WHERE total > 100;", schema) is None
    assert QueryService.validate_practice_query(
        "WITH high_orders AS (SELECT * FROM orders WHERE total > 500) SELECT * FROM high_orders;",
        schema
    ) is None
    assert QueryService.validate_practice_query("EXPLAIN SELECT 1;", schema) is None

def test_query_validation_dangerous_statements_blocked():
    """Verify that data modifications, drops, alters, and privileged calls are blocked."""
    schema = "usr_test_user_1"

    dangerous_queries = [
        "DROP TABLE orders;",
        "ALTER TABLE orders ADD COLUMN hack text;",
        "TRUNCATE orders;",
        "DELETE FROM orders WHERE 1=1;",
        "INSERT INTO orders VALUES (1, 'hack');",
        "UPDATE orders SET region = 'East';",
        "GRANT ALL PRIVILEGES ON DATABASE postgres TO public;",
        "COPY orders TO '/tmp/data.csv';",
        "SELECT pg_read_file('/etc/passwd');",
        "SELECT pg_ls_dir('.');",
        "SELECT pg_sleep(30);",
        "SET ROLE postgres;",
    ]

    for q in dangerous_queries:
        err = QueryService.validate_practice_query(q, schema)
        assert err is not None, f"Query '{q}' should have been blocked!"

def test_cross_user_schema_isolation():
    """Verify that queries attempting to access another user's schema are blocked."""
    current_schema = "usr_user_aaa"
    other_schema_query = "SELECT * FROM usr_user_bbb.orders;"

    err = QueryService.validate_practice_query(other_schema_query, current_schema)
    assert err is not None
    assert "Access denied" in err

# -----------------------------------------------------------------------------
# 3. CSV SANITIZATION & IDENTIFIER TESTS
# -----------------------------------------------------------------------------

def test_table_name_sanitization():
    """Verify that user filenames become safe, clean PostgreSQL identifiers."""
    cases = [
        ("my data.csv", "my_data"),
        ("Customer Orders (2026)!.csv", "customer_orders_2026"),
        ("123_numbers.csv", "t_123_numbers"),
        ("select.csv", "tbl_select"),
        ("user.csv", "tbl_user"),
        ("   spaces   around  .csv", "spaces_around"),
        ("---___---.csv", "dataset"),
    ]

    for filename, expected in cases:
        sanitized = CSVService.sanitize_table_name(filename)
        assert sanitized == expected

def test_column_name_sanitization_and_deduplication():
    """Verify that duplicate or unsafe column headers are safely formatted."""
    raw_headers = ["Customer Name", "Order ID", "Order ID", "total amount", "123num", "select", ""]
    sanitized = CSVService.sanitize_column_names(raw_headers)

    assert sanitized[0] == "customer_name"
    assert sanitized[1] == "order_id"
    assert sanitized[2] == "order_id_1"
    assert sanitized[3] == "total_amount"
    assert sanitized[4] == "c_123num"
    assert sanitized[5] == "col_select"
    assert sanitized[6] == "column_7"

def test_column_type_inference():
    """Verify that column types are inferred correctly."""
    sample_rows = [
        ["101", "24.95", "true", "2026-10-01", "North"],
        ["102", "120.00", "false", "2026-10-02", "South"],
        ["103", "540.20", "true", "2026-10-03", "East"],
    ]
    types = CSVService.infer_column_types(sample_rows, 5)
    assert types == ["BIGINT", "DOUBLE PRECISION", "BOOLEAN", "DATE", "TEXT"]
