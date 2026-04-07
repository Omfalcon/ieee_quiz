from fastapi import APIRouter, HTTPException
from datetime import datetime

router = APIRouter()

# ✅ IN-MEMORY DATABASE (for now)
quizzes = [
    {
        "id": 1,
        "title": "Signal Processing",
        "category": "Engineering",
        "start_time": "2026-03-21T10:00",
        "end_time": "2026-03-21T12:00",
        "participants": 200
    },
    {
        "id": 2,
        "title": "Networking Basics",
        "category": "CS",
        "start_time": "2026-03-20T09:00",
        "end_time": "2026-03-20T10:00",
        "participants": 150
    }
]

# -------------------------------
# GET ALL QUIZZES
# -------------------------------
@router.get("/quizzes")
def get_quizzes():
    return quizzes


# -------------------------------
# ADD NEW QUIZ
# -------------------------------
@router.post("/quizzes")
def add_quiz(quiz: dict):
    try:
        new_quiz = {
            "id": len(quizzes) + 1,
            "title": quiz["title"],
            "category": quiz["category"],
            "start_time": quiz["start_time"],
            "end_time": quiz["end_time"],
            "participants": 0
        }

        quizzes.append(new_quiz)
        return new_quiz

    except KeyError:
        raise HTTPException(status_code=400, detail="Invalid quiz data")


# -------------------------------
# DELETE QUIZ
# -------------------------------
@router.delete("/quizzes/{quiz_id}")
def delete_quiz(quiz_id: int):
    global quizzes

    for quiz in quizzes:
        if quiz["id"] == quiz_id:
            quizzes.remove(quiz)
            return {"message": "Quiz deleted successfully"}

    raise HTTPException(status_code=404, detail="Quiz not found")