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
