from fastapi import APIRouter, HTTPException
from app.models.schemas import SchemaResponse, DeleteTableResponse, RenameTableRequest, RenameTableResponse
from app.services.duckdb_service import duckdb_service

router = APIRouter(prefix="/api", tags=["schema"])

@router.get("/schema", response_model=SchemaResponse)
async def get_schema():
    tables = duckdb_service.get_all_tables()
    return {"tables": tables}

@router.delete("/schema/{table_name}", response_model=DeleteTableResponse)
async def drop_table(table_name: str):
    try:
        duckdb_service.drop_table(table_name)
        return DeleteTableResponse(
            success=True,
            table_name=table_name,
            message=f"Table '{table_name}' dropped successfully."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/schema/rename", response_model=RenameTableResponse)
async def rename_table(payload: RenameTableRequest):
    try:
        res = duckdb_service.rename_table(payload.old_name, payload.new_name)
        return RenameTableResponse(
            success=True,
            old_name=res["old_name"],
            new_name=res["new_name"],
            message=f"Table '{res['old_name']}' successfully renamed to '{res['new_name']}'."
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
