from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, Field

# Dual-Mode indicator: 'quest' (Chain Hunt to target) or 'world' (Open Sandbox with islands)
PlayMode = Literal['quest', 'world']

# Relationship support classification
EdgeSupport = Literal['established', 'association', 'resonance']

# Verdict options for hop evaluation
HopVerdict = Literal['established', 'association', 'rejected']


class Node(BaseModel):
    id: str = Field(..., description="Unique node identifier, e.g., 'leaf' or 'node_123'")
    label: str = Field(..., description="Human-readable concept name")
    category: str = Field(default="general", description="Concept category (e.g. biology, energy, technology, island_spark)")
    description: str = Field(default="", description="Brief explanation or visual summary")
    what_is_it: Optional[str] = Field(default="", description="1-2 simple kid sentences describing what it is")
    fun_fact: Optional[str] = Field(default="", description="Playful, memorable kid science fact")
    try_this: Optional[str] = Field(default="", description="Sensory exploration challenge or observation")
    grade_level: Optional[str] = Field(default="Grade 1.3", description="Grade or exploration tier")
    island_id: Optional[str] = Field(default=None, description="Identifies disconnected clusters in World Mode")
    image_url: Optional[str] = Field(default=None, description="Optional preview thumbnail")


class Edge(BaseModel):
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    relationship: str = Field(..., description="One-sentence connection explanation")
    support: EdgeSupport = Field(default="association", description="Level of grounding / resonance")
    evidence_urls: List[str] = Field(default_factory=list, description="Wikipedia or grounding evidence links")
    connection_rule: Optional[str] = Field(default=None, description="Bond rule: Material, Purpose, Energy, or Habitat")


class HopRequest(BaseModel):
    session_id: str = Field(..., description="Active game session ID")
    mode: PlayMode = Field(default='quest', description="Game mode: quest or world")
    quest_id: Optional[str] = Field(default=None, description="Quest ID when in quest mode")
    source_node_id: Optional[str] = Field(default=None, description="Current node to hop from")
    target_node_id: Optional[str] = Field(default=None, description="Goal target node in quest mode")
    explanation: Optional[str] = Field(default=None, description="Optional kid's connection explanation")


class EurekaGraph(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    quest_title: str
    target_concept: str
    hops_taken: int
    hops_saved: int
    total_bonus_points: int


class HopResponse(BaseModel):
    valid: bool = Field(..., description="Whether the hop was accepted")
    verdict: HopVerdict = Field(..., description="Verdict: established, association, or rejected")
    reason: str = Field(..., description="Friendly explanation for feedback")
    detected_object: Optional[str] = Field(default=None, description="Concept identified by Groq vision")
    detected_description: Optional[str] = Field(default=None, description="Kid-friendly educational description of detected object")
    what_is_it: Optional[str] = Field(default=None, description="1-2 sentences on what it is for discovery card")
    fun_fact: Optional[str] = Field(default=None, description="Fun memorable science fact for discovery card")
    try_this: Optional[str] = Field(default=None, description="Interactive observation challenge for discovery card")
    grade_level: Optional[str] = Field(default="Grade 1.3", description="Grade or exploration level tag")
    connection_rule: Optional[str] = Field(default=None, description="Identified connection rule category")
    new_node: Optional[Node] = Field(default=None, description="Constructed node for the new concept")
    new_edges: List[Edge] = Field(default_factory=list, description="Edges linking new node to canvas")
    resonance_count: int = Field(default=0, description="Count of resonance links in World Mode")
    resonance_points: int = Field(default=0, description="Resonance bonus points (+15 per extra edge)")
    points_awarded: int = Field(default=0, description="Points earned on this hop")
    total_points: int = Field(default=0, description="Updated total player score")
    badges_unlocked: List[str] = Field(default_factory=list, description="Badges earned so far")
    completed: bool = Field(default=False, description="True if target node reached in Quest Mode")
    eureka_graph: Optional[EurekaGraph] = Field(default=None, description="Complete Eureka card graph data on quest victory")
    new_island_created: bool = Field(default=False, description="True if World Mode created a Divergent Island")


class DiscoverResponse(BaseModel):
    session_id: str
    seed_node: Node
    related_nodes: List[Node]
    edges: List[Edge]
