from fastapi import APIRouter, HTTPException
from bson import ObjectId
from backend.database import get_quiz_collection, serialize_quiz
from datetime import datetime

router = APIRouter()

quiz_collection = None


# ✅ INIT COLLECTION
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


# ✅ CREATE QUIZ (FIXED)
@router.post("/quizzes")
def create_quiz(quiz: dict):
    if quiz_collection is None:
        init_collection()

    # ✅ DEFAULT FIELDS
    quiz["questions"] = quiz.get("questions", [])
    quiz["participants"] = 0
    quiz["is_active"] = False

    # ✅ INSERT (CRITICAL FIX)
    result = quiz_collection.insert_one(quiz)

    new_quiz = quiz_collection.find_one({"_id": result.inserted_id})

    return serialize_quiz(new_quiz)


# ✅ TOGGLE QUIZ STATUS (CORRECT POSITION)
@router.put("/quizzes/toggle/{quiz_id}")
def toggle_quiz(quiz_id: str):
    if quiz_collection is None:
        init_collection()

    quiz = quiz_collection.find_one({"_id": ObjectId(quiz_id)})

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    current_status = quiz.get("is_active", False)
    new_status = not current_status

    update_data = {"is_active": new_status}

    now = datetime.now()

    start = quiz.get("start_time")
    end = quiz.get("end_time")

    # 🔥 TURN ON → FORCE LIVE
    if new_status:
        if end and end < now:
            update_data["end_time"] = now.replace(hour=23, minute=59)

        if start and start > now:
            update_data["start_time"] = now

    # 🔥 TURN OFF → FORCE FINISHED (IF LIVE)
    else:
        if start and start <= now and end and end >= now:
            update_data["end_time"] = now

    quiz_collection.update_one(
        {"_id": ObjectId(quiz_id)},
        {"$set": update_data}
    )

    return {"message": "Toggle updated"}


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


# ✅ GET SINGLE QUIZ
@router.get("/quizzes/{quiz_id}")
def get_quiz(quiz_id: str):
    if quiz_collection is None:
        init_collection()

    try:
        quiz = quiz_collection.find_one({"_id": ObjectId(quiz_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    return serialize_quiz(quiz)


# ✅ UPDATE QUIZ
@router.put("/quizzes/{quiz_id}")
def update_quiz(quiz_id: str, updated_data: dict):
    if quiz_collection is None:
        init_collection()

    try:
        result = quiz_collection.update_one(
            {"_id": ObjectId(quiz_id)},
            {"$set": updated_data}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")

    updated_quiz = quiz_collection.find_one({"_id": ObjectId(quiz_id)})
    return serialize_quiz(updated_quiz)