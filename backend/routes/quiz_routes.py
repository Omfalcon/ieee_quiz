from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from backend.database import get_quiz_collection, get_submissions_collection, get_participants_collection, serialize_quiz
from backend.utils.jwt_utils import get_current_user
from datetime import datetime

router = APIRouter()

quiz_collection = None
submissions_collection = None
participants_collection = None

def init_collections():
    global quiz_collection, submissions_collection, participants_collection
    quiz_collection = get_quiz_collection()
    submissions_collection = get_submissions_collection()
    participants_collection = get_participants_collection()


def _quiz_col():
    global quiz_collection
    if quiz_collection is None:
        init_collections()
    return quiz_collection


def _sub_col():
    global submissions_collection
    if submissions_collection is None:
        init_collections()
    return submissions_collection


def _participants_col():
    global participants_collection
    if participants_collection is None:
        init_collections()
    return participants_collection


def parse_dt(val) -> datetime | None:
    """Safely parse a datetime-local string or datetime object."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    try:
        return datetime.fromisoformat(str(val).strip())
    except Exception:
        return None


# ✅ GET ALL QUIZZES
@router.get("/quizzes")
def get_quizzes():
    return [serialize_quiz(q) for q in _quiz_col().find()]


# ✅ CREATE QUIZ
@router.post("/quizzes")
def create_quiz(quiz: dict):
    # Strip any stale _id so MongoDB always generates a new one
    quiz.pop("_id", None)
    quiz["questions"] = quiz.get("questions", [])
    quiz["participants"] = 0
    quiz["is_active"] = False
    quiz["status"] = "scheduled"   # always start as scheduled

    result = _quiz_col().insert_one(quiz)
    new_quiz = _quiz_col().find_one({"_id": result.inserted_id})
    return serialize_quiz(new_quiz)


# ✅ TOGGLE QUIZ STATUS — cycles through scheduled → live → finished
@router.put("/quizzes/toggle/{quiz_id}")
def toggle_quiz(quiz_id: str):
    quiz = _quiz_col().find_one({"_id": ObjectId(quiz_id)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    current_status = quiz.get("status", "scheduled")

    # Toggle: scheduled/finished → live, live → finished
    if current_status == "live":
        new_status = "finished"
        new_is_active = False
    else:
        new_status = "live"
        new_is_active = True

    _quiz_col().update_one(
        {"_id": ObjectId(quiz_id)},
        {"$set": {"status": new_status, "is_active": new_is_active}}
    )

    updated = _quiz_col().find_one({"_id": ObjectId(quiz_id)})
    return serialize_quiz(updated)


# ✅ DELETE QUIZ
@router.delete("/quizzes/{quiz_id}")
def delete_quiz(quiz_id: str):
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid quiz ID")
    
    result = _quiz_col().delete_one({"_id": ObjectId(quiz_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    return {"message": "Quiz deleted successfully"}


# ✅ ATTEMPT QUIZ (STUDENT ENTRY POINT)
@router.post("/quizzes/{quiz_id}/attempt")
def attempt_quiz(quiz_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    quiz = _quiz_col().find_one({"_id": ObjectId(quiz_id)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if quiz.get("status") != "live":
        raise HTTPException(status_code=403, detail=f"Quiz is currently {quiz.get('status')} and cannot be attempted.")

    email_str = current_user.get("sub")
    if not email_str:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Check if participant record exists, if not create one
    participant = _participants_col().find_one({"email": email_str, "quiz_id": quiz_id})
    if participant:
        if participant.get("completed"):
            raise HTTPException(status_code=403, detail="You have already completed this quiz.")
    else:
        _participants_col().insert_one({
            "email": email_str,
            "quiz_id": quiz_id,
            "start_time": datetime.utcnow(),
            "completed": False
        })
        # Increment participant count on quiz
        _quiz_col().update_one({"_id": ObjectId(quiz_id)}, {"$inc": {"participants": 1}})
    
    # Strip correct answers before sending
    safe_quiz = serialize_quiz(quiz)
    for q in safe_quiz.get("questions", []):
        q.pop("correctAnswer", None)  # Prevent cheating by removing answer keys

    return safe_quiz


# ✅ SUBMIT QUIZ
@router.post("/quizzes/{quiz_id}/submit")
def submit_quiz(quiz_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    email_str = current_user.get("sub")
    if not email_str:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    result = _participants_col().update_one(
        {"email": email_str, "quiz_id": quiz_id},
        {"$set": {"completed": True, "end_time": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Participant record not found")

    return {"message": "Quiz submitted successfully"}



# ✅ GET SINGLE QUIZ
@router.get("/quizzes/{quiz_id}")
def get_quiz(quiz_id: str):
    try:
        quiz = _quiz_col().find_one({"_id": ObjectId(quiz_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    return serialize_quiz(quiz)


# ✅ UPDATE QUIZ — strips _id and protected fields before update
@router.put("/quizzes/{quiz_id}")
def update_quiz(quiz_id: str, updated_data: dict):
    # Remove fields that must not be overwritten
    for field in ("_id", "participants", "is_active", "status"):
        updated_data.pop(field, None)

    try:
        result = _quiz_col().update_one(
            {"_id": ObjectId(quiz_id)},
            {"$set": updated_data}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")

    updated_quiz = _quiz_col().find_one({"_id": ObjectId(quiz_id)})
    return serialize_quiz(updated_quiz)


# ✅ LEADERBOARD — ranked by score desc, time_taken asc
@router.get("/quizzes/{quiz_id}/leaderboard")
def get_leaderboard(quiz_id: str):
    try:
        subs = list(
            _sub_col().find({"quiz_id": quiz_id}).sort([("score", -1), ("time_taken", 1)])
        )
        leaderboard = [
            {
                "rank": i + 1,
                "name": s.get("student_name", "Anonymous"),
                "email": s.get("student_email", ""),
                "score": s.get("score", 0),
                "time_taken": s.get("time_taken", None),
            }
            for i, s in enumerate(subs)
        ]
        return {"leaderboard": leaderboard, "total": len(leaderboard)}
    except Exception:
        return {"leaderboard": [], "total": 0}
