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


# Per-type format description injected into the AI prompt so it knows how to
# structure each variant.  Keeping this as a module-level constant avoids
# rebuilding it on every request.
_TYPE_SPEC = {
    "mcq": {
        "label": "MCQ — one correct answer",
        "example": '{"type":"mcq","question":"...","options":["A","B","C","D"],"correct_answer":1}',
    },
    "msq": {
        "label": "MSQ — multiple correct answers",
        "example": '{"type":"msq","question":"...","options":["A","B","C","D"],"correct_answer":[0,2]}',
    },
    "truefalse": {
        "label": 'True/False — options must be exactly ["True","False"]',
        "example": '{"type":"truefalse","question":"...","options":["True","False"],"correct_answer":0}',
    },
    "short": {
        "label": "Short Answer — no options, answer is a text string",
        "example": '{"type":"short","question":"...","correct_answer":"Expected text"}',
    },
}

# Alias map to tolerate AI variations in type names
_TYPE_ALIAS = {
    "true_false": "truefalse", "tf": "truefalse", "boolean": "truefalse",
    "short_answer": "short", "sa": "short", "open": "short", "text": "short",
    "multiple_select": "msq", "multi": "msq", "multi_select": "msq",
    "multiple_choice": "mcq", "mc": "mcq",
}


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

    # ── Normalise requested types ───────────────────────────────────────────
    valid_types = [t for t in req.types if t in _TYPE_SPEC]
    if not valid_types:
        valid_types = ["mcq"]

    # ── Build type-aware prompt ─────────────────────────────────────────────
    type_lines = "\n".join(
        f'  - {_TYPE_SPEC[t]["label"]}:\n    {_TYPE_SPEC[t]["example"]}'
        for t in valid_types
    )
    prompt = (
        f'Generate {count} quiz questions about "{topic}" '
        f"at {difficulty} difficulty level.{tags_clause}\n\n"
        f"Include a MIX of these question types (spread evenly):\n{type_lines}\n\n"
        "Rules:\n"
        '- Every object MUST have "type" and "question" and "correct_answer"\n'
        '- MCQ, MSQ, True/False MUST include an "options" array\n'
        '- Short Answer must NOT include "options"\n'
        '- For MSQ, "correct_answer" is an array of zero-based indices, e.g. [0, 2]\n'
        '- For True/False, options MUST be exactly ["True", "False"]\n'
        "- Spread questions across all listed types — do NOT generate only one type\n\n"
        "Return ONLY a valid JSON array. No explanation, no markdown, no code blocks."
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

    # ── Per-type normalisation ──────────────────────────────────────────────
    validated = []
    for item in questions_raw:
        if not isinstance(item, dict):
            continue

        q_text = str(item.get("question", "")).strip()
        if not q_text:
            continue

        # Resolve and normalise type string
        raw_type = str(item.get("type", "mcq")).strip().lower()
        q_type   = _TYPE_ALIAS.get(raw_type, raw_type)
        if q_type not in _TYPE_SPEC:
            q_type = "mcq"          # safe fallback — never crash on bad AI output

        correct_raw = item.get("correct_answer", item.get("correctAnswer"))

        # ── Short Answer ───────────────────────────────────────────────────
        if q_type == "short":
            validated.append({
                "type": "short",
                "question": q_text,
                "options": [],
                "correct_answer": str(correct_raw or "").strip(),
            })
            continue

        # ── True / False ───────────────────────────────────────────────────
        if q_type == "truefalse":
            # Normalise correct_answer → 0 (True) or 1 (False)
            if isinstance(correct_raw, bool):
                ca = 0 if correct_raw else 1
            elif isinstance(correct_raw, int):
                ca = max(0, min(correct_raw, 1))
            elif isinstance(correct_raw, str):
                ca = 0 if correct_raw.strip().lower() in ("true", "0") else 1
            else:
                ca = 0
            validated.append({
                "type": "truefalse",
                "question": q_text,
                "options": ["True", "False"],
                "correct_answer": ca,
            })
            continue

        # ── MCQ / MSQ — both need options ──────────────────────────────────
        opts = item.get("options", [])
        if not isinstance(opts, list) or len(opts) < 2:
            continue                 # skip — can't be a choice question without options

        opts = [str(o).strip() for o in opts[:4]]
        while len(opts) < 4:
            opts.append("")

        if q_type == "msq":
            # correct_answer must be a list of int indices
            if isinstance(correct_raw, int):
                ca_list = [correct_raw]
            elif isinstance(correct_raw, list):
                ca_list = [i for i in correct_raw if isinstance(i, int) and 0 <= i < len(opts)]
            else:
                ca_list = [0]
            validated.append({
                "type": "msq",
                "question": q_text,
                "options": opts,
                "correct_answer": ca_list if ca_list else [0],
            })
        else:
            # MCQ — single int index
            correct = correct_raw if correct_raw is not None else 0
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
            validated.append({
                "type": "mcq",
                "question": q_text,
                "options": opts,
                "correct_answer": max(0, min(correct, len(opts) - 1)),
            })

    if not validated:
        raise HTTPException(status_code=500, detail="No valid questions generated")

    return {"questions": validated, "count": len(validated)}