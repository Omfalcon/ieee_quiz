from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
from backend.config import settings

# India Standard Time — all admin UI inputs are IST (browser datetime-local).
# Treating naive stored datetimes as UTC creates a +5:30 error in status checks.
_IST = timezone(timedelta(hours=5, minutes=30))

client = None
db = None


def connect_db():
    global client, db
    client = MongoClient(settings.MONGO_URI)
    db = client["ieee_quiz"]


def close_db():
    global client
    if client:
        client.close()


def get_db():
    return db


# ✅ COLLECTION ACCESS
def get_quiz_collection():
    return db["quizzes"]


def get_submissions_collection():
    return db["submissions"]


def get_participants_collection():
    return db["participants"]


def get_quiz_responses_collection():
    return db["quiz_responses"]


def get_activity_logs_collection():
    return db["activity_logs"]


def create_indexes():
    """
    Called once at startup. Enforces uniqueness and speeds up leaderboard queries.
    
    participants  : unique (email, quiz_id)         → prevents double-attempt race condition
    quiz_responses: unique (email, quiz_id, q_idx)  → upsert is idempotent even at 1 answer/sec
                    index  (quiz_id, score desc)    → fast leaderboard aggregation
    """
    participants = db["participants"]
    participants.create_index(
        [("email", 1), ("quiz_id", 1)],
        unique=True,
        name="unique_participant"
    )

    responses = db["quiz_responses"]
    responses.create_index(
        [("email", 1), ("quiz_id", 1)],
        unique=True,
        name="unique_response_per_participant"    # one doc per student per quiz
    )
    responses.create_index(
        [("quiz_id", 1), ("submitted_at", 1)],
        name="quiz_leaderboard"
    )

    activity_logs = db["activity_logs"]
    activity_logs.create_index(
        [("timestamp", -1)],
        name="activity_timestamp_desc"
    )


def calculate_quiz_status(quiz: dict) -> str:
    """
    Derive quiz status with the following priority rules:

    1. stored == "finished"  → always "finished" (hard admin override, never auto-reverts).
    2. stored == "live"      → "live" while end_time is in the future; auto-expires to
                               "finished" once end_time passes. start_time is ignored
                               because admin explicitly forced it live.
    3. stored == "scheduled" → auto-promote based on the time window:
                                 now < start_time            → "scheduled"
                                 start_time <= now <= end_time → "live"
                                 now > end_time              → "finished"
    4. No valid times        → fall back to stored value.
    """
    stored = quiz.get("status", "scheduled")

    # Rule 1: finished is a hard admin override.
    if stored == "finished":
        return "finished"

    def _parse(val):
        if isinstance(val, datetime):
            return val
        try:
            return datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        except Exception:
            return None

    def _tz(dt):
        # Admin UI sends datetime-local values (no offset) which are IST.
        # Adding UTC here would produce a 5.5-hour error in status checks.
        return dt.replace(tzinfo=_IST) if dt and dt.tzinfo is None else dt

    end_dt = _tz(_parse(quiz.get("end_time")))
    now    = datetime.now(timezone.utc)

    # Rule 2: admin forced live — only end_time matters.
    if stored == "live":
        if end_dt is None:
            return "live"
        return "live" if now <= end_dt else "finished"

    # Rule 3: scheduled — full time-window logic.
    start_dt = _tz(_parse(quiz.get("start_time")))

    if start_dt is None or end_dt is None:
        return stored  # can't calculate without both times

    if now < start_dt:
        return "scheduled"
    if now <= end_dt:
        return "live"
    return "finished"


# ✅ SERIALIZER
def serialize_quiz(quiz) -> dict:
    return {
        "_id": str(quiz["_id"]),
        "title": quiz.get("title"),
        "category": quiz.get("category"),
        "description": quiz.get("description"),
        "start_time": quiz.get("start_time"),
        "end_time": quiz.get("end_time"),
        "participants": quiz.get("participants", 0),
        "questions": quiz.get("questions", []),
        "is_active": quiz.get("is_active", False),
        "status": calculate_quiz_status(quiz),
        # Duration fields — stored on create/toggle; used for display and scoring
        "duration": quiz.get("duration"),                           # intended mins (original schedule)
        "total_active_minutes": quiz.get("total_active_minutes", 0),  # accumulated live time
    }

