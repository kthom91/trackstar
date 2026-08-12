from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from sqlmodel import Session
from app.core.config import settings
from app.core.db import init_db, engine
from app.api.v1.logs import router as logs_router
from app.api.v1.media import router as media_router
from app.api.v1.sync import router as sync_router
from app.services.scheduler import start_scheduler, stop_scheduler
from app.services.importers import repair_concert_log_dates

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with Session(engine) as session:
        repair_concert_log_dates(session)
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware for Angular SPA frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)


# Include API v1 Routers
app.include_router(logs_router, prefix="/api/v1")
app.include_router(media_router, prefix="/api/v1")
app.include_router(sync_router, prefix="/api/v1")

@app.get("/healthz", tags=["System"])
async def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME}

# Mount Angular static build files if frontend build exists
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist", "frontend", "browser")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
