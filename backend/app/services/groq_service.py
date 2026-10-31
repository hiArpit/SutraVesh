import json
import base64
import re
from typing import Optional, List, Tuple
from groq import Groq
from app.core.config import settings
from app.core.guardrails import sanitize_label
from app.services.wiki_service import fetch_wiki_summary

_client: Optional[Groq] = None


def _get_client() -> Optional[Groq]:
    global _client
    if _client is not None:
        return _client
    if not settings.GROQ_API_KEY:
        return None
    try:
        _client = Groq(api_key=settings.GROQ_API_KEY)
        return _client
    except Exception:
        return None


async def identify_concept_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """
    Send an image to Groq vision model → get back a concept label and 3-part kid card.
    """
    client = _get_client()
    if not client:
        return _vision_offline_fallback()

    try:
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        data_url = f"data:{mime_type};base64,{b64}"

        prompt_text = (
            "You are an encouraging educational AI mentor helping children discover the world around them. "
            "Identify the main object or wonder in this photo and create a kid-friendly discovery card. "
            "Respond with ONLY valid JSON with these exact keys:\n"
            "{\n"
            '  "concept": "<1-3 words object name, e.g. Book, Apple, Leaf, Bicycle>",\n'
            '  "description": "<1-2 sentence overall summary>",\n'
            '  "what_is_it": "<1-2 simple sentences for a child explaining what it is, e.g. A book is a long story. It has many paper pages. You can read it or listen to it.>",\n'
            '  "fun_fact": "<1 exciting, playful kid science or history fact, e.g. Books can be true facts. Some are made-up stories.>",\n'
            '  "try_this": "<1 simple sensory observation activity for a child, e.g. Look at a book cover. Feel how it folds.>",\n'
            '  "grade_level": "<e.g. Grade 1.3>",\n'
            '  "confidence": "<high|medium|low>"\n'
            "}"
        )

        completion = client.chat.completions.create(
            model=settings.GROQ_VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": data_url}},
                        {
                            "type": "text",
                            "text": prompt_text,
                        },
                    ],
                }
            ],
            max_tokens=240,
            temperature=0.1,
        )

        raw = completion.choices[0].message.content.strip()
        data = _parse_json_safe(raw)
        concept = sanitize_label(data.get("concept", "curious wonder"))
        what_is_it = data.get("what_is_it", f"A {concept} is a wonderful part of our everyday world.").strip()
        fun_fact = data.get("fun_fact", f"Did you know? Every {concept} has its own special place in nature or science!").strip()
        try_this = data.get("try_this", f"Take a close look at this {concept}. Notice its colors, shapes, and textures.").strip()
        description = data.get("description", what_is_it).strip()
        grade_level = data.get("grade_level", "Grade 1.3").strip()
        confidence = data.get("confidence", "medium")

        return {
            "concept": concept,
            "description": description,
            "what_is_it": what_is_it,
            "fun_fact": fun_fact,
            "try_this": try_this,
            "grade_level": grade_level,
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
    Finds the strongest connection using the 4 SutraVesh Connection Rules:
    1. Material & Ingredients (what it is made of)
    2. Purpose & Teamwork (tools/objects used together)
    3. Energy & Transformation (powers, warms, or transforms)
    4. Habitat & Ecosystem (lives or exists together in nature)
    """
    client = _get_client()
    prior = [sanitize_label(p) for p in (prior_wonders or [source]) if p]
    if source not in prior:
        prior.insert(0, source)

    # 1. Fetch Wikipedia evidence for new concept and primary source
    source_wiki, target_wiki = await _fetch_evidence_pair(source, target)
    evidence_urls = [u for u in [source_wiki.get("url"), target_wiki.get("url")] if u]

    if not client:
        return _reasoning_offline_fallback(source, target, evidence_urls, prior=prior)

    source_summary = source_wiki.get("summary", "")
    target_summary = target_wiki.get("summary", "")

    prompt = f"""You are a warm, encouraging educational AI mentor for young learners in SutraVesh.

--- REAL-WORLD EVIDENCE (from Wikipedia) ---
Wikipedia says about "{source_wiki.get('title', source)}":
"{source_summary}"

Wikipedia says about "{target_wiki.get('title', target)}":
"{target_summary}"
--------------------------------------------

The child is introducing a new discovery: "{target}"
Their note / clue: "{explanation}"
Their current trail of discovered wonders on the map is: {json.dumps(prior)}

Evaluate whether "{target}" connects to "{source}" or ANY wonder in their prior trail ({json.dumps(prior)}) using the 4 SutraVesh Connection Rules:
1. "Material & Ingredients": One is made from, derived from, or contains the other (e.g. Paper & Book, Tree & Wood, Flour & Bread).
2. "Purpose & Teamwork": Used together for a shared job or play (e.g. Pen & Paper, Lock & Key, Spoon & Bowl).
3. "Energy & Transformation": One powers, warms, feeds, grows, or changes into the other (e.g. Sun & Plant, Water & Ice, Fire & Smoke).
4. "Habitat & Ecosystem": They naturally live, grow, or exist together in the same home or environment (e.g. Bee & Flower, Bird & Nest, Fish & River).

Respond with ONLY valid JSON:
{{
  "verdict": "<established|association|rejected>",
  "connected_wonders": ["<list of names from prior trail that genuinely connect to {target}, or [] if none>"],
  "connection_rule": "<Material & Ingredients|Purpose & Teamwork|Energy & Transformation|Habitat & Ecosystem|None>",
  "reason": "<encouraging 1-sentence explanation for a child, max 20 words>",
  "resonance_bridges": []
}}

Rules:
- "established": Directly connects to one or more wonders in the trail through verified science, functional utility, or natural ecosystems.
- "association": Connected through creative or everyday similarity, but less direct.
- If "{target}" has NO valid connection to any wonder in {json.dumps(prior)}, set "verdict": "association", "connected_wonders": [], "connection_rule": "None", "reason": "{target} is an exciting new wonder ready to find its own connections!"
- "rejected": Only if the claim asserts impossible magic (e.g. sand literally turns into bananas)."""

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

        connected_wonders = data.get("connected_wonders", [source])
        if not isinstance(connected_wonders, list):
            connected_wonders = [source]
        connected_wonders = [sanitize_label(str(w)) for w in connected_wonders if w]

        resonance_bridges = data.get("resonance_bridges", [])
        if not isinstance(resonance_bridges, list):
            resonance_bridges = []
        resonance_bridges = [sanitize_label(str(b)) for b in resonance_bridges if b]

        connection_rule = data.get("connection_rule", "Purpose & Teamwork")
        reason = data.get("reason", f"Great connection between {source} and {target}!")

        return {
            "verdict": verdict,
            "connected_wonders": connected_wonders,
            "connection_rule": connection_rule,
            "reason": reason[:140],
            "resonance_bridges": resonance_bridges,
            "evidence_urls": evidence_urls,
            "fallback": False,
        }
    except Exception:
        return _reasoning_offline_fallback(source, target, evidence_urls, prior=prior)


async def _fetch_evidence_pair(source: str, target: str) -> Tuple[dict, dict]:
    import asyncio
    source_wiki, target_wiki = await asyncio.gather(
        fetch_wiki_summary(source),
        fetch_wiki_summary(target),
        return_exceptions=True,
    )
    if isinstance(source_wiki, Exception):
        source_wiki = {}
    if isinstance(target_wiki, Exception):
        target_wiki = {}
    return source_wiki, target_wiki


def _vision_offline_fallback() -> dict:
    return {
        "concept": "interesting object",
        "description": "An intriguing object discovered in the surrounding world, ready to reveal its wonders!",
        "what_is_it": "An intriguing object discovered in the surrounding world, ready to reveal its wonders!",
        "fun_fact": "Every object in our world has its own unique story and connections to science!",
        "try_this": "Look closely at this object and see what other things in your room are similar.",
        "grade_level": "Grade 1.3",
        "confidence": "low",
        "fallback": True,
    }


def _reasoning_offline_fallback(source: str, target: str, evidence_urls: list = None, prior: list = None) -> dict:
    return {
        "verdict": "association",
        "connected_wonders": [source],
        "connection_rule": "Purpose & Teamwork",
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
