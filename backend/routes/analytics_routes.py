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
    Returns per-question accuracy + timing stats from quiz_responses.
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

    # Build per-question stats
    question_stats = []
    for i, q in enumerate(questions):
        correct_count = 0
        answered_count = 0
        times = []

        for resp in all_responses:
            for ans in resp.get("answers", []):
                if ans.get("question_index") == i:
                    answered_count += 1
                    if ans.get("is_correct"):
                        correct_count += 1
                    if ans.get("elapsed_seconds") is not None:
                        times.append(ans["elapsed_seconds"])

        accuracy = round((correct_count / answered_count * 100), 1) if answered_count > 0 else 0.0
        avg_time = round(sum(times) / len(times), 1) if times else 0
        min_time = min(times) if times else 0
        max_time = max(times) if times else 0

        # Resolve correct answer text for display
        correct_raw = q.get("correct_answer")
        opts = q.get("options", [])
        if isinstance(correct_raw, int) and 0 <= correct_raw < len(opts):
            correct_display = opts[correct_raw]
        elif isinstance(correct_raw, list):
            correct_display = [opts[i] for i in correct_raw if i < len(opts)]
        else:
            correct_display = str(correct_raw or "")

        question_stats.append({
            "index": i,
            "question": q.get("question", f"Question {i+1}"),
            "type": q.get("type", "mcq"),
            "options": opts,
            "correct_answer": correct_raw,
            "correct_display": correct_display,
            "answered": answered_count,
            "correct": correct_count,
            "accuracy": accuracy,
            "avg_time": avg_time,
            "min_time": min_time,
            "max_time": max_time,
        })

    participants_col = get_participants_collection()
    total_participants = participants_col.count_documents({"quiz_id": quiz_id})

    # Compute per-participant summary for the participants list
    participants_summary = []
    for resp in all_responses:
        answers = resp.get("answers", [])
        score = sum(1 for a in answers if a.get("is_correct"))
        participants_summary.append({
            "email": resp.get("email"),
            "score": score,
            "total": total_questions,
            "submitted_at": resp.get("submitted_at").isoformat() if resp.get("submitted_at") else None,
        })

    return {
        "quiz_id": quiz_id,
        "quiz_title": quiz.get("title", "Untitled"),
        "total_participants": total_participants,
        "total_submissions": total_submissions,
        "total_questions": total_questions,
        "question_stats": question_stats,
        "participants": participants_summary,
    }


@router.get("/user-attempt/{quiz_id}/{user_email:path}")
def get_user_attempt(quiz_id: str, user_email: str, admin_user: dict = Depends(require_admin)):
    """
    Returns the full per-question breakdown for a specific user's quiz attempt.
    Used for admin drilldown into participant responses.
    """
    if not ObjectId.is_valid(quiz_id):
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    quiz_col = get_quiz_collection()
    quiz = quiz_col.find_one({"_id": ObjectId(quiz_id)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    responses_col = get_quiz_responses_collection()
    resp = responses_col.find_one({"quiz_id": quiz_id, "email": user_email})
    if not resp:
        raise HTTPException(status_code=404, detail="No submission found for this user.")

    questions = quiz.get("questions", [])
    answers = resp.get("answers", [])

    result = []
    for ans in sorted(answers, key=lambda a: a.get("question_index", 0)):
        idx = ans.get("question_index", 0)
        q_data = questions[idx] if 0 <= idx < len(questions) else {}
        opts = q_data.get("options", [])

        correct_raw = q_data.get("correct_answer")
        if isinstance(correct_raw, int) and 0 <= correct_raw < len(opts):
            correct_display = opts[correct_raw]
        elif isinstance(correct_raw, list):
            correct_display = [opts[i] for i in correct_raw if i < len(opts)]
        else:
            correct_display = str(correct_raw or "")

        result.append({
            "question_index": idx,
            "question": q_data.get("question", f"Question {idx+1}"),
            "question_type": q_data.get("type", "mcq"),
            "options": opts,
            "correct_display": correct_display,
            "user_answer": ans.get("selected_option", ""),
            "is_correct": ans.get("is_correct", False),
            "elapsed_seconds": ans.get("elapsed_seconds", 0),
        })

    return {"answers": result, "total": len(result)}
