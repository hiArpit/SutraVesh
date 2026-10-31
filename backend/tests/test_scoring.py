"""
Unit tests for scoring rules, badges, and graph schemas.
Pure synchronous unit tests with zero network or database dependencies.
"""
import pytest
from app.schemas.graph import Node, Edge, HopRequest, HopResponse, EurekaGraph
from app.core.session import create_session
from app.services.hop_engine import POINTS, RESONANCE_BONUS, SPEED_BONUS, _evaluate_badges


def test_scoring_constants():
    """Verify standard game scoring rules and points scale."""
    assert POINTS["established"] == 50
    assert POINTS["association"] == 30
    assert POINTS["rejected"] == 0
    assert RESONANCE_BONUS == 15
    assert SPEED_BONUS == 20


def test_node_schema_creation_and_defaults():
    """Verify Node schema validates correctly with kid discovery fields."""
    node = Node(
        id="book_1",
        label="Book",
        category="objects",
        what_is_it="A book has pages with words to read.",
        fun_fact="Books used to be made of tree bark!",
        try_this="Flip the pages quickly to feel the breeze.",
    )
    assert node.id == "book_1"
    assert node.label == "Book"
    assert node.grade_level == "Grade 1.3"
    assert "pages" in node.what_is_it


def test_edge_schema_and_connection_rules():
    """Verify Edge schema supports connection rule categories."""
    edge = Edge(
        source="tree",
        target="paper",
        relationship="Paper is made from wood fibers from trees.",
        support="established",
        connection_rule="Material"
    )
    assert edge.source == "tree"
    assert edge.target == "paper"
    assert edge.connection_rule == "Material"
    assert edge.support == "established"


def test_hop_response_scoring_and_resonance():
    """Verify HopResponse points accounting and resonance bonus calculation."""
    # Example: 1 established link (50) + 2 resonance connections (2 * 15 = 30) = 80
    base_points = POINTS["established"]
    resonance_count = 2
    resonance_points = resonance_count * RESONANCE_BONUS
    points_awarded = base_points + resonance_points

    response = HopResponse(
        valid=True,
        verdict="established",
        reason="Paper comes directly from trees.",
        detected_object="Paper",
        points_awarded=points_awarded,
        resonance_count=resonance_count,
        resonance_points=resonance_points,
        total_points=points_awarded,
    )

    assert response.points_awarded == 80
    assert response.resonance_points == 30
    assert response.total_points == 80
    assert response.valid is True


def test_badges_evaluation_thresholds():
    """Verify unlocked badges based on score and hops."""
    session = create_session("quest", "seed", "target")
    session.hops_taken = 1
    badges_first = _evaluate_badges(session, verdict="established")
    assert "First Hop!" in badges_first

    session.hops_taken = 5
    badges_chain = _evaluate_badges(session, verdict="established")
    assert "Chain Master" in badges_chain
