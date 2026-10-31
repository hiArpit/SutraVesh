"""
Hop Engine
==========
The brain of SutraVesh. Orchestrates the full pipeline for every hop:

  1. Guardrails check on kid's explanation
  2. Groq Vision (if image provided) → concept label
  3. Guardrails check on detected label
  4. Wikipedia evidence fetch + Groq Reasoning → verdict
  5. Scoring  (established=50pts, association=30pts, rejected=0pts)
  6. Resonance bonus  (+15pts per bridge in World Mode)
  7. Badge evaluation
  8. Quest completion check (Quest Mode)
  9. Eureka graph assembly (on quest victory)
 10. World Mode island detection (disconnected concept clusters)

Returns a fully populated HopResponse.
"""

from typing import Optional
from app.schemas.graph import (
    HopRequest, HopResponse, Node, Edge, EurekaGraph,
    HopVerdict, EdgeSupport,
)
from app.core.guardrails import check_input, sanitize_label
from app.core.session import GameSession, get_session, update_session
from app.services.groq_service import evaluate_hop, identify_concept_from_image
from app.services.wiki_service import fetch_wiki_summary


# ---------------------------------------------------------------------------
# Scoring constants
# ---------------------------------------------------------------------------
POINTS = {"established": 50, "association": 30, "rejected": 0}
RESONANCE_BONUS = 15   # per extra bridge in World Mode
SPEED_BONUS = 10       # when quest is completed in fewer hops than nodes

# ---------------------------------------------------------------------------
# Badge definitions: (id, label, condition_description)
# ---------------------------------------------------------------------------
BADGE_DEFS = {
    "first_hop":       "First Hop!",
    "chain_master":    "Chain Master",
    "einstein":        "Einstein Mode",
    "bridge_builder":  "Bridge Builder",
    "world_explorer":  "World Explorer",
    "speed_runner":    "Speed Runner",
    "wiki_grounded":   "Evidence Hunter",
}


# ---------------------------------------------------------------------------
# Main engine entry point
# ---------------------------------------------------------------------------
async def process_hop(
    request: HopRequest,
    image_bytes: Optional[bytes] = None,
    mime_type: str = "image/jpeg",
) -> HopResponse:
    """
    Process a single hop from the frontend and return a HopResponse.
    Session must already exist (created via /api/session).
    """
    session = get_session(request.session_id)
    if not session:
        return _error_response("Session not found. Please start a new game!")

    # ------------------------------------------------------------------
    # 1. Guardrails on the kid's explanation
    # ------------------------------------------------------------------
    safe, reason = check_input(request.explanation)
    if not safe:
        return HopResponse(
            valid=False,
            verdict="rejected",
            reason=reason,
            total_points=session.total_points,
            badges_unlocked=session.badges,
        )

    # ------------------------------------------------------------------
    # 2. Vision — detect concept from image (optional)
    # ------------------------------------------------------------------
    detected_object: Optional[str] = None
    if image_bytes:
        vision_result = await identify_concept_from_image(image_bytes, mime_type)
        raw_label = vision_result.get("concept", "")
        safe_label, label_reason = check_input(raw_label)
        if not safe_label:
            return HopResponse(
                valid=False,
                verdict="rejected",
                reason=f"Image detected something inappropriate: {label_reason}",
                total_points=session.total_points,
                badges_unlocked=session.badges,
            )
        detected_object = sanitize_label(raw_label)

    # Determine the concept being connected
    new_concept = detected_object or request.target_node_id or request.explanation.strip()
    source_concept = request.source_node_id or session.current_node_id

    # ------------------------------------------------------------------
    # 3. Wikipedia + Groq Reasoning — evaluate the connection
    # ------------------------------------------------------------------
    hop_result = await evaluate_hop(
        source=source_concept,
        target=new_concept,
        explanation=request.explanation,
        mode=request.mode,
    )

    verdict: HopVerdict = hop_result["verdict"]
    reason_text: str = hop_result["reason"]
    bridges: list[str] = hop_result.get("resonance_bridges", [])
    evidence_urls: list[str] = hop_result.get("evidence_urls", [])

    # ------------------------------------------------------------------
    # 4. Scoring
    # ------------------------------------------------------------------
    base_points = POINTS[verdict]
    resonance_points = 0
    resonance_count = 0
    new_island_created = False

    if verdict != "rejected":
        session.hops_taken += 1

        # Resonance bonus (World Mode only)
        if request.mode == "world" and bridges:
            resonance_count = len(bridges)
            resonance_points = resonance_count * RESONANCE_BONUS

        session.total_points += base_points + resonance_points

        # Consecutive established tracker (Einstein badge)
        if verdict == "established":
            session.consecutive_established += 1
            session.hops_saved += 1
        else:
            session.consecutive_established = 0

    # ------------------------------------------------------------------
    # 5. Build new Node + Edges for the canvas
    # ------------------------------------------------------------------
    new_node: Optional[Node] = None
    new_edges: list[Edge] = []

    if verdict != "rejected":
        # Fetch Wikipedia info for the new concept node
        wiki = await fetch_wiki_summary(new_concept)
        node_id = new_concept.lower().replace(" ", "_")

        new_node = Node(
            id=node_id,
            label=new_concept.capitalize(),
            category=_infer_category(new_concept),
            description=wiki.get("summary", ""),
            island_id=_assign_island(session, request.mode, bridges),
            image_url=wiki.get("thumbnail"),
        )

        # Primary edge: source → new concept
        primary_support: EdgeSupport = (
            "established" if verdict == "established"
            else "association"
        )
        new_edges.append(Edge(
            source=source_concept,
            target=node_id,
            relationship=request.explanation,
            support=primary_support,
            evidence_urls=evidence_urls,
        ))

        # Resonance edges (World Mode bridges)
        for bridge in bridges:
            bridge_id = bridge.lower().replace(" ", "_")
            new_edges.append(Edge(
                source=node_id,
                target=bridge_id,
                relationship=f"{new_concept} resonates with {bridge}",
                support="resonance",
                evidence_urls=[],
            ))

        # World Mode: check if island was created
        if request.mode == "world" and not bridges:
            session.island_count += 1
            new_island_created = session.island_count > 1

        # Update session canvas
        session.nodes.append(new_node)
        session.edges.extend(new_edges)
        session.current_node_id = node_id

    # ------------------------------------------------------------------
    # 6. Badge evaluation
    # ------------------------------------------------------------------
    new_badges = _evaluate_badges(session, verdict, resonance_count, request.mode)

    # ------------------------------------------------------------------
    # 7. Quest completion check (Quest Mode)
    # ------------------------------------------------------------------
    completed = False
    eureka_graph: Optional[EurekaGraph] = None

    if (
        request.mode == "quest"
        and session.quest_target
        and verdict != "rejected"
    ):
        target_id = session.quest_target.lower().replace(" ", "_")
        current_id = session.current_node_id
        if current_id == target_id or new_concept.lower() == session.quest_target.lower():
            completed = True
            session.completed = True

            # Speed bonus
            if session.hops_taken <= len(session.nodes):
                session.total_points += SPEED_BONUS
                if "speed_runner" not in session.badges:
                    session.badges.append("speed_runner")
                    new_badges.append(BADGE_DEFS["speed_runner"])

            eureka_graph = EurekaGraph(
                nodes=session.nodes,
                edges=session.edges,
                quest_title=f"{session.nodes[0].label if session.nodes else source_concept} → {session.quest_target}",
                target_concept=session.quest_target,
                hops_taken=session.hops_taken,
                hops_saved=session.hops_saved,
                total_bonus_points=session.total_points,
            )

    # ------------------------------------------------------------------
    # 8. Persist session
    # ------------------------------------------------------------------
    update_session(session)

    return HopResponse(
        valid=verdict != "rejected",
        verdict=verdict,
        reason=reason_text,
        detected_object=detected_object,
        new_node=new_node,
        new_edges=new_edges,
        resonance_count=resonance_count,
        resonance_points=resonance_points,
        points_awarded=base_points + resonance_points,
        total_points=session.total_points,
        badges_unlocked=new_badges,
        completed=completed,
        eureka_graph=eureka_graph,
        new_island_created=new_island_created,
    )


