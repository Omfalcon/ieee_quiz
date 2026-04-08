from pymongo import MongoClient

MONGO_URL = "mongodb://localhost:27017/"

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


# ✅ SERIALIZER
def serialize_quiz(quiz) -> dict:
    return {
        "_id": str(quiz["_id"]),
        "title": quiz.get("title"),
        "description": quiz.get("description"),
        "start_time": quiz.get("start_time"),
        "end_time": quiz.get("end_time"),
    }