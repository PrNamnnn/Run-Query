# SQL Workspace

**SQL Workspace** is a production-quality, local-first analytical SQL playground. It allows users to upload CSV datasets, write and execute **SQL Server / SSMS-style SQL queries**, inspect results in a spreadsheet-like grid, and persist their work without requiring external application databases (no PostgreSQL, MySQL, Redis, or Celery).

Powered by **DuckDB In-Memory** and a modern **Next.js (React 19) + Tailwind CSS** frontend.

---

## Features

- **Local-First Architecture**: No application database servers required. Uploaded datasets and metadata persist in browser **IndexedDB**, while analytical execution runs directly in embedded DuckDB memory.
- **Unified & Reliable Execution**: Single-path query pipeline (`Ctrl+Enter`, `Cmd+Enter`, and Run button share identical state transitions). Predictable result handling, even for 0-row results.
- **SSMS / SQL Server Syntax Support**: Automatic translation of common T-SQL idioms like `SELECT TOP (N)`, `[bracket_identifiers]`, `ISNULL()`, `GETDATE()`, and `LEN()`.
- **Dynamic Editor Font Zoom**: Zoom in/out smoothly using `Ctrl/Cmd + Scroll`, `Ctrl/Cmd + + / -`, `Ctrl + 0`, or through Settings without triggering browser webpage zoom.
- **Theme & Appearance Engine**: Dark, Light, System (`prefers-color-scheme`), and Custom themes with accent presets (Blue, Indigo, Emerald, Purple, Orange) and custom hex support with smooth 200ms transitions.
- **Full Resizability**: Draggable sidebar width (220px–450px), split editor/results pane (20%–80%), and spreadsheet result table column widths.
- **CSV Table Renaming**: Rename uploaded tables directly from the schema explorer with validation and backend DuckDB synchronization.
- **Instant Schema Detection**: Automatically infers column names and types (`BIGINT`, `VARCHAR`, `DOUBLE`, `DATE`) from raw CSV uploads.
- **Monaco SQL Code Editor**: Dark and light-themed editor with SQL keyword autocomplete, error highlighting, line numbers, and keyboard shortcuts.
- **Query History**: Automatically retains the last 30 days of query history and prunes older entries.
- **Saved Queries**: Bookmark frequently used queries locally.
- **Spreadsheet-style Results Table**: Fast row virtualization, row numbers, execution timing, and export to CSV or JSON.
- **Command Palette (`Ctrl+K`)**: Quick keyboard navigation for running queries, uploading files, opening settings, and managing views.
- **Professional Custom Favicon**: Handcrafted SVG database-terminal brand icon.

---

## Architecture

```text
┌────────────────────────────────────────────────────────┐
│               Frontend (Next.js / React)               │
│   Monaco Editor · Virtual Table · IndexedDB Storage     │
└───────────────────────────┬────────────────────────────┘
                            │ REST API (JSON / FormData)
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Backend (FastAPI)                     │
│         CSV Parser · T-SQL Syntax Translator           │
└───────────────────────────┬────────────────────────────┘
                            │ In-Memory C-Bindings
                            ▼
┌────────────────────────────────────────────────────────┐
│             Embedded DuckDB Analytical Engine          │
│                Instant Vectorized Queries              │
└────────────────────────────────────────────────────────┘
```

---

## Installation & Setup

### Prerequisites

- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS / Linux:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend API will be live at `http://127.0.0.1:8000`.

### 2. Frontend Setup

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## CSV Workflow

1. Sign in on the login page (or click **Skip as Analyst**).
2. Click **Upload CSV** or drop your files (`sample_data/orders.csv`, `customers.csv`, `products.csv`).
3. DuckDB auto-detects column names and types, and the table appears in the left **Datasets** explorer.
4. Double-click any table or column name in the sidebar to paste it into the editor.
5. Hit `Ctrl + Enter` (or click **Run Query**).
6. Export the output to CSV or JSON using the export buttons above the result grid.

---

## SQL Examples

### 1. Basic Aggregation & SSMS `TOP` Syntax

```sql
SELECT TOP 5
    region,
    COUNT(*) AS total_orders,
    ROUND(SUM(total_amount), 2) AS total_revenue
FROM [orders]
GROUP BY region
ORDER BY total_revenue DESC;
```

### 2. Multi-Table Join

```sql
SELECT 
    o.order_id,
    c.customer_name,
    c.city,
    o.region,
    o.total_amount,
    o.status
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.status = 'Delivered'
ORDER BY o.total_amount DESC;
```

### 3. T-SQL Function Compatibility

```sql
SELECT 
    customer_name,
    ISNULL(city, 'Unknown') AS city_location,
    LEN(customer_name) AS name_length
FROM customers;
```

---

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl + Enter` / `Cmd + Enter` | Run active SQL query |
| `Ctrl + S` / `Cmd + S` | Save current query |
| `Ctrl + K` / `Cmd + K` | Open Command Palette |
| `Escape` | Close modal or palette |

---

## Limitations

- Data processing is executed in embedded memory: suited for analytical queries and datasets up to several gigabytes within system RAM limits.
- System-level operations (e.g. arbitrary OS commands or filesystem execution) are intentionally blocked for security.

---

## Project Structure

```text
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entrypoint
│   │   ├── routes/
│   │   │   ├── query.py         # /api/query execution endpoint
│   │   │   ├── upload.py        # /api/upload CSV processing endpoint
│   │   │   └── schema.py        # /api/schema tables and describe endpoint
│   │   ├── services/
│   │   │   ├── duckdb_service.py# In-memory DuckDB engine & T-SQL translator
│   │   │   └── csv_service.py   # Temporary CSV streaming & table registration
│   │   └── models/
│   │       └── schemas.py       # Pydantic request and response schemas
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Main dashboard layout and state orchestrator
│   │   └── globals.css          # Dark developer theme tokens
│   ├── components/
│   │   ├── LoginPage.tsx        # Developer authentication screen
│   │   ├── Sidebar.tsx          # Schema explorer, saved queries, 30d history
│   │   ├── QueryEditor.tsx      # Monaco editor integration
│   │   ├── ResultsTable.tsx     # Spreadsheet table grid and export controls
│   │   ├── StatusBar.tsx        # Row count, duration, engine status
│   │   ├── UploadModal.tsx      # Drag & drop CSV modal
│   │   ├── SaveQueryModal.tsx   # Query bookmarking modal
│   │   └── CommandPalette.tsx   # Ctrl+K command menu
│   ├── lib/
│   │   ├── api.ts               # Backend API client
│   │   └── db.ts                # IndexedDB persistence (datasets, 30d history)
│   └── types/
│       └── index.ts             # TypeScript definitions
├── sample_data/
│   ├── orders.csv               # Sample sales orders dataset
│   ├── customers.csv            # Sample customer records dataset
│   └── products.csv             # Sample product catalog dataset
├── .env.example
├── .gitignore
└── README.md
```
