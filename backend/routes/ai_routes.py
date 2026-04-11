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
                f"{settings.LLM_API_URL}?key={settings.API_KEY}",
                json={
                    "contents": [
                        {
                            "parts": [
                                {"text": prompt}
                        ]
                        }
                    ]
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
            detail=f"API error {response.status_code}: {response.text[:300]}",
        )

    try:
        data = response.json()
        if "candidates" not in data:
            raise Exception(data)
        raw_text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="AI response parsing failed: {str(e)}",
        )

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


# ─────────────────────────────────────────────────────────────────
# Question Bank: multi-type generation
# ─────────────────────────────────────────────────────────────────

class QuestionBankRequest(BaseModel):
    topic: str
    difficulty: str = "medium"          # easy | medium | hard
    types: list[str] = ["mcq"]          # mcq | msq | short | truefalse
    count: int = 10                      # 1–20
    tags: str = ""                       # optional comma-separated keywords


@router.post("/question-bank/generate")
async def question_bank_generate(req: QuestionBankRequest):
    """
    Generate mixed-type quiz questions using the configured LLM.
    Supports mcq, msq, short, and truefalse question types.
    API key is read from the API_KEY environment variable — provider-agnostic.
    """
    if not settings.API_KEY:
        raise HTTPException(
            status_code=503,
            detail=(
                "AI service not configured. "
                "Add API_KEY=<your-key> to backend/.env and restart."
            ),
        )

    count = max(1, min(req.count, 20))
    topic = req.topic.strip()
    difficulty = req.difficulty.strip().lower()
    if difficulty not in ("easy", "medium", "hard"):
        difficulty = "medium"

    valid_types = {"mcq", "msq", "short", "truefalse"}
    types = [t for t in req.types if t in valid_types] or ["mcq"]
    tags_hint = (
        f" Emphasise these keywords: {req.tags.strip()}."
        if req.tags.strip() else ""
    )

    type_schemas = (
        'Type schemas (use exactly as shown):\n'
        '  mcq       → {"type":"mcq","question":"...","options":["A","B","C","D"],"correct_answer":0}\n'
        '              correct_answer = 0-based index of the ONE correct option; exactly 4 options.\n\n'
        '  msq       → {"type":"msq","question":"...","options":["A","B","C","D"],"correct_answer":[0,2]}\n'
        '              correct_answer = array of indices for ALL correct options (≥2); exactly 4 options.\n\n'
        '  truefalse → {"type":"truefalse","question":"...","options":["True","False"],"correct_answer":0}\n'
        '              correct_answer = 0 for True, 1 for False; options must be ["True","False"].\n\n'
        '  short     → {"type":"short","question":"...","options":[],"correct_answer":"answer"}\n'
        '              correct_answer = concise expected string answer (1-5 words); options must be [].\n'
    )

    prompt = (
        f'Generate exactly {count} quiz questions about "{topic}" '
        f'at {difficulty} difficulty.{tags_hint}\n\n'
        f'Use ONLY these question types: {", ".join(types)}. '
        f'Distribute the {count} questions as evenly as possible across these types.\n\n'
        f'{type_schemas}\n'
        'Return ONLY a valid JSON array — no explanation, no markdown fences, no code blocks.\n'
        'Output the raw JSON array and nothing else.'
    )

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.LLM_API_URL}?key={settings.API_KEY}",
                json={
                    "contents": [
                        {
                            "parts": [
                                {"text": prompt}
                            ]
                        }
                    ]
                },
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timed out. Try again.")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI service unreachable: {exc}")

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"AI error {response.status_code}: {response.text[:300]}",
        )

    try:
        data = response.json()
        if "candidates" not in data:
            raise Exception(data)
        raw_text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="AI response parsing failed: {str(e)}",
        )
    
    match = re.search(r"\[[\s\S]*\]", raw_text)
    if not match:
        raise HTTPException(
            status_code=500,
            detail="AI returned an unexpected format. Try again.",
        )

    try:
        raw_list = json.loads(match.group())
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="AI returned malformed JSON. Try again.",
        )

    if not isinstance(raw_list, list):
        raise HTTPException(status_code=500, detail="AI output is not a list.")

    validated = []
    for item in raw_list:
        if not isinstance(item, dict):
            continue

        q_type = str(item.get("type", "mcq")).strip().lower()
        question_text = str(item.get("question", "")).strip()
        options = item.get("options", [])
        correct = item.get("correct_answer")

        if not question_text or q_type not in valid_types:
            continue

        if q_type == "mcq":
            if not isinstance(options, list) or len(options) != 4:
                continue
            if not isinstance(correct, int) or correct not in range(4):
                correct = 0
            validated.append({
                "type": "mcq",
                "question": question_text,
                "options": [str(o).strip() for o in options],
                "correct_answer": correct,
            })

        elif q_type == "msq":
            if not isinstance(options, list) or len(options) != 4:
                continue
            if not isinstance(correct, list) or len(correct) < 2:
                continue
            correct_clean = sorted(
                set(i for i in correct if isinstance(i, int) and 0 <= i < 4)
            )
            if len(correct_clean) < 2:
                continue
            validated.append({
                "type": "msq",
                "question": question_text,
                "options": [str(o).strip() for o in options],
                "correct_answer": correct_clean,
            })

        elif q_type == "truefalse":
            if not isinstance(correct, int) or correct not in (0, 1):
                correct = 0
            validated.append({
                "type": "truefalse",
                "question": question_text,
                "options": ["True", "False"],
                "correct_answer": correct,
            })

        elif q_type == "short":
            correct_str = str(correct or "").strip()
            if not correct_str:
                continue
            validated.append({
                "type": "short",
                "question": question_text,
                "options": [],
                "correct_answer": correct_str,
            })

    if not validated:
        raise HTTPException(
            status_code=500,
            detail=(
                "AI could not generate valid questions for that topic. "
                "Try a different topic or difficulty."
            ),
        )

    return {"questions": validated, "count": len(validated)}
