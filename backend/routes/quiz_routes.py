from fastapi import APIRouter, HTTPException
from bson import ObjectId
from backend.database import get_quiz_collection, serialize_quiz

router = APIRouter()

quiz_collection = None


# ✅ INIT COLLECTION AFTER DB CONNECTS
def init_collection():
    global quiz_collection
    quiz_collection = get_quiz_collection()


# ✅ GET ALL QUIZZES
@router.get("/quizzes")
def get_quizzes():
    if quiz_collection is None:
        init_collection()

    quizzes = []
    for quiz in quiz_collection.find():
        quizzes.append(serialize_quiz(quiz))

    return quizzes


# ✅ CREATE QUIZ
@router.post("/quizzes")
def create_quiz(quiz: dict):
    if quiz_collection is None:
        init_collection()

    result = quiz_collection.insert_one(quiz)
    new_quiz = quiz_collection.find_one({"_id": result.inserted_id})

    return serialize_quiz(new_quiz)


# ✅ DELETE QUIZ
@router.delete("/quizzes/{quiz_id}")
def delete_quiz(quiz_id: str):
    if quiz_collection is None:
        init_collection()

    try:
        result = quiz_collection.delete_one({"_id": ObjectId(quiz_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")

    return {"message": "Quiz deleted successfully"}