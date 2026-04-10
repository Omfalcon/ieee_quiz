from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional
from pydantic import BaseModel
from bson import ObjectId
from pymongo import UpdateOne
from backend.database import (
    get_quiz_collection, get_submissions_collection,
    get_participants_collection, get_quiz_responses_collection,
    serialize_quiz
)
from backend.utils.jwt_utils import get_current_user
from backend.utils.websocket_manager import manager
from datetime import datetime, timezone

async def notify_admins(quiz_id: str):
    await manager.broadcast_admin({
        "action": "REFRESH_SESSION",
        "quiz_id": quiz_id
    })

router = APIRouter()

quiz_collection = None
submissions_collection = None
participants_collection = None
responses_collection = None

def init_collections():
    global quiz_collection, submissions_collection, participants_collection, responses_collection
    quiz_collection = get_quiz_collection()
    submissions_collection = get_submissions_collection()
    participants_collection = get_participants_collection()
    responses_collection = get_quiz_responses_collection()


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


def _responses_col():
    global responses_collection
    if responses_collection is None:
        init_collections()
    return responses_collection


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
    # Validation logic
    questions = quiz.get("questions", [])
    if not questions or len(questions) < 1:
        raise HTTPException(status_code=400, detail="Quiz must have at least one question.")
    
    start_time_str = quiz.get("start_time")
    end_time_str = quiz.get("end_time")
    
    if not start_time_str or not end_time_str:
        raise HTTPException(status_code=400, detail="Start and End times are required.")
    
    start_dt = parse_dt(start_time_str)
    end_dt = parse_dt(end_time_str)
    
    if not start_dt or not end_dt:
        raise HTTPException(status_code=400, detail="Invalid date format for start or end time.")
    
    if end_dt <= start_dt:
        raise HTTPException(status_code=400, detail="End time must be after start time.")

    # Strip any stale _id so MongoDB always generates a new one
    quiz.pop("_id", None)
    quiz["questions"] = questions
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
def attempt_quiz(quiz_id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
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
        if participant.get("kicked"):
            raise HTTPException(status_code=403, detail="You have been banned from this quiz.")
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
    
    # Notify admin dashboard in background
    background_tasks.add_task(notify_admins, quiz_id)
    
    # Strip correct answers before sending
    safe_quiz = serialize_quiz(quiz)
    for q in safe_quiz.get("questions", []):
        q.pop("correctAnswer", None)  # Prevent cheating by removing answer keys

    return safe_quiz


# ✅ SUBMIT QUIZ
# Schema: quiz_responses has ONE document per (email, quiz_id).
# answers is an embedded array → clean, simple, leaderboard-ready.
# Unique index on (email, quiz_id) makes upsert idempotent (double-submit = no-op).

class AnswerPayload(BaseModel):
    question_index: int      # 0-based position in quiz.questions
    selected_option: str     # option text the student chose
    answered_at: str         # ISO-8601 timestamp from client
    elapsed_seconds: int     # seconds from quiz start to this selection

class SubmitPayload(BaseModel):
    answers: List[AnswerPayload]

@router.post("/quizzes/{quiz_id}/submit")
def submit_quiz(
    quiz_id: str,
    payload: SubmitPayload,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    email_str = current_user.get("sub")
    if not email_str:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Guard: must have started the quiz
    participant = _participants_col().find_one({"email": email_str, "quiz_id": quiz_id})
    if not participant:
        raise HTTPException(status_code=404, detail="No attempt record found. Call /attempt first.")
    if participant.get("kicked"):
        raise HTTPException(status_code=403, detail="You have been banned from this quiz.")
    if participant.get("completed"):
        raise HTTPException(status_code=403, detail="Quiz already submitted.")

    # Fetch quiz for correct-answer scoring
    quiz = _quiz_col().find_one({"_id": ObjectId(quiz_id)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    questions = quiz.get("questions", [])

    now_utc = datetime.now(timezone.utc)
    score = 0
    answers_arr = []

    for ans in payload.answers:
        idx = ans.question_index
        selected = ans.selected_option.strip()

        try:
            answered_at = datetime.fromisoformat(ans.answered_at.replace("Z", "+00:00"))
        except Exception:
            answered_at = now_utc

        if 0 <= idx < len(questions):
            correct = str(questions[idx].get("correctAnswer", "")).strip()
            is_correct = (selected == correct)
            q_text = questions[idx].get("question", "")
        else:
            is_correct = False
            q_text = ""

        if is_correct:
            score += 1

        answers_arr.append({
            "question_index": idx,
            "question_text": q_text,
            "selected_option": selected,
            "answered_at": answered_at,
            "elapsed_seconds": ans.elapsed_seconds,
            "is_correct": is_correct,
        })

    # ── Write ONE document into quiz_responses ──────────────────────────────
    # $setOnInsert fires only on first write → prevents overwrite on double-submit
    _responses_col().update_one(
        {"email": email_str, "quiz_id": quiz_id},
        {
            "$setOnInsert": {
                "email": email_str,
                "quiz_id": quiz_id,
                "submitted_at": now_utc,
                "answers": answers_arr,
            }
        },
        upsert=True
    )

    # ── Update participants row ─────────────────────────────────────────────
    total_questions = len(questions)
    answered_count = len(answers_arr)
    start_time = participant.get("start_time")
    if start_time and start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    time_taken = int((now_utc - start_time).total_seconds()) if start_time else 0

    _participants_col().update_one(
        {"email": email_str, "quiz_id": quiz_id},
        {"$set": {
            "completed": True,
            "end_time": now_utc,
            "score": score,
            "total_questions": total_questions,
            "answered_questions": answered_count,
            "time_taken_seconds": time_taken,
            "percentage": round((score / total_questions) * 100, 2) if total_questions else 0,
        }}
    )

    # Notify admin dashboard in background
    background_tasks.add_task(notify_admins, quiz_id)

    return {
        "message": "Quiz submitted successfully",
        "answered": answered_count,
        "total": total_questions,
        "score": score,
        "percentage": round((score / total_questions) * 100, 2) if total_questions else 0,
        "time_taken_seconds": time_taken,
    }



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
    # Validation logic
    questions = updated_data.get("questions")
    if questions is not None:
        if not questions or len(questions) < 1:
            raise HTTPException(status_code=400, detail="Quiz must have at least one question.")
    
    start_time_str = updated_data.get("start_time")
    end_time_str = updated_data.get("end_time")
    
    # If they are being updated, they must be valid
    if start_time_str or end_time_str:
        # If one is provided, we check against the provided or existing one
        # For simplicity in this logic, we assume the payload is complete for times if changed
        if not start_time_str or not end_time_str:
            raise HTTPException(status_code=400, detail="Both Start and End times are required when updating times.")
        
        start_dt = parse_dt(start_time_str)
        end_dt = parse_dt(end_time_str)
        
        if not start_dt or not end_dt:
            raise HTTPException(status_code=400, detail="Invalid date format for start or end time.")
        
        if end_dt <= start_dt:
            raise HTTPException(status_code=400, detail="End time must be after start time.")

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


# ✅ LEADERBOARD — ranked by score desc, time_taken_seconds asc
@router.get("/quizzes/{quiz_id}/leaderboard")
def get_leaderboard(quiz_id: str):
    try:
        # Fetch completed participants sorted exactly as rules demand
        records = list(
            _participants_col().find({"quiz_id": quiz_id, "completed": True})
            .sort([("score", -1), ("time_taken_seconds", 1)])
        )
        
        # We need names! We could do a manual merge here since list is likely small.
        # Alternatively we could use aggregation framework, but python merge is fine.
        from backend.database import get_db
        db = get_db()
        users_in_quiz = {u["email"]: u for u in db.users.find({"email": {"$in": [r["email"] for r in records]}})}
        
        leaderboard = []
        for i, s in enumerate(records):
            email = s.get("email")
            user_doc = users_in_quiz.get(email, {})
            leaderboard.append({
                "rank": i + 1,
                "name": user_doc.get("name") or "Anonymous",
                "email": email,
                "score": s.get("score", 0),
                "percentage": s.get("percentage", 0),
                "time_taken_seconds": s.get("time_taken_seconds", 0),
                "picture": user_doc.get("picture", "")
            })
            
        return {"leaderboard": leaderboard, "total": len(leaderboard)}
    except Exception as e:
        print(f"Error fetching leaderboard: {e}")
        return {"leaderboard": [], "total": 0}
