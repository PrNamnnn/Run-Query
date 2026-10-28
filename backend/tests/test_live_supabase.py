import sys
import uuid
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.db.postgres import get_db_connection, get_user_schema_name, init_database
from app.services.csv_service import csv_service
from app.services.query_service import query_service
from fastapi import UploadFile

def run_live_supabase_test():
    print("--- LIVE SUPABASE POSTGRESQL INTEGRATION TEST ---")
    
    # 1. Initialize tables
    print("1. Initializing metadata tables...")
    init_database()
    print("   [OK] Tables created in public schema.")

    # 2. Upload sample CSVs into an isolated test user schema
    test_user_id = str(uuid.uuid4())
    test_schema = get_user_schema_name(test_user_id)
    print(f"2. Testing CSV upload for user {test_user_id} in schema {test_schema}...")

    customers_path = backend_dir.parent / "sample_data" / "customers.csv"
    orders_path = backend_dir.parent / "sample_data" / "orders.csv"

    import io
    with open(customers_path, "rb") as f:
        file_obj = UploadFile(filename="customers.csv", file=io.BytesIO(f.read()))
        import asyncio
        res_cust = asyncio.run(csv_service.process_and_register_csv(file_obj, test_user_id))
        print(f"   [OK] Created table '{res_cust['table_name']}' with {res_cust['row_count']} rows.")

    with open(orders_path, "rb") as f:
        file_obj = UploadFile(filename="orders.csv", file=io.BytesIO(f.read()))
        res_ord = asyncio.run(csv_service.process_and_register_csv(file_obj, test_user_id))
        print(f"   [OK] Created table '{res_ord['table_name']}' with {res_ord['row_count']} rows.")

    # 3. Execute complex real PostgreSQL query: JOIN, GROUP BY, Aggregate, ORDER BY
    print("3. Executing real PostgreSQL query with JOIN and GROUP BY...")
    sql = """
    SELECT 
        c.segment, 
        COUNT(o.order_id) AS total_orders, 
        ROUND(SUM(o.total_amount)::numeric, 2) AS total_revenue
    FROM customers c
    JOIN orders o ON c.customer_id = o.customer_id
    GROUP BY c.segment
    ORDER BY total_revenue DESC;
    """

    res = query_service.execute_query(sql, test_user_id)
    assert res["success"] is True, f"Query failed: {res.get('error')}"
    print(f"   [OK] Query executed in {res['execution_time_ms']} ms.")
    print("   Columns:", res["columns"])
    print("   Result rows:")
    for row in res["rows"]:
        print("    ", row)

    # 4. Cleanup test schema
    print("4. Cleaning up test schema...")
    with get_db_connection(autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(f'DROP SCHEMA IF EXISTS "{test_schema}" CASCADE;')
            cur.execute("DELETE FROM public.datasets WHERE user_id = %s;", (test_user_id,))
            cur.execute("DELETE FROM public.query_history WHERE user_id = %s;", (test_user_id,))
    print(f"   [OK] Schema {test_schema} dropped and cleaned up completely.")

    print("\n>>> LIVE SUPABASE POSTGRESQL TEST PASSED 100%! <<<")

def test_live_supabase_postgresql():
    """Live integration test against Supabase PostgreSQL.
    Requires live network access and valid Supabase credentials.
    If the database host is unreachable (e.g. offline sandbox or missing credentials),
    reports the skip reason clearly.
    """
    import pytest
    import psycopg_pool
    try:
        run_live_supabase_test()
    except (psycopg_pool.PoolTimeout, OSError) as e:
        pytest.skip(f"Supabase PostgreSQL host unreachable (offline sandbox or network restricted): {e}")

if __name__ == "__main__":
    run_live_supabase_test()
