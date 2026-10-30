"""
Wikipedia Grounding Service
============================
Fetches a real-world summary and URL for any concept using the
Wikipedia REST API (no API key needed, free-tier).

Used to:
1. Enrich node descriptions with factual content
2. Provide evidence_urls on edges (grounding)
3. Verify that a concept is a real, searchable topic
"""

import httpx
from typing import Optional
from app.core.config import settings

WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary/"
TIMEOUT = 5.0  # seconds


async def fetch_wiki_summary(concept: str) -> dict:
    """
    Fetch a Wikipedia summary for a concept.

    Returns a dict with:
        found       : bool   - whether the article was found
        title       : str    - canonical Wikipedia title
        summary     : str    - first paragraph (kid-friendly length)
        url         : str    - full Wikipedia article URL
        thumbnail   : str|None - thumbnail image URL if available
    """
    query = concept.strip().replace(" ", "_")
    url = f"{WIKI_API}{query}"

    headers = {"User-Agent": settings.WIKIPEDIA_USER_AGENT}

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(url, headers=headers, follow_redirects=True)

        if response.status_code == 200:
            data = response.json()
            summary = data.get("extract", "")
            # Trim to first 3 sentences for kids
            sentences = summary.split(". ")
            short_summary = ". ".join(sentences[:3]).strip()
            if short_summary and not short_summary.endswith("."):
                short_summary += "."

            return {
                "found": True,
                "title": data.get("title", concept),
                "summary": short_summary or summary[:300],
                "url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
                "thumbnail": data.get("thumbnail", {}).get("source") if data.get("thumbnail") else None,
            }

        # 404 or redirect gone wrong — concept not found on Wikipedia
        return _not_found(concept)

    except (httpx.TimeoutException, httpx.ConnectError):
        # Network failure → graceful offline fallback
        return _offline_fallback(concept)

    except Exception:
        return _not_found(concept)


def _not_found(concept: str) -> dict:
    return {
        "found": False,
        "title": concept,
        "summary": f"{concept.capitalize()} is an interesting concept worth exploring!",
        "url": f"https://en.wikipedia.org/wiki/Special:Search?search={concept.replace(' ', '+')}",
        "thumbnail": None,
    }


def _offline_fallback(concept: str) -> dict:
    return {
        "found": False,
        "title": concept,
        "summary": f"Could not reach Wikipedia right now. {concept.capitalize()} is still a great concept!",
        "url": "",
        "thumbnail": None,
    }
