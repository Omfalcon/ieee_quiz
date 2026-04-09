import json
import re
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.config import settings

router = APIRouter()


class GenerateRequest(BaseModel):
    topic: str
    difficulty: str = "medium"   # easy | medium | hard
    count: int = 5               # 1–20


@router.post("/generate-questions")
async def generate_questions(req: GenerateRequest):
    """
    Call the Anthropic Claude API to generate structured MCQ questions.
    Requires API_KEY to be set in the environment / .env file.
    """
    if not settings.API_KEY:
        raise HTTPException(
            status_code=503,
            detail=(
                "AI service not configured. "
                "Add API_KEY=<your-key> to backend/.env and restart."
            ),
        )

    # Clamp count
    count = max(1, min(req.count, 20))
    topic = req.topic.strip()
    difficulty = req.difficulty.strip().lower()
    if difficulty not in ("easy", "medium", "hard"):
        difficulty = "medium"

    prompt = (
        f"Generate {count} multiple-choice quiz questions about \"{topic}\" "
        f"at {difficulty} difficulty level.\n\n"
        "Return ONLY a valid JSON array — no explanation, no markdown fences. "
        "Each element must follow this exact schema:\n"
        "[\n"
        "  {\n"
        "    \"question\": \"<question text>\",\n"
        "    \"options\": [\"<A>\", \"<B>\", \"<C>\", \"<D>\"],\n"
        "    \"correct_answer\": <0|1|2|3>\n"
        "  }\n"
        "]\n\n"
        "Rules:\n"
        "- Exactly 4 options per question.\n"
        "- correct_answer is the 0-based index of the correct option.\n"
        "- Questions must be clear, factually accurate, and educational.\n"
        "- Output the raw JSON array only — nothing else."
    )

    try:
        async with httpx.AsyncClient(timeout=40.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": settings.API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 4096,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504, detail="AI service timed out. Try again."
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"AI service unreachable: {exc}"
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Anthropic API error {response.status_code}: {response.text[:300]}",
        )

    raw_text = response.json()["content"][0]["text"]

    # Extract the JSON array — the model may prefix/suffix with text
    match = re.search(r"\[[\s\S]*\]", raw_text)
    if not match:
        raise HTTPException(
            status_code=500,
            detail="AI returned an unexpected format. Try again.",
        )

    try:
        questions_raw = json.loads(match.group())
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="AI returned malformed JSON. Try again.",
        )

    if not isinstance(questions_raw, list):
        raise HTTPException(status_code=500, detail="AI output is not a list.")

    # Validate and sanitise every question
    validated = []
    for item in questions_raw:
        if not isinstance(item, dict):
            continue

        question_text = str(item.get("question", "")).strip()
        options = item.get("options", [])
        correct = item.get("correct_answer", 0)

        if not question_text:
            continue
        if not isinstance(options, list) or len(options) != 4:
            continue
        if not isinstance(correct, int) or correct not in range(4):
            correct = 0

        validated.append(
            {
                "question": question_text,
                "options": [str(o).strip() for o in options],
                "correct_answer": correct,
            }
        )

    if not validated:
        raise HTTPException(
            status_code=500,
            detail=(
                "AI could not generate valid questions for that topic. "
                "Try a different topic or difficulty."
            ),
        )

    return {"questions": validated, "count": len(validated)}
