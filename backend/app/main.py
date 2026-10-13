from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import query, upload, schema

app = FastAPI(
    title="SQL Workspace API",
    description="Local-first analytical SQL playground powered by DuckDB",
    version="1.0.0"
)

# Enable CORS for local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(query.router)
app.include_router(upload.router)
app.include_router(schema.router)

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "SQL Workspace Engine",
        "engine": "DuckDB Embedded"
    }
