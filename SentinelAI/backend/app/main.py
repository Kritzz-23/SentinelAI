from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from app.core.db import Base, engine, SessionLocal
from app.core.security import hash_password
from app.core.config import settings
from app.models.user import User
from app.models.incident import Incident
from app.api.auth import router as auth_router
from app.api.incidents import router as incident_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    if settings.seed_demo:
        async with SessionLocal() as session:
            if not await session.scalar(select(User).where(User.email == "admin@sentinel.local")):
                session.add(User(email="admin@sentinel.local", name="Sentinel Admin", password_hash=hash_password("Admin@123"), role="admin"))
                await session.commit()
    yield
    await engine.dispose()

app = FastAPI(title="SentinelAI API", version="1.0.0", description="Real-time incident management API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth_router, prefix="/api/v1")
app.include_router(incident_router, prefix="/api/v1")

@app.get("/api/v1/health", tags=["Health"])
async def health(): return {"status": "ok", "service": "sentinel-api"}
