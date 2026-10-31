"""Tests for the kid-safe guardrails layer."""
import pytest
from app.core.guardrails import check_input, sanitize_label


@pytest.mark.parametrize("text,expected_safe", [
    ("photosynthesis", True),
    ("black hole", True),
    ("volcano eruption", True),
    ("robot", True),
    ("kitchen knife", True),            # Educational / innocent usage of knife
    ("bamboo shoot", True),             # Innocent plant biology usage of shoot
    ("heart attack", True),             # Innocent medical / biological term
    ("supernova explosion", True),      # Innocent space science term
    ("knife attack", False),            # Violent context
    ("shoot people", False),            # Violent context
    ("gun", False),                     # Weapon
    ("kill people", False),             # Severe violence
    ("bomb", False),                    # Severe violence
    ("sex", False),                     # Adult
    ("porn", False),                    # Adult
    ("9876543210", False),              # Phone number
    ("test@email.com", False),          # Email
    ("", False),                        # Empty
    ("A" * 301, False),                 # Too long
])
def test_check_input(text, expected_safe):
    safe, reason = check_input(text)
    assert safe == expected_safe, f"Expected safe={expected_safe} for {repr(text)}, got reason: {reason}"


def test_safe_input_returns_ok():
    safe, reason = check_input("photosynthesis")
    assert safe is True
    assert reason == "ok"


def test_sanitize_label_strips_special_chars():
    result = sanitize_label("Black Hole!!! @#")
    assert result == "Black Hole"


def test_sanitize_label_truncates():
    result = sanitize_label("A" * 100)
    assert len(result) <= 80
