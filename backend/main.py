import asyncio
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models
from app.config import CORS_ALLOWED_ORIGINS, ensure_runtime_directories
from app.database import engine
from app.middleware import enforce_access_policy
from app.routers import admin, archive, automation, creative, processing
from app.tasks import cleanup_expired_jobs


for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="replace")


app = FastAPI(
    title="AutoSub Pro API",
    description="Hệ thống tạo phụ đề tự động, biên tập và render hardsub.",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(enforce_access_policy)

models.Base.metadata.create_all(bind=engine)
ensure_runtime_directories()

app.include_router(processing.router)
app.include_router(automation.router)
app.include_router(creative.router)
app.include_router(archive.router)
app.include_router(admin.router)


@app.on_event("startup")
async def start_cleanup_task():
    asyncio.create_task(cleanup_expired_jobs())
