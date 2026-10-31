"""
Game API Routes
===============
POST /api/session   — create a new game session
POST /api/hop       — submit a hop (text or image)
GET  /api/session/{session_id} — get current session state
POST /api/discover  — discover related concepts for a seed node
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
from pydantic import BaseModel

from app.schemas.graph import HopRequest, HopResponse, DiscoverResponse, Node, Edge, PlayMode
from app.core.guardrails import check_input, sanitize_label
from app.core.session import create_session, get_session
from app.services.hop_engine import process_hop
from app.services.wiki_service import fetch_wiki_summary
from app.services.groq_service import evaluate_hop

router = APIRouter(prefix="/api", tags=["game"])


# ---------------------------------------------------------------------------
# Request / Response models for session creation
# ---------------------------------------------------------------------------
class SessionCreateRequest(BaseModel):
    mode: PlayMode = "quest"
    seed_concept: str
    quest_target: Optional[str] = None


class SessionCreateResponse(BaseModel):
    session_id: str
    mode: str
    seed_concept: str
    quest_target: Optional[str]
    message: str


# ---------------------------------------------------------------------------
# POST /api/session — Create game session
# ---------------------------------------------------------------------------
@router.post("/session", response_model=SessionCreateResponse)
async def create_game_session(body: SessionCreateRequest):
    """
    Start a new game session.
    - mode='quest'  → chain hunt from seed to target concept
    - mode='world'  → open sandbox divergent island exploration
    """
    safe, reason = check_input(body.seed_concept)
    if not safe:
        raise HTTPException(status_code=400, detail=reason)

    if body.mode == "quest" and not body.quest_target:
        raise HTTPException(
            status_code=400,
            detail="Quest mode requires a quest_target concept."
        )

    if body.quest_target:
        safe_t, reason_t = check_input(body.quest_target)
        if not safe_t:
            raise HTTPException(status_code=400, detail=reason_t)

    session = create_session(
        mode=body.mode,
        seed_concept=sanitize_label(body.seed_concept),
        quest_target=sanitize_label(body.quest_target) if body.quest_target else None,
    )

    return SessionCreateResponse(
        session_id=session.session_id,
        mode=session.mode,
        seed_concept=body.seed_concept,
        quest_target=body.quest_target,
        message=f"Session created! Ready to explore from '{body.seed_concept}'.",
    )


# ---------------------------------------------------------------------------
# GET /api/session/{session_id} — Get session state
# ---------------------------------------------------------------------------
@router.get("/session/{session_id}")
async def get_session_state(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session.to_dict()


# ---------------------------------------------------------------------------
# POST /api/hop — Submit a text hop
# ---------------------------------------------------------------------------
@router.post("/hop", response_model=HopResponse)
async def submit_hop(request: HopRequest):
    """
    Submit a text-based hop. The kid types their connection explanation.
    The engine runs guardrails → Wikipedia grounding → Groq verdict → scoring.
    """
    return await process_hop(request)


# ---------------------------------------------------------------------------
# POST /api/hop/image — Submit an image hop
# ---------------------------------------------------------------------------
@router.post("/hop/image", response_model=HopResponse)
async def submit_image_hop(
    session_id: str = Form(...),
    mode: str = Form("quest"),
    explanation: str = Form(...),
    source_node_id: Optional[str] = Form(None),
    target_node_id: Optional[str] = Form(None),
    image: UploadFile = File(...),
):
    """
    Submit an image hop. The kid snaps a photo; Groq Vision identifies
    the concept, then the reasoning pipeline evaluates the connection.
    """
    image_bytes = await image.read()
    mime_type = image.content_type or "image/jpeg"

    request = HopRequest(
        session_id=session_id,
        mode=mode,
        source_node_id=source_node_id,
        target_node_id=target_node_id,
        explanation=explanation,
    )
    return await process_hop(request, image_bytes=image_bytes, mime_type=mime_type)


# ---------------------------------------------------------------------------
# POST /api/discover — Discover related concepts for a seed node
# ---------------------------------------------------------------------------
@router.post("/discover", response_model=DiscoverResponse)
async def discover_concepts(session_id: str, seed: str):
    """
    Given a seed concept, fetch its Wikipedia summary and generate
    3 related concepts using Groq (or offline fallback).
    Returns a mini-graph to bootstrap the canvas.
    """
    safe, reason = check_input(seed)
    if not safe:
        raise HTTPException(status_code=400, detail=reason)

    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    seed_clean = sanitize_label(seed)
    wiki = await fetch_wiki_summary(seed_clean)

    seed_node = Node(
        id=seed_clean.lower().replace(" ", "_"),
        label=seed_clean.capitalize(),
        category="general",
        description=wiki.get("summary", ""),
        image_url=wiki.get("thumbnail"),
    )

    # Generate 3 related concepts via offline heuristic (fast, no extra API call)
    related_concepts = _get_related_concepts(seed_clean)
    related_nodes: list[Node] = []
    edges: list[Edge] = []

    for concept in related_concepts:
        node_id = concept.lower().replace(" ", "_")
        related_nodes.append(Node(
            id=node_id,
            label=concept.capitalize(),
            category="general",
            description=f"Explore how {concept} connects to {seed_clean}!",
        ))
        edges.append(Edge(
            source=seed_node.id,
            target=node_id,
            relationship=f"{seed_clean} relates to {concept}",
            support="association",
            evidence_urls=[wiki.get("url", "")] if wiki.get("url") else [],
        ))

    return DiscoverResponse(
        session_id=session_id,
        seed_node=seed_node,
        related_nodes=related_nodes,
        edges=edges,
    )


# ---------------------------------------------------------------------------
# Simple offline related-concept heuristic (keeps /discover fast)
# ---------------------------------------------------------------------------
_CONCEPT_MAP = {
    "photosynthesis": ["sunlight", "chlorophyll", "oxygen"],
    "sun": ["solar energy", "photosynthesis", "gravity"],
    "water": ["hydrogen", "rain cycle", "ocean"],
    "gravity": ["black hole", "orbit", "newton"],
    "electricity": ["lightning", "circuits", "battery"],
    "volcano": ["magma", "tectonic plates", "lava"],
    "robot": ["artificial intelligence", "sensors", "automation"],
    "black hole": ["gravity", "event horizon", "light"],
}
_DEFAULT_RELATED = ["energy", "nature", "science"]


def _get_related_concepts(seed: str) -> list[str]:
    return _CONCEPT_MAP.get(seed.lower(), _DEFAULT_RELATED)
