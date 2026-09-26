from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.db import SessionLocal
from app.core.security import decode_token
from app.models.user import User

bearer = HTTPBearer(auto_error=False)
async def db():
    async with SessionLocal() as session:
        yield session

async def current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer), session: AsyncSession = Depends(db)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await session.scalar(select(User).where(User.id == int(payload["sub"])))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
