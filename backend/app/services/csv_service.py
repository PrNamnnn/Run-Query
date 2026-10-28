import os
import re
import csv
import json
import io
from typing import Dict, Any, List, Tuple
from fastapi import UploadFile, HTTPException
from app.db.postgres import get_db_connection, get_user_schema_name

# PostgreSQL keywords that shouldn't be bare table names without quotes
PG_RESERVED = {
    "all", "analyse", "analyze", "and", "any", "array", "as", "asc", "asymmetric",
    "both", "case", "cast", "check", "collate", "column", "constraint", "create",
    "current_catalog", "current_date", "current_role", "current_time", "current_timestamp",
    "current_user", "default", "deferrable", "desc", "distinct", "do", "else", "end",
    "except", "false", "fetch", "for", "foreign", "from", "grant", "group", "having",
    "in", "initially", "intersect", "into", "lateral", "leading", "limit", "localtime",
    "localtimestamp", "not", "null", "offset", "on", "only", "or", "order", "placing",
    "primary", "references", "returning", "select", "session_user", "some", "symmetric",
    "table", "then", "to", "trailing", "true", "union", "unique", "user", "using",
    "variadic", "when", "where", "window", "with"
}

class CSVService:
    @staticmethod
    def sanitize_table_name(filename: str) -> str:
        """
        Derives a safe PostgreSQL identifier from a filename.
        e.g. "Customer Orders (2026).csv" -> "customer_orders_2026"
        """
        base = os.path.splitext(filename)[0].strip()
        cleaned = re.sub(r"[^a-zA-Z0-9_]", "_", base).lower()
        cleaned = re.sub(r"_+", "_", cleaned).strip("_")

        if not cleaned:
            cleaned = "dataset"
        if cleaned[0].isdigit():
            cleaned = f"t_{cleaned}"
        if cleaned in PG_RESERVED:
            cleaned = f"tbl_{cleaned}"

        # Truncate to safe length (PostgreSQL identifiers are max 63 bytes)
        return cleaned[:50]

    @staticmethod
    def sanitize_column_names(raw_headers: List[str]) -> List[str]:
        """
        Sanitizes raw column names, strips unwanted characters, and deduplicates.
        """
        seen: Dict[str, int] = {}
        sanitized: List[str] = []

        for idx, raw in enumerate(raw_headers):
            name = raw.strip()
            # Replace non-alphanumeric with underscores
            clean = re.sub(r"[^a-zA-Z0-9_]", "_", name).lower()
            clean = re.sub(r"_+", "_", clean).strip("_")

            if not clean:
                clean = f"column_{idx + 1}"
            if clean[0].isdigit():
                clean = f"c_{clean}"
            if clean in PG_RESERVED:
                clean = f"col_{clean}"

            clean = clean[:50]

            if clean in seen:
                seen[clean] += 1
                unique_name = f"{clean}_{seen[clean]}"
            else:
                seen[clean] = 0
                unique_name = clean

            sanitized.append(unique_name)

        return sanitized

    @staticmethod
    def infer_column_types(rows_sample: List[List[str]], num_cols: int) -> List[str]:
        """
        Infers PostgreSQL column types based on sample rows:
        BIGINT, DOUBLE PRECISION, BOOLEAN, DATE, TIMESTAMP, or TEXT.
        """
        types = ["BIGINT"] * num_cols

        for col_idx in range(num_cols):
            has_val = False
            is_int = True
            is_float = True
            is_bool = True
            is_date = True

            for row in rows_sample:
                if col_idx >= len(row):
                    continue
                val = row[col_idx].strip()
                if not val:
                    continue  # Null / empty, skip

                has_val = True

                # Check bool
                if is_bool and val.lower() not in {"true", "false", "t", "f", "1", "0", "yes", "no"}:
                    is_bool = False

                # Check int
                if is_int:
                    if not re.match(r"^-?\d+$", val):
                        is_int = False

                # Check float
                if is_float:
                    try:
                        float(val)
                    except ValueError:
                        is_float = False

                # Check date (YYYY-MM-DD)
                if is_date:
                    if not re.match(r"^\d{4}-\d{2}-\d{2}$", val):
                        is_date = False

            if not has_val:
                types[col_idx] = "TEXT"
            elif is_int:
                types[col_idx] = "BIGINT"
            elif is_float:
                types[col_idx] = "DOUBLE PRECISION"
            elif is_bool:
                types[col_idx] = "BOOLEAN"
            elif is_date:
                types[col_idx] = "DATE"
            else:
                types[col_idx] = "TEXT"

        return types

    @staticmethod
    def coerce_value(val: str, col_type: str) -> Any:
        v = val.strip()
        if not v or v.lower() in {"null", "none", "nan", "nil"}:
            return None

        if col_type == "BIGINT":
            try:
                return int(v)
            except ValueError:
                return None
        elif col_type == "DOUBLE PRECISION":
            try:
                return float(v)
            except ValueError:
                return None
        elif col_type == "BOOLEAN":
            return v.lower() in {"true", "t", "1", "yes"}
        return v

    async def process_and_register_csv(
        self,
        file: UploadFile,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Safely parses uploaded CSV, infers schema, creates a table in user's
        isolated PostgreSQL schema, batch-inserts rows, and registers metadata.
        """
        raw_bytes = await file.read()
        if not raw_bytes:
            raise HTTPException(status_code=400, detail=f"File '{file.filename}' is empty.")

        # Decode content with UTF-8 fallback to Latin-1
        try:
            content = raw_bytes.decode("utf-8-sig")
        except UnicodeDecodeError:
            try:
                content = raw_bytes.decode("latin-1")
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unable to decode CSV file '{file.filename}': {str(e)}"
                )

        # Parse CSV lines
        reader = csv.reader(io.StringIO(content))
        try:
            header_row = next(reader)
        except StopIteration:
            raise HTTPException(status_code=400, detail=f"CSV file '{file.filename}' contains no rows.")

        if not header_row or all(not h.strip() for h in header_row):
            raise HTTPException(status_code=400, detail=f"CSV file '{file.filename}' contains no valid headers.")

        sanitized_headers = self.sanitize_column_names(header_row)
        num_cols = len(sanitized_headers)

        # Read remaining rows
        rows: List[List[str]] = []
        for line in reader:
            if not line or all(not cell.strip() for cell in line):
                continue  # skip completely blank rows
            # Pad or truncate row to match column count
            if len(line) < num_cols:
                line = line + [""] * (num_cols - len(line))
            elif len(line) > num_cols:
                line = line[:num_cols]
            rows.append(line)

        # Infer column types using sample of first 1000 rows
        sample_rows = rows[:1000]
        col_types = self.infer_column_types(sample_rows, num_cols)

        # Determine table name and user schema
        table_name = self.sanitize_table_name(file.filename or "dataset.csv")
        user_schema = get_user_schema_name(user_id)
        columns_schema = [
            {"name": col, "type": t}
            for col, t in zip(sanitized_headers, col_types)
        ]

        # Connect to PostgreSQL and persist table inside user schema
        with get_db_connection(autocommit=False) as conn:
            try:
                with conn.cursor() as cur:
                    # 1. Ensure user schema exists
                    cur.execute(f'CREATE SCHEMA IF NOT EXISTS "{user_schema}";')

                    # 2. Drop existing table if user is re-uploading/replacing dataset
                    cur.execute(f'DROP TABLE IF EXISTS "{user_schema}"."{table_name}" CASCADE;')

                    # 3. Create table with inferred column types
                    col_defs = ", ".join([f'"{col}" {t}' for col, t in zip(sanitized_headers, col_types)])
                    create_sql = f'CREATE TABLE "{user_schema}"."{table_name}" ({col_defs});'
                    cur.execute(create_sql)

                    # 4. Batch insert rows
                    if rows:
                        placeholders = ", ".join(["%s"] * num_cols)
                        insert_sql = f'INSERT INTO "{user_schema}"."{table_name}" VALUES ({placeholders})'

                        batch_size = 1000
                        for i in range(0, len(rows), batch_size):
                            batch = rows[i:i + batch_size]
                            coerced_batch = [
                                [self.coerce_value(cell, t) for cell, t in zip(r, col_types)]
                                for r in batch
                            ]
                            cur.executemany(insert_sql, coerced_batch)

                    # 5. Upsert metadata in public.datasets
                    upsert_metadata = """
                    INSERT INTO public.datasets (user_id, display_name, table_name, row_count, columns, updated_at)
                    VALUES (%s, %s, %s, %s, %s, now())
                    ON CONFLICT (user_id, table_name)
                    DO UPDATE SET
                        display_name = EXCLUDED.display_name,
                        row_count = EXCLUDED.row_count,
                        columns = EXCLUDED.columns,
                        updated_at = now();
                    """
                    cur.execute(
                        upsert_metadata,
                        (user_id, file.filename, table_name, len(rows), json.dumps(columns_schema))
                    )

                conn.commit()
            except Exception as e:
                conn.rollback()
                raise HTTPException(
                    status_code=500,
                    detail=f"Database error while saving dataset '{table_name}': {str(e)}"
                )

        return {
            "table_name": table_name,
            "row_count": len(rows),
            "columns": columns_schema
        }

csv_service = CSVService()
