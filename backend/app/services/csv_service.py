import os
import shutil
import tempfile
from fastapi import UploadFile
from typing import Dict, Any
from app.services.duckdb_service import duckdb_service

class CSVService:
    @staticmethod
    async def process_and_register_csv(file: UploadFile) -> Dict[str, Any]:
        """
        Saves incoming CSV to a temporary secure location, registers it into DuckDB,
        and cleans up the temp file while keeping DuckDB's in-memory table active.
        """
        # Derive clean table name from filename
        original_filename = file.filename or "dataset.csv"
        raw_name = os.path.splitext(original_filename)[0]

        # Use temporary file context
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
            tmp_path = tmp.name
            shutil.copyfileobj(file.file, tmp)

        try:
            # Register into DuckDB memory
            result = duckdb_service.register_csv_table(raw_name, tmp_path)
            return result
        finally:
            # Clean up the physical file on disk immediately (local-first / in-memory policy)
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

csv_service = CSVService()
