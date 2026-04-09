from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from backend.database import get_db
from backend.utils.jwt_utils import get_current_user, create_access_token

router = APIRouter()

class NameUpdateData(BaseModel):
    name: str

@router.patch("/me/name")
async def update_display_name(req: NameUpdateData, current_user: dict = Depends(get_current_user)):
    db = get_db()
    email_str = current_user.get("sub")
    if not email_str:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    db.users.update_one({"email": email_str}, {"$set": {"name": req.name}})
    
    # Issue a new JWT because the 'name' is baked into the JWT payload
    user = db.users.find_one({"email": email_str})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    role = user.get("role", "student")
    picture = user.get("picture", "")
    new_token = create_access_token({"sub": email_str, "role": role, "name": req.name, "picture": picture})
    
    return {"message": "Name updated successfully", "access_token": new_token}
