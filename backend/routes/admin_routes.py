from fastapi import APIRouter, Depends, HTTPException
from backend.database import get_db, get_activity_logs_collection
from backend.utils.jwt_utils import get_current_user
from backend.utils.websocket_manager import manager

router = APIRouter()

def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ✅ ADMIN: LIST USERS
@router.get("/users")
async def get_all_users(admin_user: dict = Depends(require_admin)):
    db = get_db()
    users = list(db.users.find({"role": {"$ne": "admin"}}, {"password_hash": 0}))
    for u in users:
        u["_id"] = str(u["_id"])
    return users

# ✅ ADMIN: DELETE USER
@router.delete("/users/{email_str}")
async def delete_user(email_str: str, admin_user: dict = Depends(require_admin)):
    db = get_db()
    
    # 1. Delete the user record
    db.users.delete_one({"email": email_str})
    
    # 2. Delete all participant records (affects attempts/completion logic)
    db.participants.delete_many({"email": email_str})
    
    # 3. Delete all quiz responses (affects leaderboards)
    db.quiz_responses.delete_many({"email": email_str})
    
    # 4. Clean up any lingering OTPs
    db.otps.delete_many({"email": email_str})

    return {"message": f"User {email_str} and all associated data deleted successfully."}

# ✅ ADMIN: GET LIVE QUIZ WORK IN PROGRESS PARTICIPANTS
@router.get("/live-sessions/{quiz_id}/active-participants")
async def get_active_participants(quiz_id: str, admin_user: dict = Depends(require_admin)):
    db = get_db()
    # participants who are in the quiz but haven't submitted yet, and not kicked
    active_records = list(db.participants.find({"quiz_id": quiz_id, "completed": False, "kicked": {"$ne": True}}))
    
    results = []
    for record in active_records:
        email = record.get("email")
        # Fetch user's actual name to display
        user = db.users.find_one({"email": email})
        name = user.get("name") if user else "Unknown"
        results.append({
            "email": email,
            "name": name,
            "start_time": record.get("start_time")
        })
    return results

# ✅ ADMIN: KICK PARTICIPANT FROM QUIZ
@router.delete("/live-sessions/{quiz_id}/participants/{email_str}")
async def kick_participant(quiz_id: str, email_str: str, admin_user: dict = Depends(require_admin)):
    db = get_db()
    
    # Mark them as kicked so they cannot rejoin, and mark completed as false so they vanish from the leaderboard
    res = db.participants.update_one(
        {"quiz_id": quiz_id, "email": email_str},
        {"$set": {"kicked": True, "completed": False, "score": 0}}
    )
    
    # Also delete their actual quiz responses if they had submitted
    db.quiz_responses.delete_one({"quiz_id": quiz_id, "email": email_str})
    
    # Send WebSocket signal to immediately boot them off
    await manager.kick_user(quiz_id, email_str)
    
    # Notify admin dashboard to refresh list and leaderboard
    await manager.broadcast_admin({
        "action": "REFRESH_SESSION",
        "quiz_id": quiz_id
    })
    
    if res.matched_count > 0:
        return {"message": f"Kicked and permanently banned user {email_str} from quiz {quiz_id}"}
    raise HTTPException(status_code=404, detail="Participant not found")


# ✅ ADMIN: GET RECENT ACTIVITY LOGS
# Only quiz lifecycle events are surfaced; limit defaults to 5.
ACTIVITY_RELEVANT_TYPES = {"quiz_created", "quiz_toggled"}

@router.get("/activity")
async def get_activity(limit: int = 5, admin_user: dict = Depends(require_admin)):
    col = get_activity_logs_collection()
    logs = list(
        col.find({"type": {"$in": list(ACTIVITY_RELEVANT_TYPES)}})
           .sort("timestamp", -1)
           .limit(limit)
    )
    result = []
    for log in logs:
        result.append({
            "type": log.get("type"),
            "description": log.get("description"),
            "quiz_id": log.get("quiz_id"),
            "timestamp": log.get("timestamp").isoformat() if log.get("timestamp") else None
        })
    return result
