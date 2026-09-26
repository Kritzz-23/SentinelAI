from pydantic import BaseModel, EmailStr

class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "engineer"

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
