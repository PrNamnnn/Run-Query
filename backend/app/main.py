from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS
from app.db.postgres import init_database
from app.routes import query, upload, schema, account

app = FastAPI(
    title="Run Query API",
    description="Production-grade PostgreSQL SQL practice platform powered by Supabase",
    version="2.0.0"
)

# Initialize database schema on startup
@app.on_event("startup")
def startup_event():
    init_database()

# Configure CORS with strict environment-defined origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:3000",
    "https://run-query-dfsgdfqka-prnamnnns-projects.vercel.app",
],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(query.router)
app.include_router(upload.router)
app.include_router(schema.router)
app.include_router(account.router)

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "Run Query Engine",
        "engine": "PostgreSQL (Supabase)",
        "version": "2.0.0"
    }
