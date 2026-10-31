"""
Groq AI Service
===============
Two-stage AI pipeline for SutraVesh:

Stage 1 — Vision (llama-3.2-11b-vision-preview):
  Takes a base64 image → returns a detected concept label

Stage 2 — Reasoning (llama-3.3-70b-versatile):
  1. Fetches Wikipedia summaries for BOTH source and target concepts
  2. Passes that real-world evidence as grounding context to Groq
  3. Returns verdict: 'established' | 'association' | 'rejected'
     + a kid-friendly reason
     + up to 3 resonance bridge concepts (World Mode)

Offline fallback:
  If GROQ_API_KEY is missing or any call fails, returns a
  deterministic offline result so the demo never crashes.
"""

import base64
import re
import json
from typing import Optional
from app.core.config import settings
from app.core.guardrails import sanitize_label
from app.services.wiki_service import fetch_wiki_summary


# ---------------------------------------------------------------------------
# Lazy Groq client — only created when API key is present
# ---------------------------------------------------------------------------
def _get_client():
    key = settings.GROQ_API_KEY
    if not key:
        return None
    try:
        from groq import Groq
        return Groq(api_key=key)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# STAGE 1: Vision — identify concept from image
# ---------------------------------------------------------------------------
async def identify_concept_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """
    Send an image to Groq vision model → get back a concept label.

    Returns:
        concept   : str  - the detected concept (e.g. "solar panel")
        confidence: str  - 'high' | 'medium' | 'low'
        fallback  : bool - True if offline mode was used
    """
    client = _get_client()
    if not client:
        return _vision_offline_fallback()

    try:
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        data_url = f"data:{mime_type};base64,{b64}"

        completion = client.chat.completions.create(
            model=settings.GROQ_VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": data_url},
                        },
                        {
                            "type": "text",
                            "text": (
                                "You are helping kids in an educational discovery game. "
                                "Look at this image and respond with ONLY a JSON object:\n"
                                '{"concept": "<single concept name>", "confidence": "<high|medium|low>"}\n'
                                "The concept should be a single noun or short phrase (max 4 words). "
                                "Examples: 'photosynthesis', 'black hole', 'solar panel', 'water cycle'."
                            ),
                        },
                    ],
                }
            ],
            max_tokens=80,
            temperature=0.1,
        )

        raw = completion.choices[0].message.content.strip()
        data = _parse_json_safe(raw)
        concept = sanitize_label(data.get("concept", "unknown object"))
        confidence = data.get("confidence", "medium")

        return {
            "concept": concept,
            "confidence": confidence if confidence in ("high", "medium", "low") else "medium",
            "fallback": False,
        }

    except Exception:
        return _vision_offline_fallback()


