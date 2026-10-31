"""
15-Level Progressive Quest Catalog
==================================
Curated progression from 1-hop everyday observations to 3-hop cosmic science.
Designed specifically for frictionless, frustration-free educational discovery.
"""

from typing import List, Optional
from app.schemas.quest import QuestLevel

QUEST_LEVELS: List[QuestLevel] = [
    # ── Tier 1: Everyday Friends (1 Hop — Any genuine connection succeeds) ──
    QuestLevel(
        level_number=1,
        tier=1,
        tier_name="Everyday Friends",
        title="Flower's Best Friend",
        description="Find anything that visits, helps, or lives near a blooming flower!",
        starting_seed="Flower",
        target_wonder=None,
        emoji="🌸",
        target_emoji=None,
        required_hops=1,
        clues=[
            "What gives a flower a refreshing drink?",
            "What fuzzy insect collects sweet nectar to make honey?",
            "What warms the garden soil from up in the sky?",
        ],
        stars_reward=3,
    ),
    QuestLevel(
        level_number=2,
        tier=1,
        tier_name="Everyday Friends",
        title="Power of the Sun",
        description="What appears, warms up, or changes when the bright sun shines?",
        starting_seed="Sun",
        target_wonder=None,
        emoji="☀️",
        target_emoji=None,
        required_hops=1,
        clues=[
            "What dark shape follows your footsteps on a sunny sidewalk?",
            "What time of day begins when the sun rises?",
            "What feels warm on your face on a clear summer afternoon?",
        ],
        stars_reward=3,
    ),
    QuestLevel(
        level_number=3,
        tier=1,
        tier_name="Everyday Friends",
        title="Wonderful Water",
        description="Where does water go, and what happens when it gets super cold?",
        starting_seed="Water",
        target_wonder=None,
        emoji="💧",
        target_emoji=None,
        required_hops=1,
        clues=[
            "What solid, chilly cube forms in your kitchen freezer?",
            "What creature breathes and swims gracefully underwater?",
            "What falls from grey clouds to fill outdoor puddles?",
        ],
        stars_reward=3,
    ),

    # ── Tier 2: Everyday Bridges (2 Hops — Where Do Things Come From?) ──────
    QuestLevel(
        level_number=4,
        tier=2,
        tier_name="Everyday Bridges",
        title="The Cheese Trail",
        description="Connect a gentle farm cow to a slice of delicious cheese!",
        starting_seed="Cow",
        target_wonder="Cheese",
        emoji="🐄",
        target_emoji="🧀",
        required_hops=2,
        clues=[
            "What healthy white drink does a cow provide every morning?",
            "What do cheesemakers churn from fresh milk to make cheese?",
        ],
        stars_reward=3,
    ),
    QuestLevel(
        level_number=5,
        tier=2,
        tier_name="Everyday Bridges",
        title="From Grain to Bread",
        description="Follow the journey from golden wheat in the field to a warm loaf of bread!",
        starting_seed="Wheat",
        target_wonder="Bread",
        emoji="🌾",
        target_emoji="🍞",
        required_hops=2,
        clues=[
            "What powdery white ingredient is made by grinding wheat grain?",
            "What dough bakes in a hot baker's oven into fluffy bread?",
        ],
        stars_reward=3,
    ),
    QuestLevel(
        level_number=6,
        tier=2,
        tier_name="Everyday Bridges",
        title="The Warm Sweater",
        description="How does a fluffy sheep keep you cozy on a chilly winter day?",
        starting_seed="Sheep",
        target_wonder="Sweater",
        emoji="🐑",
        target_emoji="🧶",
        required_hops=2,
        clues=[
            "What soft, curly coat covers a sheep in the pasture?",
            "What colorful yarn is spun and knitted into a warm winter sweater?",
        ],
        stars_reward=3,
    ),

    # ── Tier 3: Nature & Living Cycles (2 Hops — Transformations) ───────────
    QuestLevel(
        level_number=7,
        tier=3,
        tier_name="Living Cycles",
        title="The Apple's Journey",
        description="Watch a tiny seed grow into a juicy, crunchy red apple!",
        starting_seed="Seed",
        target_wonder="Apple",
        emoji="🌱",
        target_emoji="🍎",
        required_hops=2,
        clues=[
            "What tall plant with green leaves grows when a seed drinks water?",
            "What sweet red fruit ripens on tree branches in autumn?",
        ],
        stars_reward=3,
    ),
    QuestLevel(
        level_number=8,
        tier=3,
        tier_name="Living Cycles",
        title="The Rain Cycle",
        description="How does water from a street puddle float all the way up into a rain cloud?",
        starting_seed="Puddle",
        target_wonder="Rain Cloud",
        emoji="💧",
        target_emoji="🌧️",
        required_hops=2,
        clues=[
            "What invisible warm steam rises into the sky when water evaporates?",
            "What fluffy grey cloud condenses when vapor cools high in the air?",
        ],
        stars_reward=3,
    ),
    QuestLevel(
        level_number=9,
        tier=3,
        tier_name="Living Cycles",
        title="The Butterfly Miracle",
        description="Help a crawling caterpillar transform into a fluttering butterfly!",
        starting_seed="Caterpillar",
        target_wonder="Butterfly",
        emoji="🐛",
        target_emoji="🦋",
        required_hops=2,
        clues=[
            "What cozy silk sleeping bag (chrysalis) protects the caterpillar as it rests?",
            "What beautiful winged insect emerges with vibrant, colorful patterns?",
        ],
        stars_reward=3,
    ),

    # ── Tier 4: Tools & Inventions (2 to 3 Hops — Applying Nature) ──────────
    QuestLevel(
        level_number=10,
        tier=4,
        tier_name="Tools & Inventions",
        title="Bright Sun & Sunglasses",
        description="Connect bright sunshine to the cool sunglasses you wear outdoors!",
        starting_seed="Sunlight",
        target_wonder="Sunglasses",
        emoji="☀️",
        target_emoji="🕶️",
        required_hops=2,
        clues=[
            "What sensitive organs on your face squint when light is too intense?",
            "What tinted dark lenses shield human eyes from direct UV glare?",
        ],
        stars_reward=3,
    ),
    QuestLevel(
        level_number=11,
        tier=4,
        tier_name="Tools & Inventions",
        title="Popcorn Explosion",
        description="Turn a hard little corn kernel into a bowl of crunchy, buttery popcorn!",
        starting_seed="Corn Kernel",
        target_wonder="Popcorn",
        emoji="🌽",
        target_emoji="🍿",
        required_hops=2,
        clues=[
            "What kind of high thermal energy makes trapped moisture inside expand?",
            "What movie theater snack pops inside-out into light, fluffy white bites?",
        ],
        stars_reward=3,
    ),
    QuestLevel(
        level_number=12,
        tier=4,
        tier_name="Tools & Inventions",
        title="Catching the Wind",
        description="Harness invisible air currents to sail across a vast lake!",
        starting_seed="Wind",
        target_wonder="Sailboat",
        emoji="💨",
        target_emoji="⛵",
        required_hops=2,
        clues=[
            "What large, strong cloth catches blowing air on a boat's mast?",
            "What wooden or fiberglass vessel glides smoothly across the water?",
        ],
        stars_reward=3,
    ),

    # ── Tier 5: Science & Big Wonders (3 Hops — Applied & Cosmic Science) ───
    QuestLevel(
        level_number=13,
        tier=5,
        tier_name="Cosmic Science",
        title="Sunlight to Solar Power",
        description="Discover how plants and human engineers both harness the power of light!",
        starting_seed="Leaf",
        target_wonder="Solar Panel",
        emoji="🌿",
        target_emoji="⚡",
        required_hops=3,
        clues=[
            "What star streams radiant light down onto green leaves for photosynthesis?",
            "What form of clean electric energy powers modern lights and calculators?",
            "What dark rooftop panel captures photons and converts them into wattage?",
        ],
        stars_reward=3,
    ),
    QuestLevel(
        level_number=14,
        tier=5,
        tier_name="Cosmic Science",
        title="From Sand to the Stars",
        description="How does ordinary beach sand help astronomers look at distant galaxies?",
        starting_seed="Sand",
        target_wonder="Telescope",
        emoji="🏖️",
        target_emoji="🔭",
        required_hops=3,
        clues=[
            "What clear, smooth material is created by melting silica sand in extreme heat?",
            "What precisely curved glass disc bends and focuses beams of light?",
            "What scientific observatory tube magnifies distant moons and planets?",
        ],
        stars_reward=3,
    ),
    QuestLevel(
        level_number=15,
        tier=5,
        tier_name="Cosmic Science",
        title="Campfire to Constellations",
        description="Connect the flickering sparks of an evening campfire to distant cosmic stars!",
        starting_seed="Campfire",
        target_wonder="Night Stars",
        emoji="🔥",
        target_emoji="✨",
        required_hops=3,
        clues=[
            "What intense thermal energy produces glowing embers and radiant heat?",
            "What fourth state of matter (superheated ionized gas) creates brilliant flames?",
            "What colossal celestial nuclear reactors burn brightly across the universe?",
        ],
        stars_reward=3,
    ),
]


def get_all_quest_levels() -> List[QuestLevel]:
    """Returns the full catalog of 15 progressive quest levels."""
    return QUEST_LEVELS


def get_quest_level(level_number: int) -> Optional[QuestLevel]:
    """Finds a specific quest level by its 1-indexed number."""
    for level in QUEST_LEVELS:
        if level.level_number == level_number:
            return level
    return None
