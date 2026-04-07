from fastapi import APIRouter, HTTPException

router = APIRouter()

# -------------------------------
# MOCK DATABASE
# -------------------------------
quizzes = [
    {
        "id": 1,
        "title": "BACKEND TEST QUIZ 🚀",
        "category": "Engineering",
        "status": "Live",
        "created_date": "2026-03-21",
        "participants": 200
    },
    {
        "id": 2,
        "title": "FROM BACKEND ✅",
        "category": "CS",
        "status": "Finished",
        "created_date": "2026-03-20",
        "participants": 150
    }
]

# -------------------------------
# GET ALL QUIZZES (IMPORTANT)
# -------------------------------
@router.get("/quizzes")
def get_quizzes():
    return quizzes


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

@router.post("/quizzes")
def add_quiz(quiz: dict):
    global quizzes

    new_id = max(q["id"] for q in quizzes) + 1 if quizzes else 1
    quiz["id"] = new_id

    quizzes.append(quiz)
    return quiz