# ---------------------------------------------------------------------------
# STAGE 2: Reasoning — evaluate hop with Wikipedia grounding
# ---------------------------------------------------------------------------
async def evaluate_hop(
    source: str,
    target: str,
    explanation: str,
    mode: str = "quest",
) -> dict:
    """
    Evaluate a kid's connection hop using Wikipedia evidence + Groq reasoning.

    Pipeline:
      1. Fetch Wikipedia summaries for source AND target (real-world grounding)
      2. Build a context-rich prompt embedding those summaries
      3. Ask Groq to judge the kid's explanation AGAINST that evidence
      4. Return verdict, reason, resonance bridges, and the evidence urls used

    Returns:
        verdict          : 'established' | 'association' | 'rejected'
        reason           : str  — kid-friendly one-sentence explanation
        resonance_bridges: list[str] — up to 3 bridging concepts (World Mode)
        evidence_urls    : list[str] — Wikipedia URLs used as grounding context
        fallback         : bool — True if offline mode was used
    """
    client = _get_client()

    # --- Step 1: Fetch Wikipedia evidence for both concepts (always runs) ---
    source_wiki, target_wiki = await _fetch_evidence_pair(source, target)

    evidence_urls = [
        u for u in [source_wiki.get("url"), target_wiki.get("url")] if u
    ]

    if not client:
        return _reasoning_offline_fallback(source, target, evidence_urls)

    # --- Step 2: Build grounded prompt with Wikipedia context ---
    source_context = (
        f'Wikipedia says about "{source_wiki["title"]}":\n'
        f'"{source_wiki["summary"]}"'
        if source_wiki["found"]
        else f'(No Wikipedia article found for "{source}")'
    )

    target_context = (
        f'Wikipedia says about "{target_wiki["title"]}":\n'
        f'"{target_wiki["summary"]}"'
        if target_wiki["found"]
        else f'(No Wikipedia article found for "{target}")'
    )

    world_instruction = (
        "Also suggest up to 3 'resonance bridge' concepts that connect "
        f'"{source}" and "{target}" in unexpected but valid ways. '
        'Add them as "resonance_bridges": ["concept1", "concept2", "concept3"].'
        if mode == "world"
        else ""
    )

    prompt = f"""You are an educational AI evaluating a connection made by a child (age 6-12)
in a science discovery game called WonderLens.

--- REAL-WORLD EVIDENCE (from Wikipedia) ---
{source_context}

{target_context}
--------------------------------------------

The child is connecting: "{source}" → "{target}"
Their explanation: "{explanation}"

Using the Wikipedia evidence above as your primary grounding, evaluate the child's claim.
Respond ONLY with a JSON object:
{{
  "verdict": "<established|association|rejected>",
  "reason": "<one encouraging sentence, max 20 words, suitable for a child>",
  "resonance_bridges": []
}}

Verdict rules (apply strictly against the Wikipedia evidence):
- "established": the Wikipedia evidence directly supports a factual scientific link
- "association": a plausible creative or indirect link not contradicted by evidence
- "rejected": completely unrelated, contradicted by evidence, or nonsensical
{world_instruction}"""

    # --- Step 3: Call Groq Reasoning model ---
    try:
        completion = _get_client().chat.completions.create(
            model=settings.GROQ_REASONING_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.2,
        )

        raw = completion.choices[0].message.content.strip()
        data = _parse_json_safe(raw)

        verdict = data.get("verdict", "association")
        if verdict not in ("established", "association", "rejected"):
            verdict = "association"

        bridges = data.get("resonance_bridges", [])
        if not isinstance(bridges, list):
            bridges = []

        return {
            "verdict": verdict,
            "reason": data.get("reason", f"Great thinking connecting {source} and {target}!"),
            "resonance_bridges": [sanitize_label(b) for b in bridges[:3]],
            "evidence_urls": evidence_urls,
            "fallback": False,
        }

    except Exception:
        return _reasoning_offline_fallback(source, target, evidence_urls)


# ---------------------------------------------------------------------------
# Internal helper: fetch Wikipedia for both source and target concurrently
# ---------------------------------------------------------------------------
async def _fetch_evidence_pair(source: str, target: str) -> tuple[dict, dict]:
    """Fetch Wikipedia summaries for source and target in parallel."""
    import asyncio
    source_wiki, target_wiki = await asyncio.gather(
        fetch_wiki_summary(source),
        fetch_wiki_summary(target),
    )
    return source_wiki, target_wiki


# ---------------------------------------------------------------------------
# Offline fallbacks — deterministic, never crash the demo
# ---------------------------------------------------------------------------
def _vision_offline_fallback() -> dict:
    return {
        "concept": "interesting object",
        "confidence": "low",
        "fallback": True,
    }


def _reasoning_offline_fallback(source: str, target: str, evidence_urls: list = None) -> dict:
    return {
        "verdict": "association",
        "reason": f"Creative connection between {source} and {target}! Keep exploring.",
        "resonance_bridges": [],
        "evidence_urls": evidence_urls or [],
        "fallback": True,
    }


# ---------------------------------------------------------------------------
# Safe JSON parser — handles Groq wrapping output in markdown code blocks
# ---------------------------------------------------------------------------
def _parse_json_safe(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass
    return {}
