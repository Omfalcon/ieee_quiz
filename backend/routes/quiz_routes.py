from fastapi import APIRouter, HTTPException
from bson import ObjectId
from backend.database import get_quiz_collection, get_submissions_collection, serialize_quiz
from datetime import datetime

router = APIRouter()

quiz_collection = None
submissions_collection = None


def init_collections():
    global quiz_collection, submissions_collection
    quiz_collection = get_quiz_collection()
    submissions_collection = get_submissions_collection()


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

    result = _quiz_col().insert_one(quiz)
    new_quiz = _quiz_col().find_one({"_id": result.inserted_id})
    return serialize_quiz(new_quiz)


# ✅ TOGGLE QUIZ STATUS — time-based logic with proper datetime parsing
@router.put("/quizzes/toggle/{quiz_id}")
def toggle_quiz(quiz_id: str):
    quiz = _quiz_col().find_one({"_id": ObjectId(quiz_id)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    current_status = quiz.get("is_active", False)
    new_status = not current_status

    update_data: dict = {"is_active": new_status}

    now = datetime.now()
    start = parse_dt(quiz.get("start_time"))
    end = parse_dt(quiz.get("end_time"))

    if new_status:
        # Turning ON
        # If still scheduled (start in future) → make live now
        if start and start > now:
            update_data["start_time"] = now.strftime("%Y-%m-%dT%H:%M")
        # If already finished (end in past) → extend end to end of today
        if end and end < now:
            eod = now.replace(hour=23, minute=59, second=0, microsecond=0)
            update_data["end_time"] = eod.strftime("%Y-%m-%dT%H:%M")
    else:
        # Turning OFF — if currently live, snap end_time to now
        if start and start <= now and end and end >= now:
            update_data["end_time"] = now.strftime("%Y-%m-%dT%H:%M")

    _quiz_col().update_one(
        {"_id": ObjectId(quiz_id)},
        {"$set": update_data}
    )

    updated = _quiz_col().find_one({"_id": ObjectId(quiz_id)})
    return serialize_quiz(updated)


# ✅ DELETE QUIZ
@router.delete("/quizzes/{quiz_id}")
def delete_quiz(quiz_id: str):
    try:
        result = _quiz_col().delete_one({"_id": ObjectId(quiz_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")

    return {"message": "Quiz deleted successfully"}


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
    for field in ("_id", "participants", "is_active"):
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
