"""
Groq AI Service
===============
Multimodal Vision + Multi-Discovery Grounded Reasoning.

Stage 1 — Vision (llama-3.2-11b-vision-preview):
  Takes image bytes → returns detected concept label

Stage 2 — Multi-Discovery Reasoning (openai/gpt-oss-120b):
  Compares new concept against ALL previously discovered concepts on the trail.
  Finds the strongest connections, awards points, and generates friendly feedback.
"""

import base64
import re
import json
from typing import Optional, List
from app.core.config import settings
from app.core.guardrails import sanitize_label
from app.services.wiki_service import fetch_wiki_summary


def _get_client():
    key = settings.GROQ_API_KEY
    if not key:
        return None
    try:
        from groq import Groq
        return Groq(api_key=key)
    except Exception:
        return None


async def identify_concept_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """Send an image to Groq vision model → get back a concept label."""
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
                        {"type": "image_url", "image_url": {"url": data_url}},
                        {
                            "type": "text",
                            "text": (
                                "You are helping kids in an educational discovery adventure. "
                                "Identify the main object or wonder in this photo. "
                                "Respond with ONLY JSON: {\"concept\": \"<name>\", \"confidence\": \"high|medium|low\"}. "
                                "Max 3 words for concept."
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
        concept = sanitize_label(data.get("concept", "curious wonder"))
        confidence = data.get("confidence", "medium")

        return {
            "concept": concept,
            "confidence": confidence if confidence in ("high", "medium", "low") else "medium",
            "fallback": False,
        }
    except Exception:
        return _vision_offline_fallback()


async def evaluate_hop(
    source: str,
    target: str,
    explanation: str,
    mode: str = "quest",
    prior_wonders: Optional[List[str]] = None,
) -> dict:
    """
    Evaluate a new discovery against the entire trail of prior wonders.
    Finds the strongest connection, grounds against Wikipedia, and returns points.
    """
    client = _get_client()
    prior = [sanitize_label(p) for p in (prior_wonders or [source]) if p]
    if source not in prior:
        prior.insert(0, source)

    # 1. Fetch Wikipedia evidence for new concept and primary source
    source_wiki, target_wiki = await _fetch_evidence_pair(source, target)
    evidence_urls = [u for u in [source_wiki.get("url"), target_wiki.get("url")] if u]

    if not client:
        return _reasoning_offline_fallback(source, target, evidence_urls)

    source_summary = source_wiki.get("summary", "")
    target_summary = target_wiki.get("summary", "")

    prompt = f"""You are a warm, encouraging educational AI mentor for young learners in SutraVesh.

--- REAL-WORLD EVIDENCE (from Wikipedia) ---
Wikipedia says about "{source_wiki.get('title', source)}":
"{source_summary}"

Wikipedia says about "{target_wiki.get('title', target)}":
"{target_summary}"
--------------------------------------------

The child is connecting: "{source}" → "{target}"
Their note / clue: "{explanation}"

Their current trail of discovered wonders includes: {json.dumps(prior)}

Evaluate how "{target}" connects to "{source}" and the wonders in their trail.
Respond with ONLY valid JSON:
{{
  "verdict": "<established|association|rejected>",
  "connected_wonders": ["{source}"],
  "reason": "<encouraging 1-sentence explanation for a child, max 20 words>",
  "resonance_bridges": []
}}

Rules:
- "established": Directly connects to one or more wonders in the trail through verified science, functional utility, or natural ecosystems.
- "association": Plausibly or creatively connects to prior wonders (e.g. shared habitat, daily use, physical properties), or is an exciting fresh discovery that expands their learning trail.
- "rejected": If the claim asserts an impossible transformation (e.g. claiming sand literally turns into bananas or an object turns into food), or is pure nonsensical gibberish."""

    system_instruction = (
        "You are an educational science evaluator for kids. "
        "Strict Rule: If a claim asserts that one inanimate material physically turns into or becomes an unrelated living food/organism "
        "(e.g., 'sand turns into bananas'), you MUST set verdict='rejected'."
    )

    try:
        completion = client.chat.completions.create(
            model=settings.GROQ_REASONING_MODEL,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            max_tokens=500,
            temperature=0.0,
        )

        raw = completion.choices[0].message.content.strip()
        data = _parse_json_safe(raw)

        verdict = data.get("verdict", "association")
        if verdict not in ("established", "association", "rejected"):
            verdict = "association"

        connected = data.get("connected_wonders", [source])
        if not isinstance(connected, list) or not connected:
            connected = [source]

        bridges = data.get("resonance_bridges", [])
        if not isinstance(bridges, list):
            bridges = []

        return {
            "verdict": verdict,
            "connected_wonders": [sanitize_label(c) for c in connected if c],
            "reason": data.get("reason", f"Great discovery! {target} connects to your trail."),
            "resonance_bridges": [sanitize_label(b) for b in bridges[:2]],
            "evidence_urls": evidence_urls,
            "fallback": False,
        }

    except Exception as e:
        print(f"[GROQ_REASONING_ERROR]: {e}")
        return _reasoning_offline_fallback(source, target, evidence_urls)


async def _fetch_evidence_pair(source: str, target: str) -> tuple[dict, dict]:
    import asyncio
    source_wiki, target_wiki = await asyncio.gather(
        fetch_wiki_summary(source),
        fetch_wiki_summary(target),
    )
    return source_wiki, target_wiki


def _vision_offline_fallback() -> dict:
    return {"concept": "interesting object", "confidence": "low", "fallback": True}


def _reasoning_offline_fallback(source: str, target: str, evidence_urls: list = None) -> dict:
    return {
        "verdict": "association",
        "connected_wonders": [source],
        "reason": f"Creative discovery connecting {source} and {target}! Keep exploring.",
        "resonance_bridges": [],
        "evidence_urls": evidence_urls or [],
        "fallback": True,
    }


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
