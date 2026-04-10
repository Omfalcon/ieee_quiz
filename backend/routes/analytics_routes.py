from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from backend.database import (
    get_quiz_collection, get_participants_collection,
    get_quiz_responses_collection, serialize_quiz
)
from backend.utils.jwt_utils import get_current_user

router = APIRouter()


def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/live-quizzes")
def get_live_quizzes(admin_user: dict = Depends(require_admin)):
    """Returns all quizzes with status == 'live'."""
    col = get_quiz_collection()
    live = list(col.find({"status": "live"}))
    return [serialize_quiz(q) for q in live]


@router.get("/quiz-analytics/{quiz_id}")
def get_quiz_analytics(quiz_id: str, admin_user: dict = Depends(require_admin)):
    """
    Returns per-question accuracy stats from quiz_responses for a given quiz.
    Also returns total participants and completion count.
    """
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    quiz_col = get_quiz_collection()
    quiz = quiz_col.find_one({"_id": ObjectId(quiz_id)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = quiz.get("questions", [])
    total_questions = len(questions)

    responses_col = get_quiz_responses_collection()
    all_responses = list(responses_col.find({"quiz_id": quiz_id}))
    total_submissions = len(all_responses)

    # Build per-question accuracy
    question_stats = []
    for i, q in enumerate(questions):
        correct_count = 0
        answered_count = 0
        for resp in all_responses:
            for ans in resp.get("answers", []):
                if ans.get("question_index") == i:
                    answered_count += 1
                    if ans.get("is_correct"):
                        correct_count += 1
        accuracy = round((correct_count / answered_count * 100), 1) if answered_count > 0 else 0.0
        question_stats.append({
            "index": i,
            "question": q.get("question", f"Question {i+1}"),
            "answered": answered_count,
            "correct": correct_count,
            "accuracy": accuracy
        })

    participants_col = get_participants_collection()
    total_participants = participants_col.count_documents({"quiz_id": quiz_id})

    return {
        "quiz_id": quiz_id,
        "quiz_title": quiz.get("title", "Untitled"),
        "total_participants": total_participants,
        "total_submissions": total_submissions,
        "total_questions": total_questions,
        "question_stats": question_stats
    }
