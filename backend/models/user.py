from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None
    role: str = "student"

class UserInDB(UserBase):
    google_id: Optional[str] = None
    password_hash: Optional[str] = None
    is_verified: bool = False
    created_at: datetime = datetime.utcnow()

class OTPBase(BaseModel):
    email: EmailStr
    otp: str
    expires_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=72)

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=72)
    name: Optional[str] = None

class VerifyRequest(BaseModel):
    email: EmailStr
    otp: str
