"""
Hop Engine
==========
Multi-discovery comparison scoring engine.
Compares each new capture against all previously discovered wonders on the canvas.
"""

from typing import Optional, List
from app.schemas.graph import (
    HopRequest, HopResponse, Node, Edge, EurekaGraph,
    HopVerdict, EdgeSupport,
)
from app.core.guardrails import check_input, sanitize_label
from app.core.session import GameSession, get_session, update_session
from app.services.groq_service import evaluate_hop, identify_concept_from_image
from app.services.wiki_service import fetch_wiki_summary

POINTS = {"established": 50, "association": 30, "rejected": 0}
RESONANCE_BONUS = 15
SPEED_BONUS = 20

BADGE_DEFS = {
    "first_hop":       "First Hop!",
    "chain_master":    "Chain Master",
    "einstein":        "Einstein Mode",
    "bridge_builder":  "Bridge Builder",
    "world_explorer":  "World Explorer",
    "speed_runner":    "Speed Runner",
}


async def process_hop(
    request: HopRequest,
    image_bytes: Optional[bytes] = None,
    mime_type: str = "image/jpeg",
) -> HopResponse:
    session = get_session(request.session_id)
    if not session:
        return _error_response("Session not found. Please start a new game!")

    # 1. Guardrails check
    if request.explanation and request.explanation.strip():
        safe, reason = check_input(request.explanation)
        if not safe:
            return HopResponse(
                valid=False,
                verdict="rejected",
                reason=reason,
                total_points=session.total_points,
                badges_unlocked=session.badges,
            )

    # 2. Vision detection if photo uploaded
    detected_object: Optional[str] = None
    detected_description: Optional[str] = None
    if image_bytes:
        vision_result = await identify_concept_from_image(image_bytes, mime_type)
        raw_label = vision_result.get("concept", "")
        safe_label, label_reason = check_input(raw_label)
        if not safe_label:
            return HopResponse(
                valid=False,
                verdict="rejected",
                reason=f"Photo detected something inappropriate: {label_reason}",
                total_points=session.total_points,
                badges_unlocked=session.badges,
            )
        detected_object = sanitize_label(raw_label)
        detected_description = vision_result.get("description", "")

    # Determine concept
    new_concept = detected_object or request.target_node_id or (
        request.explanation.strip() if request.explanation else "Wonder"
    )
    source_concept = request.source_node_id or session.current_node_id

    # Collect all prior discovered wonders on this session's canvas
    prior_wonders = [n.label for n in session.nodes] if session.nodes else [source_concept]

    # Active explanation
    active_explanation = (
        request.explanation.strip()
        if (request.explanation and request.explanation.strip())
        else f"Discovered {new_concept} in the surrounding world."
    )

    # 3. Multi-Discovery comparison evaluation via Groq + Wikipedia
    hop_result = await evaluate_hop(
        source=source_concept,
        target=new_concept,
        explanation=active_explanation,
        mode=request.mode,
        prior_wonders=prior_wonders,
    )

    verdict: HopVerdict = hop_result["verdict"]
    reason_text: str = hop_result["reason"]
    connected_wonders: List[str] = hop_result.get("connected_wonders", [source_concept])
    bridges: List[str] = hop_result.get("resonance_bridges", [])
    evidence_urls: List[str] = hop_result.get("evidence_urls", [])

    # 4. Multi-Discovery Scoring
    base_points = POINTS[verdict]
    resonance_points = 0
    resonance_count = max(len(bridges), max(0, len(connected_wonders) - 1))

    if verdict != "rejected":
        session.hops_taken += 1
        if resonance_count > 0:
            resonance_points = resonance_count * RESONANCE_BONUS

        session.total_points += base_points + resonance_points

        if verdict == "established":
            session.consecutive_established += 1
            session.hops_saved += 1
        else:
            session.consecutive_established = 0

    # 5. Build New Node & Edges across the canvas
    new_node: Optional[Node] = None
    new_edges: List[Edge] = []

    if verdict != "rejected":
        wiki = await fetch_wiki_summary(new_concept)
        node_id = new_concept.lower().replace(" ", "_")

        new_node = Node(
            id=node_id,
            label=new_concept.capitalize(),
            category=_infer_category(new_concept),
            description=detected_description or wiki.get("summary", ""),
            image_url=wiki.get("thumbnail"),
        )

        support_type: EdgeSupport = "established" if verdict == "established" else "association"

        # Connect to primary source
        new_edges.append(Edge(
            source=source_concept.lower().replace(" ", "_"),
            target=node_id,
            relationship=active_explanation,
            support=support_type,
            evidence_urls=evidence_urls,
        ))

        # Connect to other resonant wonders discovered on the trail
        for wonder in connected_wonders:
            wonder_id = wonder.lower().replace(" ", "_")
            if wonder_id != source_concept.lower().replace(" ", "_") and wonder_id != node_id:
                new_edges.append(Edge(
                    source=wonder_id,
                    target=node_id,
                    relationship=f"Resonance connection with {wonder}",
                    support="resonance",
                    evidence_urls=[],
                ))

        session.nodes.append(new_node)
        session.edges.extend(new_edges)
        session.current_node_id = node_id

    # 6. Badges
    new_badges = _evaluate_badges(session, resonance_count)

    # 7. Quest Goal Completion check
    completed = False
    eureka_graph: Optional[EurekaGraph] = None

    if session.quest_target and verdict != "rejected":
        target_clean = session.quest_target.lower().replace(" ", "_")
        new_clean = new_concept.lower().replace(" ", "_")
        if new_clean == target_clean or session.current_node_id == target_clean:
            completed = True
            session.completed = True
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

    update_session(session)

    return HopResponse(
        valid=verdict != "rejected",
        verdict=verdict,
        reason=reason_text,
        detected_object=detected_object,
        detected_description=detected_description or (new_node.description if new_node else None),
        new_node=new_node,
        new_edges=new_edges,
        resonance_count=resonance_count,
        resonance_points=resonance_points,
        points_awarded=base_points + resonance_points,
        total_points=session.total_points,
        badges_unlocked=new_badges,
        completed=completed,
        eureka_graph=eureka_graph,
        new_island_created=False,
    )


def _evaluate_badges(
    session: GameSession,
    verdict: str = "association",
    resonance_count: int = 0,
    mode: str = "quest"
) -> list[str]:
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
    if len(session.nodes) >= 4:
        unlock("world_explorer")

    return newly_unlocked


def _infer_category(concept: str) -> str:
    c = concept.lower()
    if any(w in c for w in ["plant", "animal", "bio", "cell", "photosyn", "ecosystem", "leaf"]):
        return "biology"
    if any(w in c for w in ["sun", "star", "planet", "orbit", "space", "galaxy", "black hole", "moon"]):
        return "astronomy"
    if any(w in c for w in ["energy", "force", "gravity", "wave", "light", "heat", "electric", "solar"]):
        return "physics"
    if any(w in c for w in ["water", "acid", "molecule", "atom", "element", "chemical"]):
        return "chemistry"
    if any(w in c for w in ["robot", "computer", "ai", "code", "software", "panel", "car"]):
        return "technology"
    return "general"


def _error_response(msg: str) -> HopResponse:
    return HopResponse(
        valid=False,
        verdict="rejected",
        reason=msg,
        total_points=0,
        badges_unlocked=[],
    )
