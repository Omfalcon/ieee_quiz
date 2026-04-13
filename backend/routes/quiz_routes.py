from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional
from pydantic import BaseModel
from bson import ObjectId
from pymongo import UpdateOne
from backend.database import (
    get_quiz_collection, get_submissions_collection,
    get_participants_collection, get_quiz_responses_collection,
    get_activity_logs_collection, serialize_quiz, calculate_quiz_status
)
from backend.utils.jwt_utils import get_current_user
from backend.utils.websocket_manager import manager
from datetime import datetime, timedelta, timezone

# IST offset — mirrors database.py so all naive datetime comparisons are consistent.
_IST = timezone(timedelta(hours=5, minutes=30))

async def notify_admins(quiz_id: str):
    """Legacy broadcast — kept for backward compatibility with LiveSessions page."""
    await manager.broadcast_admin({
        "action": "REFRESH_SESSION",
        "quiz_id": quiz_id
    })


async def notify_participant_joined(quiz_id: str, email: str):
    await manager.broadcast_admin({
        "action": "PARTICIPANT_JOINED",
        "quiz_id": quiz_id,
        "email": email
    })


async def notify_new_submission(quiz_id: str, email: str, score: int, points: int):
    payload = {
        "action": "NEW_SUBMISSION",
        "quiz_id": quiz_id,
        "email": email,
        "score": score,
        "points": points
    }
    await manager.broadcast_admin(payload)
    await manager.broadcast_leaderboard(quiz_id, payload)


async def notify_quiz_event(event: str, quiz_id: str, quiz_title: str):
    """Emits QUIZ_UPDATED/QUIZ_CREATED/QUIZ_DELETED to admin connections."""
    await manager.broadcast_admin({
        "action": event,          # e.g. "QUIZ_UPDATED", "QUIZ_CREATED", "QUIZ_DELETED"
        "quiz_id": quiz_id,
        "quiz_title": quiz_title
    })


