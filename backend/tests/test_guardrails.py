"""Tests for the kid-safe guardrails layer."""
import pytest
from app.core.guardrails import check_input, sanitize_label


@pytest.mark.parametrize("text,expected_safe", [
    ("photosynthesis", True),
    ("black hole", True),
    ("volcano eruption", True),
    ("robot", True),
    ("kill people", False),
    ("bomb", False),
    ("sex", False),
    ("porn", False),
    ("9876543210", False),       # phone number
    ("test@email.com", False),   # email
    ("", False),                 # empty
    ("A" * 301, False),          # too long
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
