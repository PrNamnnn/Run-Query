import os
import asyncio
import jwt
from app.main import app
from app.services.csv_service import CSVService
from app.services.query_service import QueryService
from app.services.auth_service import get_current_user, verify_token_locally, UserContext
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

def test_unit_services():
    print("Testing Query Validation...")
    schema = "usr_user_123"
    assert QueryService.validate_practice_query("SELECT * FROM orders;", schema) is None
    assert QueryService.validate_practice_query("WITH cte AS (SELECT 1) SELECT * FROM cte;", schema) is None
    assert QueryService.validate_practice_query("EXPLAIN SELECT 1;", schema) is None

    # Banned statements
    for bad in ["DROP TABLE orders;", "DELETE FROM orders;", "ALTER TABLE orders DROP COLUMN id;"]:
        err = QueryService.validate_practice_query(bad, schema)
        assert err is not None, f"Expected {bad} to be blocked"

    # Cross-schema check
    assert QueryService.validate_practice_query("SELECT * FROM usr_other_schema.orders;", schema) is not None
    print("  [OK] Query Validation passed.")

    print("Testing CSV Table Sanitization...")
    assert CSVService.sanitize_table_name("My Data (2026).csv") == "my_data_2026"
    assert CSVService.sanitize_table_name("123orders.csv") == "t_123orders"
    assert CSVService.sanitize_table_name("select.csv") == "tbl_select"
    assert CSVService.sanitize_table_name("---.csv") == "dataset"
    print("  [OK] CSV Table Sanitization passed.")

    print("Testing CSV Column Sanitization...")
    cols = CSVService.sanitize_column_names(["User Name", "Order ID", "Order ID", "123num", ""])
    assert cols == ["user_name", "order_id", "order_id_1", "c_123num", "column_5"]
    print("  [OK] CSV Column Sanitization passed.")

    print("Testing Column Type Inference...")
    rows = [["100", "25.5", "true", "2026-01-01"], ["200", "50.0", "false", "2026-01-02"]]
    types = CSVService.infer_column_types(rows, 4)
    assert types == ["BIGINT", "DOUBLE PRECISION", "BOOLEAN", "DATE"]
    print("  [OK] Column Type Inference passed.")

def test_auth_guard():
    print("Testing Auth Guard...")
    # Missing credentials must raise 401 HTTPException
    try:
        get_current_user(None)
        assert False, "Expected 401 when credentials is None"
    except HTTPException as e:
        assert e.status_code == 401
        print("  [OK] None credentials blocked with 401.")

    try:
        get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=""))
        assert False, "Expected 401 when token is empty"
    except HTTPException as e:
        assert e.status_code == 401
        print("  [OK] Empty Bearer token blocked with 401.")

    try:
        get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials="fake_token_value"))
        assert False, "Expected 401 when token is invalid"
    except HTTPException as e:
        assert e.status_code == 401
        print("  [OK] Invalid token blocked with 401.")

    # Test valid Supabase JWT decoding
    import app.services.auth_service as auth_mod
    auth_mod.SUPABASE_JWT_SECRET = "super_secret_test_key"
    token = jwt.encode(
        {"sub": "user-uuid-9999", "email": "analyst@runquery.dev", "exp": 9999999999},
        "super_secret_test_key",
        algorithm="HS256"
    )
    user = get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
    assert user.user_id == "user-uuid-9999"
    assert user.email == "analyst@runquery.dev"
    print("  [OK] Valid Supabase JWT verified and extracted UserContext.")

if __name__ == "__main__":
    test_unit_services()
    test_auth_guard()
    print("\nALL BACKEND SECURITY & UNIT TESTS PASSED SUCCESSFULLY!")