async def log_activity(event_type: str, description: str, quiz_id: str = None):
    """Writes an activity log entry and broadcasts ACTIVITY_LOGGED."""
    col = get_activity_logs_collection()
    entry = {
        "type": event_type,
        "description": description,
        "quiz_id": quiz_id,
        "timestamp": datetime.utcnow()
    }
    col.insert_one(entry)
    # Keep last 100 entries
    total = col.count_documents({})
    if total > 100:
        oldest = list(col.find({}).sort("timestamp", 1).limit(total - 100))
        ids = [d["_id"] for d in oldest]
        col.delete_many({"_id": {"$in": ids}})

    await manager.broadcast_admin({
        "action": "ACTIVITY_LOGGED",
        "entry": {
            "type": event_type,
            "description": description,
            "quiz_id": quiz_id,
            "timestamp": entry["timestamp"].isoformat()
        }
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


def auto_advance_status(quiz: dict) -> dict:
    """
    Called on every GET so quiz status is always consistent without admin action.

    - scheduled → live:  writes session_start + is_active=True to DB.
    - live/scheduled → finished: writes is_active=False, accumulates
      total_active_minutes from session_start (handles server-restart edge case).

    Returns the (possibly updated) quiz dict so the caller can serialise it
    immediately without a second DB round-trip.
    """
    stored  = quiz.get("status", "scheduled")
    dynamic = calculate_quiz_status(quiz)

    if dynamic == stored:
        return quiz          # nothing to do — fast path

    now    = datetime.now(timezone.utc)
    update: dict = {"status": dynamic}

    if stored == "scheduled" and dynamic == "live":
        # Auto-promotion: record session start for duration accumulation
        update["is_active"]     = True
        update["session_start"] = now.isoformat()

    elif dynamic == "finished":
        update["is_active"] = False
        update["session_start"] = None
        if stored == "live":
            # Auto-expiry while server was alive (no explicit toggle-off).
            # Accumulate whatever active time accrued in this session.
            session_start = parse_dt(quiz.get("session_start"))
            if session_start and session_start.tzinfo is None:
                session_start = session_start.replace(tzinfo=timezone.utc)
            if session_start:
                session_mins = max(0, round((now - session_start).total_seconds() / 60))
                update["total_active_minutes"] = (
                    (quiz.get("total_active_minutes") or 0) + session_mins
                )

    _quiz_col().update_one({"_id": quiz["_id"]}, {"$set": update})
    return {**quiz, **update}


# ✅ GET ALL QUIZZES
@router.get("/quizzes")
def get_quizzes():
    quizzes = list(_quiz_col().find())
    quizzes = [auto_advance_status(q) for q in quizzes]
    return [serialize_quiz(q) for q in quizzes]


# ✅ CREATE QUIZ
@router.post("/quizzes")
def create_quiz(quiz: dict, background_tasks: BackgroundTasks):
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

    # Store intended duration so toggle logic and scoring don't have to
    # recompute from start/end times (which change after each toggle).
    duration_mins = max(1, round((end_dt - start_dt).total_seconds() / 60))
    quiz["duration"] = duration_mins
    quiz.setdefault("total_active_minutes", 0)

    result = _quiz_col().insert_one(quiz)
    new_quiz = _quiz_col().find_one({"_id": result.inserted_id})
    serialized = serialize_quiz(new_quiz)

    title = serialized.get("title", "Untitled")
    quiz_id = serialized.get("_id", "")
    background_tasks.add_task(notify_quiz_event, "QUIZ_CREATED", quiz_id, title)
    background_tasks.add_task(log_activity, "quiz_created", f"Quiz created: {title}", quiz_id)

    return serialized


# ✅ TOGGLE QUIZ STATUS
#   ON  (scheduled / finished → live)  : force live, extend end_time if expired
#   OFF (live → finished)              : end immediately
@router.put("/quizzes/toggle/{quiz_id}")
def toggle_quiz(quiz_id: str, background_tasks: BackgroundTasks):
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    quiz = _quiz_col().find_one({"_id": ObjectId(quiz_id)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    current_status = calculate_quiz_status(quiz)
    title = quiz.get("title", "Untitled")
    now = datetime.now(timezone.utc)

    if current_status == "live":
        # ── OFF: end the quiz, accumulate active session duration ──────────
        session_start = parse_dt(quiz.get("session_start"))
        if session_start and session_start.tzinfo is None:
            session_start = session_start.replace(tzinfo=timezone.utc)
        session_mins = (
            max(0, round((now - session_start).total_seconds() / 60))
            if session_start else 0
        )
        new_total = (quiz.get("total_active_minutes") or 0) + session_mins

        db_update = {
            "status": "finished",
            "is_active": False,
            # lock end_time to now so time-based logic also sees finished
            "end_time": now.isoformat(),
            "total_active_minutes": new_total,
            "session_start": None,
        }
        new_status = "finished"
    else:
        # ── ON: force the quiz live, default end = end of current IST day ─
        # Using IST (UTC+05:30) so "end of day" matches the admin's local clock.
        now_ist = now.astimezone(_IST)
        end_of_day = now_ist.replace(hour=23, minute=59, second=59, microsecond=0)

        db_update = {
            "status": "live",
            "is_active": True,
            "end_time": end_of_day.isoformat(),   # stored with +05:30 offset
            # record session start for duration accumulation when toggled OFF
            "session_start": now.isoformat(),      # UTC — used only for math
        }
        new_status = "live"

    result = _quiz_col().update_one(
        {"_id": ObjectId(quiz_id)},
        {"$set": db_update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")

    updated = _quiz_col().find_one({"_id": ObjectId(quiz_id)})
    background_tasks.add_task(notify_quiz_event, "QUIZ_UPDATED", quiz_id, title)
    background_tasks.add_task(log_activity, "quiz_toggled", f"Quiz \"{title}\" set to {new_status}", quiz_id)

    return serialize_quiz(updated)


# ✅ DELETE QUIZ
@router.delete("/quizzes/{quiz_id}")
def delete_quiz(quiz_id: str, background_tasks: BackgroundTasks):
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    quiz = _quiz_col().find_one({"_id": ObjectId(quiz_id)})
    title = quiz.get("title", "Untitled") if quiz else "Untitled"

    result = _quiz_col().delete_one({"_id": ObjectId(quiz_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")

    background_tasks.add_task(notify_quiz_event, "QUIZ_DELETED", quiz_id, title)
    background_tasks.add_task(log_activity, "quiz_deleted", f"Quiz deleted: {title}", quiz_id)

    return {"message": "Quiz deleted successfully"}


# ✅ ATTEMPT QUIZ (STUDENT ENTRY POINT)
@router.post("/quizzes/{quiz_id}/attempt")
def attempt_quiz(quiz_id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    quiz = _quiz_col().find_one({"_id": ObjectId(quiz_id)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    dynamic_status = calculate_quiz_status(quiz)
    if dynamic_status != "live":
        raise HTTPException(status_code=403, detail=f"Quiz is currently {dynamic_status} and cannot be attempted.")

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
    if not participant:  # only fire for genuinely new participants
        background_tasks.add_task(notify_participant_joined, quiz_id, email_str)

    # Strip questions before sending to prevent mass-scraping via Network tab
    session_data = serialize_quiz(quiz)
    session_data.pop("questions", None)
    
    # Include total questions count for frontend progress bar
    session_data["total_questions"] = len(quiz.get("questions", []))

    return session_data

# ✅ GET SINGLE QUESTION (ONE-BY-ONE FETCH)
@router.get("/quizzes/{quiz_id}/questions/{index}")
def get_quiz_question(quiz_id: str, index: int, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    # 1. Check if participant exists and is allowed to take this quiz
    email = current_user.get("sub")
    participant = _participants_col().find_one({"email": email, "quiz_id": quiz_id})
    if not participant:
        raise HTTPException(status_code=403, detail="You must start the quiz first.")
    
    if participant.get("kicked") or participant.get("completed"):
        raise HTTPException(status_code=403, detail="Access denied.")

    # 2. Fetch the quiz and get the specific question
    quiz = _quiz_col().find_one({"_id": ObjectId(quiz_id)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    questions = quiz.get("questions", [])
    if index < 0 or index >= len(questions):
        raise HTTPException(status_code=404, detail="Question index out of bounds")
    
    q = questions[index]
    
    # 3. Strip correct answer securely — keep type so the frontend can render
    #    MSQ checkboxes, True/False buttons, and short-answer text inputs correctly.
    safe_q = {
        "question": q.get("question"),
        "options":  q.get("options"),
        "type":     q.get("type", "mcq"),
        "index":    index,
    }
    
    return safe_q


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
            q_data = questions[idx]
            q_text = q_data.get("question", "")
            q_type = q_data.get("type", "mcq")
            correct_raw = q_data.get("correctAnswer") or q_data.get("correct_answer")
            opts = q_data.get("options", [])

            if q_type == "short":
                # Case-insensitive trimmed comparison
                correct_str = str(correct_raw or "").strip().lower()
                is_correct = (selected.strip().lower() == correct_str)

            elif q_type == "msq":
                # correct_answer is a list of indices; selected is JSON-encoded list of option texts
                import json as _json
                try:
                    selected_list = sorted(_json.loads(selected)) if selected.startswith("[") else [selected]
                except Exception:
                    selected_list = [selected]
                if isinstance(correct_raw, list):
                    correct_texts = sorted([
                        opts[i] for i in correct_raw
                        if isinstance(i, int) and 0 <= i < len(opts)
                    ])
                else:
                    correct_texts = []
                is_correct = (selected_list == correct_texts)

            else:
                # MCQ / True-False — map index → text then compare
                correct = correct_raw
                if isinstance(correct, int) and 0 <= correct < len(opts):
                    correct = opts[correct]
                correct = str(correct or "").strip()
                is_correct = (selected == correct)
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
    start_time = participant.get("start_time")
    if start_time and start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    
    time_taken = int((now_utc - start_time).total_seconds()) if start_time else 0
    
    # Calculate competitive points
    # Formula: (Correct Questions * 1000) + (Remaining Duration in Seconds)
    try:
        duration_val = quiz.get("duration", "30")
        # Handle cases like "30m", "30", or int 30
        if isinstance(duration_val, str):
            duration_str = duration_val.lower().replace("m", "").strip()
            duration_mins = int(duration_str)
        else:
            duration_mins = int(duration_val)
    except:
        duration_mins = 30
        
    allowed_secs = duration_mins * 60
    time_bonus = max(0, allowed_secs - time_taken)
    points = (score * 1000) + time_bonus

    _participants_col().update_one(
        {"email": email_str, "quiz_id": quiz_id},
        {"$set": {
            "completed": True,
            "end_time": now_utc,
            "score": score,
            "points": points,
            "total_questions": total_questions,
            "percentage": round((score / total_questions) * 100, 2) if total_questions > 0 else 0,
            "time_taken_seconds": time_taken
        }}
    )

    # Notify admin dashboard + leaderboard viewers in background
    background_tasks.add_task(notify_admins, quiz_id)
    background_tasks.add_task(notify_new_submission, quiz_id, email_str, score, points)

    return {
        "message": "Quiz submitted successfully",
        "answered": len(answers_arr),
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

    quiz = auto_advance_status(quiz)
    return serialize_quiz(quiz)


# ✅ UPDATE QUIZ — strips _id and protected fields before update
@router.put("/quizzes/{quiz_id}")
def update_quiz(quiz_id: str, updated_data: dict, background_tasks: BackgroundTasks):
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
    serialized = serialize_quiz(updated_quiz)
    title = serialized.get("title", "Untitled")
    background_tasks.add_task(notify_quiz_event, "QUIZ_UPDATED", quiz_id, title)
    background_tasks.add_task(log_activity, "quiz_edited", f"Quiz updated: {title}", quiz_id)
    return serialized


# ✅ LEADERBOARD — ranked by score desc, time_taken_seconds asc
@router.get("/quizzes/{quiz_id}/leaderboard")
def get_leaderboard(quiz_id: str):
    try:
        # Sort by points (Corrects * 1000 + Time Bonus)
        records = list(
            _participants_col().find({"quiz_id": quiz_id, "completed": True})
            .sort("points", -1)
        )
        
        # We need names! We could do a manual merge here since list is likely small.
        # Alternatively we could use aggregation framework, but python merge is fine.
        from backend.database import get_db
        db = get_db()
        users_in_quiz = {u["email"]: u for u in db.users.find({"email": {"$in": [r["email"] for r in records]}})}
        
        from datetime import datetime, timezone
        leaderboard = []
        for i, s in enumerate(records):
            email = s.get("email")
            user_doc = users_in_quiz.get(email, {})
            
            # Dynamic points calculation for legacy records
            pts = s.get("points")
            if pts is None or pts == 0:
                score_val = s.get("score", 0)
                time_val = s.get("time_taken_seconds", 0)
                # We need the quiz duration to calculate time bonus
                quiz = db.quizzes.find_one({"_id": ObjectId(quiz_id)})
                try:
                    dur = int(str(quiz.get("duration", "30")).lower().replace("m", "").strip())
                except:
                    dur = 30
                pts = (score_val * 1000) + max(0, (dur * 60) - time_val)

            leaderboard.append({
                "rank": i + 1,
                "name": user_doc.get("name") or "Anonymous",
                "email": email,
                "score": s.get("score", 0),
                "points": pts,
                "percentage": s.get("percentage", 0),
                "time_taken_seconds": s.get("time_taken_seconds", 0),
                "picture": user_doc.get("picture", "")
            })
            
        # Final sort by points descending (ensures legacy records are correctly ranked)
        leaderboard.sort(key=lambda x: x["points"], reverse=True)
        
        # Re-assign ranks based on sorted order
        for i, row in enumerate(leaderboard):
            row["rank"] = i + 1

        return {
            "total": len(records),
            "leaderboard": leaderboard
        }
    except Exception as e:
        print(f"Error fetching leaderboard: {e}")
        return {"leaderboard": [], "total": 0}


@router.get("/quizzes/{quiz_id}/review")
def get_attempt_review(quiz_id: str, current_user: dict = Depends(get_current_user)):
    email = current_user.get("sub")
    
    # 1. Fetch participant submission
    resp = _responses_col().find_one({"email": email, "quiz_id": quiz_id})
    if not resp:
        raise HTTPException(status_code=404, detail="No submission found.")
    
    # 2. Fetch quiz to check end_time
    quiz = _quiz_col().find_one({"_id": ObjectId(quiz_id)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    
    end_time = parse_dt(quiz.get("end_time"))
    now = datetime.now(timezone.utc)
    
    # 3. Security Lockdown: If contest hasn't ended, hide correct answers
    contest_over = (end_time and now >= end_time)
    
    review_data = {
        "quiz_title": quiz.get("title"),
        "submitted_at": resp.get("submitted_at"),
        "contest_over": contest_over,
        "answers": []
    }
    
    responses = resp.get("answers", [])
    questions = quiz.get("questions", [])
    
    for r in responses:
        idx = r.get("question_index")
        q_text = "Question " + str(idx+1)
        correct_ans = "Hidden until contest ends"
        is_correct = None
        
        if 0 <= idx < len(questions):
            q_data = questions[idx]
            q_text = q_data.get("question")
            
            if contest_over:
                correct_ans = q_data.get("correctAnswer") or q_data.get("correct_answer")
                # Map index to text
                if isinstance(correct_ans, int) and 0 <= correct_ans < len(q_data.get("options", [])):
                    correct_ans = q_data["options"][correct_ans]
                is_correct = r.get("is_correct")
        
        review_data["answers"].append({
            "question": q_text,
            "selected": r.get("selected_option"),
            "correct": correct_ans,
            "is_correct": is_correct
        })
        
    return review_data
