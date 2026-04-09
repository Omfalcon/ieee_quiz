import random
import string
import bcrypt
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from authlib.integrations.starlette_client import OAuth
from fastapi.responses import RedirectResponse

from backend.config import settings
from backend.database import get_db
from backend.models.user import (
    UserInDB, Token, LoginRequest, 
    SignupRequest, VerifyRequest
)
from backend.utils.jwt_utils import create_access_token
from backend.utils.email_utils import send_otp_email

router = APIRouter()
oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

@router.post("/student/signup")
async def student_signup(req: SignupRequest, background_tasks: BackgroundTasks):
    db = get_db()
    email_str = str(req.email).strip().lower()
    existing_user = db.users.find_one({"email": email_str})
    if existing_user and existing_user.get("is_verified"):
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pwd = get_password_hash(req.password)
    user_data = UserInDB(
        email=email_str,
        name=req.name,
        password_hash=hashed_pwd,
        role="student",
        is_verified=False
    )
    
    # Cast email to string explicitly to avoid BSON encoding failure of Pydantic EmailStr type
    user_dict = user_data.dict()
    user_dict["email"] = email_str
    
    db.users.update_one(
        {"email": email_str},
        {"$set": user_dict},
        upsert=True
    )
    
    otp = generate_otp()
    expires = datetime.utcnow() + timedelta(minutes=10)
    
    db.otps.update_one(
        {"email": email_str},
        {"$set": {"otp": otp, "expires_at": expires}},
        upsert=True
    )
    
    background_tasks.add_task(send_otp_email, email_str, otp)
    return {"message": "OTP sent successfully"}

@router.post("/student/verify-otp")
async def verify_otp(req: VerifyRequest):
    db = get_db()
    email_str = str(req.email).strip().lower()
    otp_record = db.otps.find_one({"email": email_str})
    
    print(f"VERIFY_OTP DEBUG -> REQ EMAIL: '{email_str}' | REQ OTP: '{req.otp}'")
    print(f"VERIFY_OTP DEBUG -> DB RECORD: {otp_record}")

    if not otp_record:
        raise HTTPException(status_code=400, detail="OTP not found or expired")
    
    if otp_record["otp"] != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if otp_record["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")
        
    db.users.update_one(
        {"email": email_str},
        {"$set": {"is_verified": True}}
    )
    db.otps.delete_one({"email": email_str})
    
    # Auto-login after verification
    user = db.users.find_one({"email": email_str})
    role = user.get("role", "student")
    name = user.get("name", "")
    picture = user.get("picture", "")
    
    access_token = create_access_token({"sub": email_str, "role": role, "name": name, "picture": picture})
    
    return {
        "message": "Email verified successfully",
        "access_token": access_token,
        "token_type": "bearer",
        "role": role
    }

@router.post("/login", response_model=Token)
async def unified_login(req: LoginRequest):
    db = get_db()
    email_str = str(req.email)
    user = db.users.find_one({"email": email_str})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("password_hash") or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_verified"):
        raise HTTPException(status_code=403, detail="Email not verified")

    token = create_access_token({"sub": user["email"], "role": user["role"], "name": user.get("name")})
    return {"access_token": token, "token_type": "bearer", "role": user["role"]}

@router.get("/google")
async def login_google(request: Request):
    redirect_uri = f"{request.base_url}auth/google/callback" 
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def auth_google_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=oauth_failed")
        
    userinfo = token.get('userinfo')
    if not userinfo:
        userinfo = await oauth.google.parse_id_token(request, token)
        
    email_str = str(userinfo.get("email"))
    name = userinfo.get("name")
    picture = userinfo.get("picture")
    google_id = userinfo.get("sub")
    
    db = get_db()
    
    existing_user = db.users.find_one({"email": email_str})
    if not existing_user:
        new_user = UserInDB(
            email=email_str,
            name=name,
            picture=picture,
            role="student",
            google_id=google_id,
            is_verified=True
        )
        user_dict = new_user.dict()
        user_dict["email"] = email_str
        db.users.insert_one(user_dict)
        role = "student"
    else:
        db.users.update_one({"email": email_str}, {"$set": {"google_id": google_id, "is_verified": True}})
        role = existing_user.get("role", "student")

    jwt_token = create_access_token({"sub": email_str, "role": role, "name": name, "picture": picture})
    
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback?token={jwt_token}")
