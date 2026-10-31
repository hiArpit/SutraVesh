"""
Kid-Safe Guardrails Layer (Two-Tier Architecture)
=================================================
Every user input (text or detected image label) MUST pass through
`check_input()` before being sent to Groq or Wikipedia.

Two-Tier Design:
- Tier 1: Hard-block list for unambiguous severe terms (profanity, extreme violence, adult).
- Safe Allowlist: Known-safe educational and everyday phrases (e.g. "kitchen knife", "bamboo shoot", "heart attack").
- Tier 2: Contextual regex patterns for context-sensitive hazard terms (knife attack, shooting weapons, violent attacks).
- PII & Length: Block phone numbers, emails, credit cards, and overly long inputs.
"""

import re
from typing import Tuple

# ---------------------------------------------------------------------------
# Tier 1: Unambiguous Hard-Block Sets
# ---------------------------------------------------------------------------
_PROFANITY = {
    "fuck", "shit", "bitch", "ass", "bastard", "crap", "damn",
    "hell", "piss", "cunt", "dick", "cock", "pussy"
}

_SEVERE_VIOLENCE = {
    "kill", "murder", "bomb", "suicide", "stab", "terror", "rape",
    "massacre", "decapitate", "execution", "genocide"
}

_ADULT = {
    "sex", "porn", "nude", "naked", "xxx", "erotic", "orgasm"
}

_TIER1_BLOCKED: set[str] = _PROFANITY | _SEVERE_VIOLENCE | _ADULT

# ---------------------------------------------------------------------------
# Educational / Safe Allowlists (Common innocent usages of ambiguous words)
# ---------------------------------------------------------------------------
_SAFE_EDUCATIONAL_PATTERNS = [
    re.compile(r"\b(kitchen|butter|table|pocket|chef|craft|palette|swiss army)\s+knife\b", re.IGNORECASE),
    re.compile(r"\b(photo|photography|film|video|camera)\s+shoot\b", re.IGNORECASE),
    re.compile(r"\b(bamboo|plant|green|young|flower|root)\s+shoot\b", re.IGNORECASE),
    re.compile(r"\b(heart|panic|asthma|anxiety|coughing)\s+attack\b", re.IGNORECASE),
    re.compile(r"\b(supernova|star|space|cosmic|volcanic)\s+explosion\b", re.IGNORECASE),
]

# ---------------------------------------------------------------------------
# Tier 2: Context-Sensitive Hazard Patterns
# ---------------------------------------------------------------------------
_TIER2_HAZARD_PATTERNS = [
    # Weapons / firearms
    re.compile(r"\b(gun|firearm|weapon|pistol|rifle|revolver|shotgun)\b", re.IGNORECASE),
    # Dangerous knife usage
    re.compile(r"\b(knife\s+(attack|fight|wound|kill|threat)|(stab|slash|threaten)\s+(with\s+)?(a\s+)?knife)\b", re.IGNORECASE),
    # Gun violence / shooting at people
    re.compile(r"\b(shoot(ing)?\s+(at|down|people|someone|person|crowd|school|with gun))\b", re.IGNORECASE),
    re.compile(r"\b(mass|drive-by|school)\s+shooting\b", re.IGNORECASE),
    # Violent physical attacks
    re.compile(r"\b((physical|brutal|violent|armed|terrorist)\s+attack)\b", re.IGNORECASE),
    re.compile(r"\battack\s+(someone|people|children|a person|crowd)\b", re.IGNORECASE),
    # Explosive threats
    re.compile(r"\b(explode\s+(building|city|car|school|crowd|people))\b", re.IGNORECASE),
]

# Personal info patterns
_PII_PATTERNS = [
    re.compile(r"\b\d{10}\b"),                                        # phone numbers
    re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"),  # email
    re.compile(r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b"),      # card number
]

# Max input length guard
MAX_CHARS = 300


def check_input(text: str) -> Tuple[bool, str]:
    """
    Returns (is_safe: bool, reason: str).
    Call this before passing any user text to Groq or Wikipedia.
    """
    if not text or not text.strip():
        return False, "Please type something first! 😊"

    cleaned = text.strip()

    # Length guard
    if len(cleaned) > MAX_CHARS:
        return False, f"Whoa, that's a lot! Keep it under {MAX_CHARS} characters. ✂️"

    lower = cleaned.lower()
    words = set(re.findall(r"\b\w+\b", lower))

    # Tier 1: Strict block-list check
    tier1_hits = words & _TIER1_BLOCKED
    if tier1_hits:
        return False, (
            "Hmm, let's keep our adventure family-friendly! 🌟 "
            "Try a different concept."
        )

    # Educational Safe Allowlist check:
    # If the text matches a known safe educational pattern, skip Tier 2 hazard checks
    is_safe_educational = any(pattern.search(cleaned) for pattern in _SAFE_EDUCATIONAL_PATTERNS)

    if not is_safe_educational:
        # Tier 2: Contextual hazard pattern check
        for pattern in _TIER2_HAZARD_PATTERNS:
            if pattern.search(cleaned):
                return False, (
                    "Hmm, let's keep our adventure family-friendly! 🌟 "
                    "Try a different concept."
                )

    # PII check
    for pattern in _PII_PATTERNS:
        if pattern.search(cleaned):
            return False, (
                "Looks like personal info! Let's keep it safe — "
                "use a concept or idea instead. 🔒"
            )

    return True, "ok"


def sanitize_label(label: str) -> str:
    """
    Strip special characters from AI-detected labels before
    using them as node IDs or Wikipedia search queries.
    """
    return re.sub(r"[^a-zA-Z0-9 _\-]", "", label).strip()[:80]
