from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import (
    QueryRequest,
    QueryResponse,
    QueryHistoryItemSchema,
    SavedQueryCreate,
    SavedQueryItem
)
from app.services.auth_service import UserContext, get_current_user
from app.services.query_service import query_service
from app.db.postgres import get_db_connection

router = APIRouter(prefix="/api", tags=["query"])

@router.post("/query", response_model=QueryResponse)
async def run_query(
    payload: QueryRequest,
    user: UserContext = Depends(get_current_user)
):
    result = query_service.execute_query(
        sql_query=payload.query,
        user_id=user.user_id,
        limit=payload.limit or 1000,
        offset=payload.offset or 0
    )
    return result

@router.get("/history", response_model=List[QueryHistoryItemSchema])
async def get_query_history(
    user: UserContext = Depends(get_current_user)
):
    items = []
    try:
        with get_db_connection(autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, query, execution_time_ms, status, row_count, error, created_at
                    FROM public.query_history
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    LIMIT 100;
                    """,
                    (user.user_id,)
                )
                rows = cur.fetchall()
                for r in rows:
                    items.append(QueryHistoryItemSchema(
                        id=str(r[0]),
                        query=str(r[1]),
                        execution_time_ms=float(r[2]),
                        status=str(r[3]),
                        row_count=int(r[4]),
                        error=r[5],
                        created_at=r[6].isoformat() if hasattr(r[6], "isoformat") else str(r[6])
                    ))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")
    return items

@router.delete("/history")
async def clear_query_history(
    user: UserContext = Depends(get_current_user)
):
    try:
        with get_db_connection(autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM public.query_history WHERE user_id = %s;", (user.user_id,))
        return {"success": True, "message": "Query history cleared."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear history: {str(e)}")

@router.delete("/history/{item_id}")
async def delete_history_item(
    item_id: str,
    user: UserContext = Depends(get_current_user)
):
    try:
        with get_db_connection(autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM public.query_history WHERE id = %s AND user_id = %s;",
                    (item_id, user.user_id)
                )
        return {"success": True, "message": "History item removed."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete history item: {str(e)}")

@router.get("/saved-queries", response_model=List[SavedQueryItem])
async def get_saved_queries(
    user: UserContext = Depends(get_current_user)
):
    saved = []
    try:
        with get_db_connection(autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, name, query, created_at, updated_at
                    FROM public.saved_queries
                    WHERE user_id = %s
                    ORDER BY updated_at DESC;
                    """,
                    (user.user_id,)
                )
                rows = cur.fetchall()
                for r in rows:
                    saved.append(SavedQueryItem(
                        id=str(r[0]),
                        name=str(r[1]),
                        query=str(r[2]),
                        created_at=r[3].isoformat() if hasattr(r[3], "isoformat") else str(r[3]),
                        updated_at=r[4].isoformat() if hasattr(r[4], "isoformat") else str(r[4])
                    ))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch saved queries: {str(e)}")
    return saved

@router.post("/saved-queries", response_model=SavedQueryItem)
async def create_saved_query(
    payload: SavedQueryCreate,
    user: UserContext = Depends(get_current_user)
):
    try:
        with get_db_connection(autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO public.saved_queries (user_id, name, query, created_at, updated_at)
                    VALUES (%s, %s, %s, now(), now())
                    RETURNING id, name, query, created_at, updated_at;
                    """,
                    (user.user_id, payload.name, payload.query)
                )
                r = cur.fetchone()
                return SavedQueryItem(
                    id=str(r[0]),
                    name=str(r[1]),
                    query=str(r[2]),
                    created_at=r[3].isoformat() if hasattr(r[3], "isoformat") else str(r[3]),
                    updated_at=r[4].isoformat() if hasattr(r[4], "isoformat") else str(r[4])
                )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save query: {str(e)}")

@router.delete("/saved-queries/{item_id}")
async def delete_saved_query(
    item_id: str,
    user: UserContext = Depends(get_current_user)
):
    try:
        with get_db_connection(autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM public.saved_queries WHERE id = %s AND user_id = %s;",
                    (item_id, user.user_id)
                )
        return {"success": True, "message": "Saved query deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete saved query: {str(e)}")
