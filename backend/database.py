from pymongo import MongoClient

MONGO_URL = "mongodb+srv://omagarwal16805:y!Niv-CSQG3XS45@cluster0.egux1um.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

client = None
db = None


def connect_db():
    global client, db
    client = MongoClient(MONGO_URL)
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
        "status": quiz.get("status", "scheduled")
    }

