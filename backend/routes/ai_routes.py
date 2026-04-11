import json
import re
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.config import settings

router = APIRouter()


def build_llm_request(prompt: str):
    provider = settings.LLM_PROVIDER.lower()

    if provider == "openrouter":
        return {
            "url": settings.LLM_BASE_URL,
            "headers": {
                "Authorization": f"Bearer {settings.API_KEY}",
                "Content-Type": "application/json",
            },
            "params": None,
            "payload": {
                "model": settings.LLM_MODEL,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
            },
            "parser": "openrouter"
        }

    elif provider == "gemini":
        return {
            "url": f"{settings.LLM_BASE_URL}/{settings.LLM_MODEL}:generateContent",
            "headers": {},
            "params": {"key": settings.API_KEY},
            "payload": {
                "contents": [
                    {"parts": [{"text": prompt}]}
                ]
            },
            "parser": "gemini"
        }

    else:
        raise HTTPException(status_code=500, detail="Unsupported LLM provider")


class GenerateRequest(BaseModel):
    topic: str
    difficulty: str = "medium"
    count: int = 5


@router.post("/generate-questions")
async def generate_questions(req: GenerateRequest):

    if not settings.API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Add API_KEY to backend/.env",
        )

    count = max(1, min(req.count, 20))
    topic = req.topic.strip()
    difficulty = req.difficulty.strip().lower()
    if difficulty not in ("easy", "medium", "hard"):
        difficulty = "medium"

    prompt = (
        f"Generate {count} multiple-choice quiz questions about \"{topic}\" "
        f"at {difficulty} difficulty level.\n\n"
        "Return ONLY a valid JSON array.\n"
        "[{ \"question\":\"...\", \"options\":[\"A\",\"B\",\"C\",\"D\"], \"correct_answer\":0 }]"
    )

    req_data = build_llm_request(prompt)

    try:
        async with httpx.AsyncClient(timeout=40.0) as client:
            response = await client.post(
                req_data["url"],
                headers=req_data["headers"],
                params=req_data["params"],
                json=req_data["payload"],
            )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI unreachable: {exc}")

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"AI error {response.status_code}: {response.text}",
        )

    data = response.json()

    # ✅ FIXED: provider-based parsing
    if req_data["parser"] == "openrouter":
        raw_text = data["choices"][0]["message"]["content"]

    elif req_data["parser"] == "gemini":
        if "candidates" not in data:
            raise HTTPException(status_code=500, detail=f"Bad AI response: {data}")
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]

    else:
        raise HTTPException(status_code=500, detail="Unknown parser")

    match = re.search(r"\[[\s\S]*\]", raw_text)
    if not match:
        raise HTTPException(status_code=500, detail="AI did not return a valid JSON array")

    try:
        questions_raw = json.loads(match.group())
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI response parsing failed: {e}")

    validated = []
    for item in questions_raw:
        if not isinstance(item, dict):
            continue

        q = str(item.get("question", "")).strip()
        opts = item.get("options", [])
        correct = item.get("correct_answer", item.get("correctAnswer", 0))

        if not q or not isinstance(opts, list) or len(opts) < 2:
            continue

        # Normalise to exactly 4 options
        opts = [str(o).strip() for o in opts[:4]]
        while len(opts) < 4:
            opts.append("")

        # Normalise correct_answer to int index (AI sometimes returns "A", "B", etc.)
        if isinstance(correct, str):
            if correct.upper() in ("A", "B", "C", "D"):
                correct = ord(correct.upper()) - ord("A")
            else:
                try:
                    correct = int(correct)
                except Exception:
                    correct = 0
        elif not isinstance(correct, int):
            correct = 0
        correct = max(0, min(correct, len(opts) - 1))

        validated.append({
            "question": q,
            "options": opts,
            "correct_answer": correct,
            "type": "mcq",
        })

    if not validated:
        raise HTTPException(status_code=500, detail="No valid questions generated")

    return {"questions": validated, "count": len(validated)}


# ================= QUESTION BANK =================

class QuestionBankRequest(BaseModel):
    topic: str
    difficulty: str = "medium"
    types: list[str] = ["mcq"]
    count: int = 10
    tags: str = ""


@router.post("/question-bank/generate")
async def question_bank_generate(req: QuestionBankRequest):

    if not settings.API_KEY:
        raise HTTPException(status_code=503, detail="API_KEY missing")

    count = max(1, min(req.count, 20))
    topic = req.topic.strip()
    difficulty = req.difficulty.strip().lower()
    if difficulty not in ("easy", "medium", "hard"):
        difficulty = "medium"
    tags_clause = f" Focus on: {req.tags.strip()}." if req.tags and req.tags.strip() else ""

    prompt = (
        f"Generate {count} multiple-choice quiz questions about \"{topic}\" "
        f"at {difficulty} difficulty level.{tags_clause}\n\n"
        "Return ONLY a valid JSON array. Each object must have exactly these fields:\n"
        "- \"question\": the question text (string)\n"
        "- \"options\": array of exactly 4 answer choices (strings)\n"
        "- \"correct_answer\": zero-based index of the correct option (integer 0-3)\n\n"
        "Example:\n"
        "[{\"question\":\"What is 2+2?\",\"options\":[\"3\",\"4\",\"5\",\"6\"],\"correct_answer\":1}]\n\n"
        "Return ONLY the JSON array. No explanation, no markdown, no code blocks."
    )

    req_data = build_llm_request(prompt)

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                req_data["url"],
                headers=req_data["headers"],
                params=req_data["params"],
                json=req_data["payload"],
            )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI unreachable: {exc}")

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"AI error {response.status_code}: {response.text[:300]}",
        )

    data = response.json()

    if req_data["parser"] == "openrouter":
        raw_text = data["choices"][0]["message"]["content"]
    elif req_data["parser"] == "gemini":
        if "candidates" not in data:
            raise HTTPException(status_code=500, detail="Bad AI response")
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
    else:
        raise HTTPException(status_code=500, detail="Unknown parser")

    match = re.search(r"\[[\s\S]*\]", raw_text)
    if not match:
        raise HTTPException(status_code=500, detail="AI did not return a valid JSON array")

    try:
        questions_raw = json.loads(match.group())
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI response parsing failed: {e}")

    validated = []
    for item in questions_raw:
        if not isinstance(item, dict):
            continue

        q = str(item.get("question", "")).strip()
        opts = item.get("options", [])
        correct = item.get("correct_answer", item.get("correctAnswer", 0))

        if not q or not isinstance(opts, list) or len(opts) < 2:
            continue

        # Normalise to exactly 4 options
        opts = [str(o).strip() for o in opts[:4]]
        while len(opts) < 4:
            opts.append("")

        # Normalise correct_answer to int index
        if isinstance(correct, str):
            if correct.upper() in ("A", "B", "C", "D"):
                correct = ord(correct.upper()) - ord("A")
            else:
                try:
                    correct = int(correct)
                except Exception:
                    correct = 0
        elif not isinstance(correct, int):
            correct = 0
        correct = max(0, min(correct, len(opts) - 1))

        validated.append({
            "question": q,
            "options": opts,
            "correct_answer": correct,
            "type": "mcq",
        })

    if not validated:
        raise HTTPException(status_code=500, detail="No valid questions generated")

    return {"questions": validated, "count": len(validated)}