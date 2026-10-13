from fastapi import APIRouter
from app.models.schemas import QueryRequest, QueryResponse
from app.services.duckdb_service import duckdb_service

router = APIRouter(prefix="/api", tags=["query"])

@router.post("/query", response_model=QueryResponse)
async def run_query(payload: QueryRequest):
    result = duckdb_service.execute_query(
        sql_query=payload.query,
        limit=payload.limit or 1000,
        offset=payload.offset or 0
    )
    return result
