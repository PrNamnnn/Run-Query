# Run Query

**Run Query** is a production-grade PostgreSQL analytical SQL practice platform. It enables analysts, engineers, and students to upload CSV datasets, write real PostgreSQL queries against isolated schemas, inspect results in a spreadsheet-like grid, and persist their work securely across devices.

Powered by **Supabase PostgreSQL**, **FastAPI**, **Next.js 16 (React 19)**, and **Monaco Editor**.

---

## Architecture Overview

```text
┌────────────────────────────────────────────────────────┐
│             Next.js 16 (React 19) Frontend             │
│    Supabase Auth Client  ·  Monaco Editor  ·  Grid     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS + Bearer <Supabase JWT>
                            ▼
┌────────────────────────────────────────────────────────┐
│                  FastAPI Backend                       │
│    JWT Authentication  ·  User Authorization           │
│    CSV Safe Importer   ·  PostgreSQL Pool (psycopg)    │
└───────────────────────────┬────────────────────────────┘
                            │ Secure Connection Pool (TLS)
                            ▼
┌────────────────────────────────────────────────────────┐
│              Supabase Managed PostgreSQL               │
│                                                        │
│  Public Schema:                                        │
│    - datasets (metadata & ownership)                   │
│    - saved_queries (bookmarked queries)                │
│    - query_history (execution log)                     │
│                                                        │
│  Per-User Isolated Schemas ("usr_<user_id>"):          │
│    - orders, customers, etc. (direct practice tables)  │
└────────────────────────────────────────────────────────┘
```

---

## Key Capabilities & Security Architecture

1. **Real PostgreSQL Analytical Engine**:
   - Executes user queries directly against native PostgreSQL (not an emulation layer).
   - Supports advanced SQL operations: `JOIN`, `LEFT JOIN`, `GROUP BY`, `HAVING`, CTEs (`WITH`), window functions (`ROW_NUMBER()`, `RANK()`, `LEAD()`, `LAG()`), `CASE`, date/time functions, string functions, and aggregations.

2. **Per-User Schema Isolation**:
   - Each authenticated user is provisioned an isolated PostgreSQL schema: `usr_<uuid>`.
   - When a user uploads `orders.csv`, the table is created at `"usr_<uuid>"."orders"`.
   - Query sessions configure:
     ```sql
     SET LOCAL statement_timeout = '15s';
     SET LOCAL search_path = "usr_<user_id>", public;
     SET TRANSACTION READ ONLY;
     ```
   - User A can never discover, query, modify, or drop User B's tables.

3. **Enterprise Authentication via Supabase Auth**:
   - Email/password registration and sign in.
   - Session persistence and automatic token refresh.
   - Built-in secure password recovery flow: recovery email -> secure link -> password reset -> sign in.
   - Protected API routes: every backend endpoint validates the Supabase Bearer JWT.

4. **Query Execution Protection**:
   - Practice platform security policy: queries are validated to begin with `SELECT`, `WITH`, `EXPLAIN`, or `TABLE`.
   - Structural modifications (`DROP`, `ALTER`, `CREATE`, `DELETE`, `UPDATE`, `INSERT`) and administrative functions (`pg_read_file`, `pg_sleep`, `lo_import`, `pg_terminate_backend`) are strictly blocked.
   - Read-only transaction enforcement (`BEGIN READ ONLY; ... ROLLBACK;`).
   - Runaway query prevention via strict 15-second database timeouts.
   - Clean, sanitized error reporting that hides database credentials and connection strings while providing clear syntax error pointers.

5. **Safe CSV Ingestion**:
   - Strips non-alphanumeric characters and SQL reserved keywords from table and column names.
   - Deduplicates headers (`column`, `column_1`).
   - Infers column data types (`BIGINT`, `DOUBLE PRECISION`, `BOOLEAN`, `DATE`, `TEXT`).
   - High-throughput batch insertion into PostgreSQL using connection pooling (`psycopg_pool`).

6. **Account Deletion & Resource Cleanup**:
   - Permanently drops the user's PostgreSQL schema (`DROP SCHEMA IF EXISTS "usr_<id>" CASCADE`).
   - Purges metadata records from `datasets`, `saved_queries`, and `query_history`.
   - Removes the authentication identity from Supabase Auth via the admin API.

7. **Developer Tool Aesthetics**:
   - True-black / near-black dark theme (`#000000`, `#0A0A0A`, `#0F0F0F`, `#141414`) with subtle neutral borders (`#1E1E1E`, `#262626`).
   - Minimal geometric Run Query logo mark (combining terminal prompt and database schema disks).
   - Resizable sidebar and split query editor / results panels.

---

## Database Metadata Schema

```sql
-- Datasets Metadata
CREATE TABLE IF NOT EXISTS public.datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    display_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    row_count INTEGER NOT NULL DEFAULT 0,
    columns JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_table UNIQUE (user_id, table_name)
);

CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON public.datasets(user_id);

-- Saved Queries
CREATE TABLE IF NOT EXISTS public.saved_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    query TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_queries_user_id ON public.saved_queries(user_id);

-- Query History
CREATE TABLE IF NOT EXISTS public.query_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    query TEXT NOT NULL,
    execution_time_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    row_count INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_query_history_user_timestamp ON public.query_history(user_id, created_at DESC);
```

---

## Setup & Local Development

### 1. Prerequisites
- **Node.js**: v18+
- **Python**: 3.10+
- **Supabase Account**: Free project on [supabase.com](https://supabase.com)

### 2. Environment Configuration
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```

Fill in your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL (`https://<id>.supabase.co`).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon/public key.
- `DATABASE_URL`: Supabase PostgreSQL connection string (Transaction pooler on port 6543 recommended).
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role secret (server-side only, used for admin account deletion).
- `SUPABASE_JWT_SECRET`: Optional JWT secret for high-speed local signature decoding.

### 3. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run backend development server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 4. Frontend Setup
```bash
cd frontend
npm install

# Run frontend development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Automated Tests

Run backend unit and security tests:
```bash
cd backend
python -m pytest tests/test_security_and_api.py -v
```

All 9 security and isolation tests will run:
- Unauthenticated API access blocking
- Token forgery rejection
- Practice query validation
- Malicious SQL prevention (`DROP`, `ALTER`, `TRUNCATE`, privileged functions)
- Cross-user schema isolation verification
- CSV table identifier sanitization
- CSV column header sanitization and deduplication
- Column type inference

---

## Deployment Guide

### Frontend -> Vercel
1. Import the repository on [Vercel](https://vercel.com).
2. Set Root Directory to `frontend`.
3. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Backend public URL (e.g. `https://api.runquery.onrender.com`)
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase public key
4. Deploy.

### Backend -> Render / Railway
1. Create a Web Service pointing to the `backend` folder.
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variables:
   - `DATABASE_URL`: Supabase PostgreSQL connection string
   - `SUPABASE_URL`: Your Supabase URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
   - `CORS_ORIGINS`: Your Vercel frontend URL (e.g. `https://your-run-query.vercel.app`)
