import re
import json
from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import (
    SchemaResponse,
    TableSchema,
    ColumnSchema,
    DeleteTableResponse,
    RenameTableRequest,
    RenameTableResponse
)
from app.services.auth_service import UserContext, get_current_user
from app.services.csv_service import CSVService
from app.db.postgres import get_db_connection, get_user_schema_name

router = APIRouter(prefix="/api", tags=["schema"])

@router.get("/schema", response_model=SchemaResponse)
async def get_schema(
    user: UserContext = Depends(get_current_user)
):
    tables = []
    try:
        with get_db_connection(autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT table_name, display_name, row_count, columns
                    FROM public.datasets
                    WHERE user_id = %s
                    ORDER BY created_at ASC;
                    """,
                    (user.user_id,)
                )
                rows = cur.fetchall()
                for r in rows:
                    t_name = str(r[0])
                    d_name = str(r[1]) if r[1] else t_name
                    r_count = int(r[2])
                    raw_cols = r[3]
                    if isinstance(raw_cols, str):
                        cols_data = json.loads(raw_cols)
                    else:
                        cols_data = raw_cols or []

                    cols = [ColumnSchema(name=c["name"], type=c["type"]) for c in cols_data]
                    tables.append(TableSchema(
                        table_name=t_name,
                        display_name=d_name,
                        row_count=r_count,
                        columns=cols
                    ))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch schema: {str(e)}")

    return SchemaResponse(tables=tables)

@router.delete("/schema/{table_name}", response_model=DeleteTableResponse)
async def drop_table(
    table_name: str,
    user: UserContext = Depends(get_current_user)
):
    clean_name = re.sub(r"[^a-zA-Z0-9_]", "_", table_name.strip()).lower()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Invalid table name.")

    user_schema = get_user_schema_name(user.user_id)

    try:
        with get_db_connection(autocommit=False) as conn:
            with conn.cursor() as cur:
                # 1. Verify dataset belongs to user
                cur.execute(
                    "SELECT id FROM public.datasets WHERE user_id = %s AND table_name = %s;",
                    (user.user_id, clean_name)
                )
                exists = cur.fetchone()
                if not exists:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Table '{table_name}' not found or you do not have permission to delete it."
                    )

                # 2. Drop table from user's schema
                cur.execute(f'DROP TABLE IF EXISTS "{user_schema}"."{clean_name}" CASCADE;')

                # 3. Delete metadata
                cur.execute(
                    "DELETE FROM public.datasets WHERE user_id = %s AND table_name = %s;",
                    (user.user_id, clean_name)
                )

            conn.commit()

        return DeleteTableResponse(
            success=True,
            table_name=clean_name,
            message=f"Table '{clean_name}' dropped successfully."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error dropping table: {str(e)}")

@router.post("/schema/rename", response_model=RenameTableResponse)
async def rename_table(
    payload: RenameTableRequest,
    user: UserContext = Depends(get_current_user)
):
    clean_old = re.sub(r"[^a-zA-Z0-9_]", "_", payload.old_name.strip()).lower()
    clean_new = CSVService.sanitize_table_name(payload.new_name)

    if not clean_new:
        raise HTTPException(status_code=400, detail="New table name cannot be empty or invalid.")

    if clean_old == clean_new:
        return RenameTableResponse(
            success=True,
            old_name=clean_old,
            new_name=clean_new,
            message="Table name unchanged."
        )

    user_schema = get_user_schema_name(user.user_id)

    try:
        with get_db_connection(autocommit=False) as conn:
            with conn.cursor() as cur:
                # Check old table ownership
                cur.execute(
                    "SELECT id FROM public.datasets WHERE user_id = %s AND table_name = %s;",
                    (user.user_id, clean_old)
                )
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail=f"Table '{payload.old_name}' not found.")

                # Check if target name already exists for this user
                cur.execute(
                    "SELECT id FROM public.datasets WHERE user_id = %s AND table_name = %s;",
                    (user.user_id, clean_new)
                )
                if cur.fetchone():
                    raise HTTPException(status_code=400, detail=f"A dataset named '{clean_new}' already exists.")

                # Rename PostgreSQL table in user's schema
                cur.execute(f'ALTER TABLE "{user_schema}"."{clean_old}" RENAME TO "{clean_new}";')

                # Update metadata in public.datasets
                cur.execute(
                    """
                    UPDATE public.datasets 
                    SET table_name = %s, display_name = %s, updated_at = now()
                    WHERE user_id = %s AND table_name = %s;
                    """,
                    (clean_new, payload.new_name.strip(), user.user_id, clean_old)
                )

            conn.commit()

        return RenameTableResponse(
            success=True,
            old_name=clean_old,
            new_name=clean_new,
            message=f"Table '{clean_old}' successfully renamed to '{clean_new}'."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error renaming table: {str(e)}")
