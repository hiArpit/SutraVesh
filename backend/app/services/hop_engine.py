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
    vision_what_is_it: Optional[str] = None
    vision_fun_fact: Optional[str] = None
    vision_try_this: Optional[str] = None
    vision_grade_level: Optional[str] = "Grade 1.3"

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
        vision_what_is_it = vision_result.get("what_is_it")
        vision_fun_fact = vision_result.get("fun_fact")
        vision_try_this = vision_result.get("try_this")
        vision_grade_level = vision_result.get("grade_level", "Grade 1.3")

    # Determine concept
    new_concept = detected_object or request.target_node_id or (
        request.explanation.strip() if request.explanation else "Wonder"
    )
    source_concept = request.source_node_id or session.current_node_id

    # If text hop, provide educational discovery copy
    if not vision_what_is_it:
        vision_what_is_it = f"A {new_concept} is an intriguing part of our everyday world."
        vision_fun_fact = f"Every {new_concept} has special links to science, nature, and human inventions!"
        vision_try_this = f"Notice where you see or use a {new_concept} today."
        vision_grade_level = "Grade 1.3"

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
    connected_wonders: List[str] = hop_result.get("connected_wonders", [])
    connection_rule: Optional[str] = hop_result.get("connection_rule", None)
    bridges: List[str] = hop_result.get("resonance_bridges", [])
    evidence_urls: List[str] = hop_result.get("evidence_urls", [])

    # 4. Multi-Discovery Scoring
    # If in World Mode and no prior wonder connects and no bridges, it's an independent new wonder island (+25 pts)
    is_independent_wonder = (request.mode == "world" and len(connected_wonders) == 0 and len(bridges) == 0)
    base_points = 25 if is_independent_wonder else POINTS[verdict]
    resonance_count = max(len(bridges), max(0, len(connected_wonders) - 1))
    resonance_points = 0

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
            what_is_it=vision_what_is_it,
            fun_fact=vision_fun_fact,
            try_this=vision_try_this,
            grade_level=vision_grade_level,
            image_url=wiki.get("thumbnail"),
        )

        support_type: EdgeSupport = "established" if verdict == "established" else "association"

        # In Quest mode: connect to source
        if request.mode == "quest":
            new_edges.append(Edge(
                source=source_concept.lower().replace(" ", "_"),
                target=node_id,
                relationship=active_explanation,
                support=support_type,
                evidence_urls=evidence_urls,
                connection_rule=connection_rule,
            ))
            for wonder in connected_wonders:
                wonder_id = wonder.lower().replace(" ", "_")
                if wonder_id != source_concept.lower().replace(" ", "_") and wonder_id != node_id:
                    new_edges.append(Edge(
                        source=wonder_id,
                        target=node_id,
                        relationship=f"Resonance connection with {wonder}",
                        support="resonance",
                        evidence_urls=[],
                        connection_rule=connection_rule,
                    ))
        else:
            # In World mode: connect to each connected wonder (or source if bridges exist)
            targets_to_connect = connected_wonders if len(connected_wonders) > 0 else ([source_concept] if len(bridges) > 0 else [])
            for wonder in targets_to_connect:
                wonder_id = wonder.lower().replace(" ", "_")
                if wonder_id != node_id:
                    new_edges.append(Edge(
                        source=wonder_id,
                        target=node_id,
                        relationship=active_explanation if wonder == targets_to_connect[0] else f"Resonance connection with {wonder}",
                        support=support_type if wonder == targets_to_connect[0] else "resonance",
                        evidence_urls=evidence_urls if wonder == targets_to_connect[0] else [],
                        connection_rule=connection_rule,
                    ))
            for b in bridges:
                b_id = b.lower().replace(" ", "_")
                if b_id != node_id and all(e.source != b_id for e in new_edges):
                    new_edges.append(Edge(
                        source=b_id,
                        target=node_id,
                        relationship=f"Resonance bridge with {b}",
                        support="resonance",
                        evidence_urls=[],
                        connection_rule=connection_rule,
                    ))

        session.nodes.append(new_node)
        session.edges.extend(new_edges)
        session.current_node_id = node_id

    # 6. Badges
    new_badges = _evaluate_badges(session, verdict, resonance_count, request.mode)

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
        what_is_it=vision_what_is_it,
        fun_fact=vision_fun_fact,
        try_this=vision_try_this,
        grade_level=vision_grade_level,
        connection_rule=connection_rule,
        new_node=new_node,
        new_edges=new_edges,
        resonance_count=resonance_count,
        resonance_points=resonance_points,
        points_awarded=base_points + resonance_points,
        total_points=session.total_points,
        badges_unlocked=new_badges,
        completed=completed,
        eureka_graph=eureka_graph,
        new_island_created=is_independent_wonder,
    )


def _evaluate_badges(session: GameSession, verdict: str = "", resonance_count: int = 0, mode: str = "quest") -> List[str]:
    new = []

    def award(key: str):
        if key not in session.badges:
            session.badges.append(key)
            new.append(BADGE_DEFS[key])

    if session.hops_taken == 1:
        award("first_hop")
    if session.hops_taken >= 5:
        award("chain_master")
    if session.consecutive_established >= 3:
        award("einstein")
    if resonance_count >= 1:
        award("bridge_builder")
    if len(session.nodes) >= 6:
        award("world_explorer")

    return new


def _infer_category(concept: str) -> str:
    c = concept.lower()
    if any(k in c for k in ["cell", "leaf", "plant", "organism", "tree", "flower", "photosynthesis", "bee"]):
        return "biology"
    if any(k in c for k in ["planet", "star", "sun", "space", "orbit", "galaxy", "black hole"]):
        return "astronomy"
    if any(k in c for k in ["energy", "light", "wave", "atom", "gravity", "electron", "physics"]):
        return "physics"
    if any(k in c for k in ["molecule", "acid", "reaction", "water", "hydrogen", "chemistry"]):
        return "chemistry"
    if any(k in c for k in ["computer", "code", "ai", "sensor", "robot", "network", "technology"]):
        return "technology"
    return "general"


def _error_response(message: str) -> HopResponse:
    return HopResponse(
        valid=False,
        verdict="rejected",
        reason=message,
        points_awarded=0,
        total_points=0,
    )