# ---------------------------------------------------------------------------
# Badge evaluator
# ---------------------------------------------------------------------------
def _evaluate_badges(
    session: GameSession,
    verdict: str,
    resonance_count: int,
    mode: str,
) -> list[str]:
    """Check and unlock new badges. Returns list of newly unlocked badge labels."""
    newly_unlocked = []

    def unlock(key: str):
        if key not in session.badges:
            session.badges.append(key)
            newly_unlocked.append(BADGE_DEFS[key])

    if session.hops_taken == 1:
        unlock("first_hop")

    if session.hops_taken >= 5:
        unlock("chain_master")

    if session.consecutive_established >= 3:
        unlock("einstein")

    if resonance_count > 0:
        unlock("bridge_builder")

    if mode == "world" and session.island_count >= 2:
        unlock("world_explorer")

    return newly_unlocked


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _infer_category(concept: str) -> str:
    """Simple keyword-based category inference."""
    c = concept.lower()
    if any(w in c for w in ["plant", "animal", "bio", "cell", "photosyn", "ecosystem"]):
        return "biology"
    if any(w in c for w in ["sun", "star", "planet", "orbit", "space", "galaxy", "black hole"]):
        return "astronomy"
    if any(w in c for w in ["energy", "force", "gravity", "wave", "light", "heat", "electric"]):
        return "physics"
    if any(w in c for w in ["water", "acid", "molecule", "atom", "element", "chemical"]):
        return "chemistry"
    if any(w in c for w in ["robot", "computer", "ai", "code", "software", "internet"]):
        return "technology"
    return "general"


def _assign_island(session: GameSession, mode: str, bridges: list) -> Optional[str]:
    """Assign an island_id for World Mode disconnected clusters."""
    if mode != "world":
        return None
    if not session.nodes or bridges:
        return f"island_{session.island_count + 1}"
    return session.nodes[-1].island_id if session.nodes else "island_1"


def _error_response(msg: str) -> HopResponse:
    return HopResponse(
        valid=False,
        verdict="rejected",
        reason=msg,
        total_points=0,
        badges_unlocked=[],
    )
