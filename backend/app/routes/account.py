import logging
from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import AccountDeleteResponse, UserMeResponse
from app.services.auth_service import UserContext, get_current_user, delete_supabase_auth_user
from app.db.postgres import get_db_connection, get_user_schema_name

logger = logging.getLogger("runquery.account")

router = APIRouter(prefix="/api/account", tags=["account"])

@router.get("/me", response_model=UserMeResponse)
async def get_account_profile(
    user: UserContext = Depends(get_current_user)
):
    total_tables = 0
    total_queries = 0

    try:
        with get_db_connection(autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*) FROM public.datasets WHERE user_id = %s;",
                    (user.user_id,)
                )
                r_tbl = cur.fetchone()
                total_tables = r_tbl[0] if r_tbl else 0

                cur.execute(
                    "SELECT COUNT(*) FROM public.query_history WHERE user_id = %s;",
                    (user.user_id,)
                )
                r_qry = cur.fetchone()
                total_queries = r_qry[0] if r_qry else 0
    except Exception as e:
        logger.warning(f"Error fetching account profile stats: {e}")

    return UserMeResponse(
        user_id=user.user_id,
        email=user.email,
        total_tables=total_tables,
        total_queries=total_queries
    )

@router.delete("", response_model=AccountDeleteResponse)
async def delete_account(
    user: UserContext = Depends(get_current_user)
):
    """
    Safely and permanently deletes user account and all owned resources:
    1. Drops user's isolated PostgreSQL schema (and all contained tables)
    2. Deletes user metadata from public.datasets
    3. Deletes saved queries and query history
    4. Deletes auth user record from Supabase Auth service
    """
    user_schema = get_user_schema_name(user.user_id)

    try:
        with get_db_connection(autocommit=False) as conn:
            with conn.cursor() as cur:
                # 1. Drop user schema and all tables with CASCADE
                cur.execute(f'DROP SCHEMA IF EXISTS "{user_schema}" CASCADE;')

                # 2. Delete metadata records
                cur.execute("DELETE FROM public.datasets WHERE user_id = %s;", (user.user_id,))
                cur.execute("DELETE FROM public.saved_queries WHERE user_id = %s;", (user.user_id,))
                cur.execute("DELETE FROM public.query_history WHERE user_id = %s;", (user.user_id,))

            conn.commit()

        # 3. Delete user in Supabase Auth via admin API
        delete_supabase_auth_user(user.user_id)

        return AccountDeleteResponse(
            success=True,
            message="Your account, datasets, and all associated resources were permanently deleted."
        )
    except Exception as e:
        logger.error(f"Error during account deletion for user {user.user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete account: {str(e)}"
        )
