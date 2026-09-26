from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.auth import RegisterIn, LoginIn, AuthOut

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=AuthOut)
async def register(data: RegisterIn, session: AsyncSession = Depends(db)):
    if await session.scalar(select(User).where(User.email == data.email)):
        raise HTTPException(409, "Email already registered")
    user = User(email=data.email, name=data.name, password_hash=hash_password(data.password), role=data.role)
    session.add(user); await session.commit(); await session.refresh(user)
    token = create_access_token(str(user.id), user.role)
    return {"access_token": token, "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role}}

@router.post("/login", response_model=AuthOut)
async def login(data: LoginIn, session: AsyncSession = Depends(db)):
    user = await session.scalar(select(User).where(User.email == data.email))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    token = create_access_token(str(user.id), user.role)
    return {"access_token": token, "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role}}
