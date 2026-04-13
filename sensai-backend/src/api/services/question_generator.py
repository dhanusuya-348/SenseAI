"""OpenAI-powered question generator for the PvP Arena."""
import json
from typing import List, Dict
from openai import AsyncOpenAI

client = AsyncOpenAI()

DIFFICULTY_HINTS = {
    "easy": "Keep questions straightforward and factual.",
    "medium": "Questions should require understanding of concepts, not just recall.",
    "hard": "Questions should require deep understanding, application, or analysis.",
}


async def generate_questions(
    module_name: str,
    content_summary: str,
    difficulty: str = "medium",
    num_questions: int = 5,
) -> List[Dict]:
    """
    Call OpenAI GPT-4o-mini to generate multiple-choice quiz questions
    based on module content. Returns a list of question dicts.
    """
    difficulty_hint = DIFFICULTY_HINTS.get(difficulty, DIFFICULTY_HINTS["medium"])

    prompt = f"""You are a quiz master for an online learning platform called SenseAI.
Generate exactly {num_questions} multiple-choice questions based on the following course module.

Module: "{module_name}"
Content: {content_summary[:3000]}
Difficulty: {difficulty}
Instruction: {difficulty_hint}

Rules:
- Each question must have exactly 4 options (A, B, C, D)
- Exactly one option must be correct
- Questions must be directly related to the module content
- Do not repeat similar questions
- Return ONLY valid JSON, no other text

Output format (JSON array):
[
  {{
    "question": "What is ...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0
  }}
]
"""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_completion_tokens=1500,
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    questions = json.loads(raw)

    # Validate structure
    validated = []
    for q in questions:
        if (
            isinstance(q, dict)
            and "question" in q
            and "options" in q
            and "correct_index" in q
            and len(q["options"]) == 4
            and isinstance(q["correct_index"], int)
            and 0 <= q["correct_index"] <= 3
        ):
            validated.append(q)

    if not validated:
        raise ValueError("OpenAI returned no valid questions")

    return validated[:num_questions]


def build_content_summary(tasks: List[Dict]) -> str:
    """Build a text summary from a list of task dicts."""
    parts = []
    for task in tasks:
        title = task.get("title", "")
        task_type = task.get("type", "")
        if title:
            parts.append(f"- [{task_type}] {title}")
    return "\n".join(parts) if parts else "General module content"
