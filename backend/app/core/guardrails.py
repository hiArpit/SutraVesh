"""
Kid-Safe Guardrails Layer
=========================
Every user input (text or detected image label) MUST pass through
`check_input()` before being sent to Groq or Wikipedia.

Rules:
- Block profanity / adult content
- Block violence / weapons
- Block personal information patterns
- Allow all genuine curiosity-driven concepts
"""

import re
from typing import Tuple

# ---------------------------------------------------------------------------
# Block-lists (keep minimal – only clear-cut violations)
# ---------------------------------------------------------------------------
_PROFANITY = {
    "fuck", "shit", "bitch", "ass", "bastard", "crap", "damn",
    "hell", "piss", "cunt", "dick", "cock", "pussy"
}

_VIOLENCE = {
    "kill", "murder", "bomb", "gun", "weapon", "knife", "suicide",
    "shoot", "stab", "explode", "terror", "attack", "rape"
}

_ADULT = {
    "sex", "porn", "nude", "naked", "xxx", "erotic", "orgasm"
}

_ALL_BLOCKED: set[str] = _PROFANITY | _VIOLENCE | _ADULT

# Personal info patterns
_PII_PATTERNS = [
    re.compile(r"\b\d{10}\b"),                          # phone numbers
    re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"),  # email
    re.compile(r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b"),      # card number
]

# ---------------------------------------------------------------------------
# Max input length guard
# ---------------------------------------------------------------------------
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

    # Block-list check
    hits = words & _ALL_BLOCKED
    if hits:
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
