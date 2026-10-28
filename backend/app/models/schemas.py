from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ColumnSchema(BaseModel):
    name: str
    type: str

class TableSchema(BaseModel):
    table_name: str
    row_count: int
    columns: List[ColumnSchema]
    display_name: Optional[str] = None

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

class SavedQueryCreate(BaseModel):
    name: str
    query: str

class SavedQueryItem(BaseModel):
    id: str
    name: str
    query: str
    created_at: str
    updated_at: str

class QueryHistoryItemSchema(BaseModel):
    id: str
    query: str
    execution_time_ms: float
    status: str
    row_count: int
    error: Optional[str] = None
    created_at: str

class AccountDeleteResponse(BaseModel):
    success: bool
    message: str

class UserMeResponse(BaseModel):
    user_id: str
    email: str
    total_tables: int
    total_queries: int
