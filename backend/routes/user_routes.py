from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timezone
from backend.database import get_db
from backend.utils.jwt_utils import get_current_user, create_access_token

router = APIRouter()

class NameUpdateData(BaseModel):
    name: str

@router.patch("/me/name")
async def update_display_name(req: NameUpdateData, current_user: dict = Depends(get_current_user)):
    db = get_db()
    email_str = current_user.get("sub")
    if not email_str:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    db.users.update_one({"email": email_str}, {"$set": {"name": req.name}})
    
    # Issue a new JWT because the 'name' is baked into the JWT payload
    user = db.users.find_one({"email": email_str})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    role = user.get("role", "student")
    picture = user.get("picture", "")
    new_token = create_access_token({"sub": email_str, "role": role, "name": req.name, "picture": picture})
    
    return {"message": "Name updated successfully", "access_token": new_token}

# ✅ GET STUDENT ATTEMPTS
@router.get("/attempts")
async def get_student_attempts(current_user: dict = Depends(get_current_user)):
    db = get_db()
    email = current_user.get("sub")
    
    # 1. Fetch all completed participants records for this user
    attempts = list(db.participants.find({"email": email, "completed": True}).sort("end_time", -1))
    
    # 2. Enrich with quiz metadata
    enriched_attempts = []
    for att in attempts:
        quiz = db.quizzes.find_one({"_id": ObjectId(att["quiz_id"])})
        enriched_attempts.append({
            "quiz_id": att["quiz_id"],
            "title": quiz.get("title") if quiz else "Deleted Quiz",
            "category": quiz.get("category") if quiz else "N/A",
            "score": att.get("score", 0),
            "total_questions": att.get("total_questions", 0),
            "percentage": att.get("percentage", 0),
            "end_time": att.get("end_time"),
            "time_taken": att.get("time_taken_seconds", 0)
        })
    
    return enriched_attempts

# ✅ GET DETAILED REVIEW FOR AN ATTEMPT
@router.get("/attempts/{quiz_id}")
async def get_attempt_review(quiz_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    email = current_user.get("sub")

    # 1. Get the quiz to have the answer key
    quiz = db.quizzes.find_one({"_id": ObjectId(quiz_id)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz data not found")
    
    # 2. Get the student's response doc
    response_doc = db.quiz_responses.find_one({"email": email, "quiz_id": quiz_id})
    if not response_doc:
        raise HTTPException(status_code=404, detail="No response found for this quiz and user.")

    # 3. Pair them up
    # We want a list of: { question, your_answer, correct_answer, is_correct, options }
    questions = quiz.get("questions", [])
    student_answers = {a["question_index"]: a for a in response_doc.get("answers", [])}
    
    review_data = []
    for idx, q in enumerate(questions):
        student_ans = student_answers.get(idx, {})
        selected = student_ans.get("selected_option", "Not Answered")
        correct = q.get("correctAnswer") or q.get("correct_answer") # try both keys
        
        # If correct_answer is an index (legacy/int), map it to option text
        if isinstance(correct, int) and 0 <= correct < len(q.get("options", [])):
            correct = q["options"][correct]

        review_data.append({
            "question": q.get("question", ""),
            "options": q.get("options", []),
            "selected_option": selected,
            "correct_answer": correct,
            "is_correct": student_ans.get("is_correct", False),
            "explanation": q.get("explanation", "") # if available
        })

    return {
        "title": quiz.get("title"),
        "score": response_doc.get("score"), # Note: score usually in participants, but we can verify
        "review": review_data
    }
