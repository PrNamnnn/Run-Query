from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ColumnSchema(BaseModel):
    name: str
    type: str

class TableSchema(BaseModel):
    table_name: str
    row_count: int
    columns: List[ColumnSchema]
    sample_rows: Optional[List[Dict[str, Any]]] = None

class SchemaResponse(BaseModel):
    tables: List[TableSchema]

class QueryRequest(BaseModel):
    query: str
    limit: Optional[int] = 1000
    offset: Optional[int] = 0

class QueryResponse(BaseModel):
    success: bool
    columns: List[str] = []
    rows: List[List[Any]] = []
    row_count: int = 0
    total_count: int = 0
    execution_time_ms: float = 0.0
    error: Optional[str] = None
    translated_query: Optional[str] = None

class UploadResponse(BaseModel):
    success: bool
    table_name: str
    row_count: int
    columns: List[ColumnSchema]
    message: str

class DeleteTableResponse(BaseModel):
    success: bool
    table_name: str
    message: str

class RenameTableRequest(BaseModel):
    old_name: str
    new_name: str

class RenameTableResponse(BaseModel):
    success: bool
    old_name: str
    new_name: str
    message: str
