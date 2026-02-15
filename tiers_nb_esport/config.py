"""Configuration centralisée pour le système matchmaking."""
import os
from typing import List, Dict, Any

# Discord
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
DATABASE_URL = os.getenv("DATABASE_URL")
MATCH_CHANNEL_ID = int(os.getenv("MATCH_CHANNEL_ID", "1434509931360419890"))
LOG_CHANNEL_ID = int(os.getenv("LOG_CHANNEL_ID", "1237166689188053023"))
PING_ROLE_ID = int(os.getenv("PING_ROLE_ID", "1437211411096010862"))

# Matchmaking
QUEUE_TARGET_SIZE = int(os.getenv("QUEUE_TARGET_SIZE", "6"))
DEFAULT_DIVISION = os.getenv("MATCHMAKING_DEFAULT_DIVISION", "solo")
QUEUE_MAX_ELO_DIFF = int(os.getenv("QUEUE_MAX_ELO_DIFF", "200"))

# ELO
K_FACTOR = 30
EMBED_COLOR = 0xC99A2A
QUEUE_OR_1_MIN_ELO = int(os.getenv("QUEUE_OR_1_MIN_ELO", "1500"))

# Rangs (approximation basée sur l'ELO interne)
RANKS = [
    {"name": "Bronze", "min_elo": 0, "emoji": "🟤"},
    {"name": "Argent", "min_elo": 900, "emoji": "⚪"},
    {"name": "Or", "min_elo": 1100, "emoji": "🟡"},
    {"name": "Or 1", "min_elo": QUEUE_OR_1_MIN_ELO, "emoji": "🏅"},
    {"name": "Platine", "min_elo": 1700, "emoji": "💠"},
    {"name": "Diamant", "min_elo": 1900, "emoji": "💎"},
]

# Classement tiers (ratio basé sur le classement global)
TIER_DISTRIBUTION = [
    {"tier": "S", "ratio": 0.005, "minCount": 1},
    {"tier": "A", "ratio": 0.02, "minCount": 1},
    {"tier": "B", "ratio": 0.04, "minCount": 1},
    {"tier": "C", "ratio": 0.10, "minCount": 1},
    {"tier": "D", "ratio": 0.28, "minCount": 1},
    {"tier": "E", "ratio": 0.555, "minCount": 1},
]

# Maps (copier MAP_ROTATION depuis main.py)
MAP_ROTATION: List[Dict[str, Any]] = [
    {
        "mode": "Brawl Ball",
        "emoji": "⚽",
        "maps": [
            "Pinball Dreams",
            "Sneaky Fields",
            "Super Stadium",
        ],
    },
    {
        "mode": "Gem Grab",
        "emoji": "💎",
        "maps": [
            "Crystal Arcade",
            "Hard Rock Mine",
            "Flooded Mine",
        ],
    },
    {
        "mode": "Heist",
        "emoji": "🧨",
        "maps": [
            "Hot Potato",
            "Safe Zone",
            "Bridge Too Far",
        ],
    },
    {
        "mode": "Hot Zone",
        "emoji": "🔥",
        "maps": [
            "Parallel Plays",
            "Split",
            "Dueling Beetles",
        ],
    },
    {
        "mode": "Bounty",
        "emoji": "🎯",
        "maps": [
            "Shooting Star",
            "Canal Grande",
            "Dry Season",
        ],
    },
    {
        "mode": "Knockout",
        "emoji": "💥",
        "maps": [
            "Belle's Rock",
            "Out in the Open",
            "Goldarm Gulch",
        ],
    },
]
