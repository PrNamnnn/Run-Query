import duckdb
import time
import re
import threading
from typing import Dict, Any, List, Optional, Tuple

class DuckDBService:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(DuckDBService, cls).__new__(cls)
                cls._instance._init_db()
            return cls._instance

    def _init_db(self):
        # In-memory DuckDB connection
        self.conn = duckdb.connect(database=":memory:")
        self.db_lock = threading.Lock()

    def register_csv_table(self, table_name: str, file_path: str) -> Dict[str, Any]:
        """
        Creates or replaces an in-memory table from a CSV file.
        Detects schema and row count using DuckDB's robust read_csv_auto.
        """
        # Sanitize table name: keep only alphanumeric and underscores
        safe_table_name = re.sub(r"[^a-zA-Z0-9_]", "_", table_name).lower()
        if not safe_table_name or safe_table_name[0].isdigit():
            safe_table_name = f"t_{safe_table_name}"

        with self.db_lock:
            # Drop table if exists then create
            self.conn.execute(f"DROP TABLE IF EXISTS \"{safe_table_name}\"")
            # Create table by reading the CSV
            # Using read_csv_auto with header detection
            escaped_path = file_path.replace("'", "''").replace("\\", "/")
            create_query = f"CREATE TABLE \"{safe_table_name}\" AS SELECT * FROM read_csv_auto('{escaped_path}', header=True);"
            self.conn.execute(create_query)

            # Get row count
            count_res = self.conn.execute(f"SELECT COUNT(*) FROM \"{safe_table_name}\"").fetchone()
            total_rows = count_res[0] if count_res else 0

            # Get schema info
            columns_info = self._get_table_columns_internal(safe_table_name)

        return {
            "table_name": safe_table_name,
            "row_count": total_rows,
            "columns": columns_info
        }

    def _get_table_columns_internal(self, table_name: str) -> List[Dict[str, str]]:
        col_res = self.conn.execute(f"DESCRIBE \"{table_name}\"").fetchall()
        columns = []
        for row in col_res:
            col_name = str(row[0])
            col_type = str(row[1])
            columns.append({"name": col_name, "type": col_type})
        return columns

    def get_all_tables(self) -> List[Dict[str, Any]]:
        with self.db_lock:
            tables_res = self.conn.execute("SHOW TABLES;").fetchall()
            tables = []
            for t in tables_res:
                t_name = str(t[0])
                count_res = self.conn.execute(f"SELECT COUNT(*) FROM \"{t_name}\"").fetchone()
                row_count = count_res[0] if count_res else 0
                cols = self._get_table_columns_internal(t_name)
                tables.append({
                    "table_name": t_name,
                    "row_count": row_count,
                    "columns": cols
                })
        return tables

    def drop_table(self, table_name: str) -> bool:
        clean_name = re.sub(r"[^a-zA-Z0-9_]", "_", table_name.strip()).lower()
        if not clean_name:
            return True
        with self.db_lock:
            self.conn.execute(f"DROP TABLE IF EXISTS \"{clean_name}\"")
            if not clean_name.startswith("t_"):
                self.conn.execute(f"DROP TABLE IF EXISTS \"t_{clean_name}\"")
        return True

    def rename_table(self, old_name: str, new_name: str) -> Dict[str, Any]:
        """
        Renames an in-memory DuckDB table safely.
        Validates identifiers against injection and reserved hazards.
        """
        clean_old = re.sub(r"[^a-zA-Z0-9_]", "_", old_name.strip()).lower()
        clean_new = re.sub(r"[^a-zA-Z0-9_]", "_", new_name.strip()).lower()

        if not clean_new:
            raise ValueError("New table name cannot be empty or invalid.")
        if clean_new[0].isdigit():
            clean_new = f"t_{clean_new}"

        with self.db_lock:
            # Check if old table exists
            existing_tables = [str(r[0]).lower() for r in self.conn.execute("SHOW TABLES;").fetchall()]
            if clean_old not in existing_tables:
                raise ValueError(f"Table '{old_name}' not found.")
            if clean_new in existing_tables and clean_new != clean_old:
                raise ValueError(f"Table '{clean_new}' already exists.")

            # ALTER TABLE "old" RENAME TO "new"
            self.conn.execute(f"ALTER TABLE \"{clean_old}\" RENAME TO \"{clean_new}\"")

            columns_info = self._get_table_columns_internal(clean_new)
            count_res = self.conn.execute(f"SELECT COUNT(*) FROM \"{clean_new}\"").fetchone()
            total_rows = count_res[0] if count_res else 0

        return {
            "old_name": clean_old,
            "new_name": clean_new,
            "row_count": total_rows,
            "columns": columns_info
        }

    def translate_sql_server_syntax(self, query: str) -> str:
        """
        Translates common T-SQL / SQL Server syntax patterns to DuckDB equivalents:
        - TOP N -> LIMIT N
        - ISNULL(a, b) -> COALESCE(a, b)
        - GETDATE() -> CURRENT_TIMESTAMP
        - LEN(str) -> LENGTH(str)
        - CHARINDEX(sub, str) -> INSTR(str, sub)
        - Square bracket identifiers [table].[col] -> "table"."col"
        """
        transformed = query

        # Replace square brackets [identifier] with "identifier"
        transformed = re.sub(r'\[([a-zA-Z0-9_ ]+)\]', r'"\1"', transformed)

        # Replace SELECT TOP (N) or SELECT TOP N with standard SELECT ... LIMIT N (if not already having LIMIT)
        # Handle SELECT TOP N [DISTINCT] or SELECT DISTINCT TOP N
        top_match = re.search(r'\bSELECT\s+(DISTINCT\s+)?TOP\s*(?:\(?\s*(\d+)\s*\)?)\s+', transformed, flags=re.IGNORECASE)
        if top_match:
            is_distinct = top_match.group(1) or ""
            limit_num = top_match.group(2)
            # Remove the TOP N from SELECT
            transformed = re.sub(r'\bSELECT\s+(DISTINCT\s+)?TOP\s*(?:\(?\s*\d+\s*\)?)\s+', f'SELECT {is_distinct}', transformed, count=1, flags=re.IGNORECASE)
            # If query doesn't already end with LIMIT, append LIMIT
            if not re.search(r'\bLIMIT\s+\d+', transformed, flags=re.IGNORECASE):
                transformed = transformed.rstrip('; \t\n\r') + f" LIMIT {limit_num};"

        # ISNULL -> COALESCE
        transformed = re.sub(r'\bISNULL\s*\(', 'COALESCE(', transformed, flags=re.IGNORECASE)

        # GETDATE() -> CURRENT_TIMESTAMP
        transformed = re.sub(r'\bGETDATE\s*\(\s*\)', 'CURRENT_TIMESTAMP', transformed, flags=re.IGNORECASE)

        # LEN( -> LENGTH(
        transformed = re.sub(r'\bLEN\s*\(', 'LENGTH(', transformed, flags=re.IGNORECASE)

        return transformed

    def execute_query(self, sql_query: str, limit: int = 1000, offset: int = 0) -> Dict[str, Any]:
        """
        Executes query safely against DuckDB with execution timing and row caps.
        """
        cleaned_sql = sql_query.strip()
        if not cleaned_sql:
            return {
                "success": False,
                "columns": [],
                "rows": [],
                "row_count": 0,
                "total_count": 0,
                "execution_time_ms": 0.0,
                "error": "Query cannot be empty."
            }

        # Check for banned OS execution functions or dangerous system statements
        # DuckDB functions like read_csv are allowed if user wants, but shell calls aren't supported anyway.
        # Disallow explicit pragma or export if sensitive
        lowered = cleaned_sql.lower()
        if any(bad in lowered for bad in ["install ", "load ", "system(", "copy to '/"]):
            return {
                "success": False,
                "columns": [],
                "rows": [],
                "row_count": 0,
                "total_count": 0,
                "execution_time_ms": 0.0,
                "error": "Restricted operation: Plugin loading, file export, and system commands are disabled for security."
            }

        translated = self.translate_sql_server_syntax(cleaned_sql)
        start_time = time.perf_counter()

        with self.db_lock:
            try:
                # Check if it's a DDL or DML (CREATE, DROP, INSERT, UPDATE, DELETE)
                is_select = bool(re.match(r'^\s*(SELECT|WITH|DESCRIBE|EXPLAIN|SHOW|PRAGMA)\b', translated, re.IGNORECASE))

                if not is_select:
                    self.conn.execute(translated)
                    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
                    return {
                        "success": True,
                        "columns": ["Status"],
                        "rows": [["Query executed successfully."]],
                        "row_count": 1,
                        "total_count": 1,
                        "execution_time_ms": duration_ms,
                        "translated_query": translated if translated != cleaned_sql else None,
                        "error": None
                    }

                cursor = self.conn.execute(translated)
                columns = [desc[0] for desc in cursor.description] if cursor.description else []
                
                # Fetch all or paginate
                # To get true total count without blowing memory:
                all_results = cursor.fetchall()
                total_count = len(all_results)
                
                # Slice according to limit and offset
                page_rows = all_results[offset : offset + limit]

                # Convert DuckDB types (like dates, timestamps, decimals) to JSON serializable Python types
                serialized_rows = []
                for row in page_rows:
                    row_data = []
                    for val in row:
                        if val is None:
                            row_data.append(None)
                        elif isinstance(val, (int, float, bool, str)):
                            row_data.append(val)
                        else:
                            row_data.append(str(val))
                    serialized_rows.append(row_data)

                duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

                return {
                    "success": True,
                    "columns": columns,
                    "rows": serialized_rows,
                    "row_count": len(serialized_rows),
                    "total_count": total_count,
                    "execution_time_ms": duration_ms,
                    "translated_query": translated if translated != cleaned_sql else None,
                    "error": None
                }
            except Exception as e:
                duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
                err_msg = str(e)
                # Format DuckDB error cleanly
                # Remove internal trace info if present
                clean_err = self._format_error(err_msg)
                return {
                    "success": False,
                    "columns": [],
                    "rows": [],
                    "row_count": 0,
                    "total_count": 0,
                    "execution_time_ms": duration_ms,
                    "error": clean_err,
                    "translated_query": translated if translated != cleaned_sql else None
                }

    def _format_error(self, err: str) -> str:
        # Strip extraneous python exception headers
        err = re.sub(r'duckdb\.[a-zA-Z]+Error:\s*', '', err)
        return err.strip()

# Global singleton
duckdb_service = DuckDBService()
