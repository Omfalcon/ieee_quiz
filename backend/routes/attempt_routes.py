from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from backend.database import get_quiz_collection, get_submissions_collection
from backend.utils.jwt_utils import decode_token

router = APIRouter()


# ─── Auth helper ─────────────────────────────────────────────────────────────

def _require_user(authorization: Optional[str]) -> dict:
    """Extract and validate the JWT bearer token.  Returns the decoded payload."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload


# ─── Pydantic models ──────────────────────────────────────────────────────────

class AttemptPayload(BaseModel):
    quiz_id: str
    answers: List[int]   # index per question; -1 = unanswered
    time_taken: int      # seconds elapsed


# ─── POST /quiz-start/{quiz_id} ───────────────────────────────────────────────
# Called the moment a student clicks "Start Quiz".
# Increments the quiz's participants counter ONCE per unique user.

@router.post("/quiz-start/{quiz_id}")
def start_quiz(
    quiz_id: str,
    authorization: Optional[str] = Header(None),
):
    user = _require_user(authorization)
    user_email: str = user.get("sub", "")

    quiz_col = get_quiz_collection()
    sub_col  = get_submissions_collection()

    try:
        quiz = quiz_col.find_one({"_id": ObjectId(quiz_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Derive status server-side to guard against manipulation
    now = datetime.now()
    start = quiz.get("start_time")
    end   = quiz.get("end_time")

    def _parse(val):
        if val is None:
            return None
        if isinstance(val, datetime):
            return val
        try:
            return datetime.fromisoformat(str(val).strip())
        except Exception:
            return None

    s, e = _parse(start), _parse(end)
    is_live = s and e and s <= now <= e

    if not is_live:
        raise HTTPException(status_code=403, detail="Quiz is not live right now")

    # Only count a participant once per user-quiz pair
    already_started = sub_col.find_one(
        {"quiz_id": quiz_id, "user_email": user_email}
    )
    if not already_started:
        quiz_col.update_one(
            {"_id": ObjectId(quiz_id)},
            {"$inc": {"participants": 1}},
        )

    return {"message": "Quiz started", "quiz_id": quiz_id}


# ─── POST /quiz-attempt ───────────────────────────────────────────────────────
# Accepts the student's final answers, scores them, persists the submission.

@router.post("/quiz-attempt")
def submit_attempt(
    req: AttemptPayload,
    authorization: Optional[str] = Header(None),
):
    user = _require_user(authorization)
    user_email: str = user.get("sub", "")
    user_name:  str = user.get("name", user_email)

    quiz_col = get_quiz_collection()
    sub_col  = get_submissions_collection()

    try:
        quiz = quiz_col.find_one({"_id": ObjectId(req.quiz_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions: list = quiz.get("questions", [])
    total = len(questions)

    # Score: +1 per correct answer, 0 for wrong / unanswered (-1)
    score = 0
    for i, q in enumerate(questions):
        if i < len(req.answers) and req.answers[i] == q.get("correct_answer"):
            score += 1

    percentage = round((score / total * 100) if total > 0 else 0.0, 1)

    submission = {
        "quiz_id":       req.quiz_id,
        "user_email":    user_email,
        "student_name":  user_name,
        "student_email": user_email,
        "score":         score,
        "total":         total,
        "percentage":    percentage,
        "time_taken":    req.time_taken,
        "answers":       req.answers,
        "submitted_at":  datetime.utcnow(),
    }

    # Upsert: keep the most recent submission for this user × quiz
    sub_col.update_one(
        {"quiz_id": req.quiz_id, "user_email": user_email},
        {"$set": submission},
        upsert=True,
    )

    return {
        "score":      score,
        "total":      total,
        "percentage": percentage,
        "time_taken": req.time_taken,
    }
