"""Gestion de la base de données PostgreSQL pour le matchmaking PrissLeague."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Tuple
from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor

from . import config


@dataclass
class Player:
    discord_id: int
    name: str
    solo_elo: int
    solo_wins: int
    solo_losses: int
    division: str

    @classmethod
    def from_row(cls, row: Dict) -> "Player":
        return cls(
            discord_id=int(row["discord_id"]),
            name=row.get("name") or f"Joueur {row['discord_id']}",
            solo_elo=int(row.get("solo_elo", 0)),
            solo_wins=int(row.get("solo_wins", 0)),
            solo_losses=int(row.get("solo_losses", 0)),
            division=row.get("division") or config.DEFAULT_DIVISION,
        )


@contextmanager
def get_connection():
    if not config.DATABASE_URL:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    conn = psycopg2.connect(config.DATABASE_URL, cursor_factory=RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS players (
                    discord_id BIGINT PRIMARY KEY,
                    name TEXT,
                    solo_elo INTEGER NOT NULL DEFAULT 1000,
                    solo_wins INTEGER NOT NULL DEFAULT 0,
                    solo_losses INTEGER NOT NULL DEFAULT 0,
                    division TEXT NOT NULL DEFAULT %s,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """,
                (config.DEFAULT_DIVISION,),
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS matches (
                    id SERIAL PRIMARY KEY,
                    map_mode TEXT NOT NULL,
                    map_name TEXT NOT NULL,
                    map_emoji TEXT,
                    team1_ids BIGINT[] NOT NULL,
                    team2_ids BIGINT[] NOT NULL,
                    team1_score INTEGER NOT NULL DEFAULT 0,
                    team2_score INTEGER NOT NULL DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'pending',
                    winner TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    completed_at TIMESTAMPTZ
                )
                """,
            )
            cur.execute(
                """
                ALTER TABLE matches
                ADD COLUMN IF NOT EXISTS team1_score INTEGER NOT NULL DEFAULT 0
                """
            )
            cur.execute(
                """
                ALTER TABLE matches
                ADD COLUMN IF NOT EXISTS team2_score INTEGER NOT NULL DEFAULT 0
                """
            )


def ensure_player(discord_id: int, name: Optional[str], division: Optional[str] = None) -> Player:
    division = division or config.DEFAULT_DIVISION
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO players (discord_id, name, division)
                VALUES (%s, %s, %s)
                ON CONFLICT (discord_id) DO UPDATE
                SET name = EXCLUDED.name,
                    division = EXCLUDED.division,
                    updated_at = NOW()
                RETURNING *
                """,
                (discord_id, name, division),
            )
            row = cur.fetchone()
            return Player.from_row(row)


def fetch_players(discord_ids: Iterable[int]) -> Dict[int, Player]:
    ids = list({int(i) for i in discord_ids})
    if not ids:
        return {}
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM players
                WHERE discord_id = ANY(%s)
                """,
                (ids,),
            )
            return {int(row["discord_id"]): Player.from_row(row) for row in cur.fetchall()}


def fetch_player(discord_id: int) -> Optional[Player]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM players
                WHERE discord_id = %s
                """,
                (discord_id,),
            )
            row = cur.fetchone()
            return Player.from_row(row) if row else None


def fetch_leaderboard(limit: int = 10) -> Tuple[List[Player], int]:
    limit = max(1, int(limit))
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *, COUNT(*) OVER() AS total_players
                FROM players
                ORDER BY solo_elo DESC, solo_wins DESC, solo_losses ASC, name ASC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()
    if not rows:
        return [], 0
    total_players = int(rows[0].get("total_players", 0))
    players = [Player.from_row(row) for row in rows]
    return players, total_players


def record_match(team1_ids: List[int], team2_ids: List[int], map_info: Dict[str, str]) -> Dict:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO matches (map_mode, map_name, map_emoji, team1_ids, team2_ids)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    map_info.get("mode"),
                    map_info.get("map"),
                    map_info.get("emoji"),
                    team1_ids,
                    team2_ids,
                ),
            )
            return cur.fetchone()


def load_match(match_id: int) -> Optional[Dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM matches
                WHERE id = %s
                """,
                (match_id,),
            )
            return cur.fetchone()


def record_game_result(match_id: int, winner_label: str) -> Optional[Dict]:
    column = "team1_score" if winner_label == "bleue" else "team2_score"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE matches
                SET {column} = {column} + 1
                WHERE id = %s AND status = 'pending'
                RETURNING *
                """,
                (match_id,),
            )
            return cur.fetchone()


def update_match_series_score(
    match_id: int, team1_score: int, team2_score: int
) -> Optional[Dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE matches
                SET team1_score = %s,
                    team2_score = %s
                WHERE id = %s AND status = 'pending'
                RETURNING *
                """,
                (team1_score, team2_score, match_id),
            )
            return cur.fetchone()


def complete_match(match_id: int, winner_label: str) -> Optional[Dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE matches
                SET status = 'completed',
                    winner = %s,
                    completed_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (winner_label, match_id),
            )
            return cur.fetchone()


def cancel_match(match_id: int) -> Optional[Dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE matches
                SET status = 'cancelled',
                    completed_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (match_id,),
            )
            return cur.fetchone()


def player_has_pending_match(discord_id: int) -> bool:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1
                FROM matches
                WHERE status = 'pending'
                  AND (%s = ANY(team1_ids) OR %s = ANY(team2_ids))
                LIMIT 1
                """,
                (discord_id, discord_id),
            )
            return cur.fetchone() is not None


def apply_player_updates(updates: Iterable[Dict[str, int]]) -> None:
    updates = list(updates)
    if not updates:
        return
    with get_connection() as conn:
        with conn.cursor() as cur:
            for update in updates:
                cur.execute(
                    """
                    UPDATE players
                    SET solo_elo = %s,
                        solo_wins = %s,
                        solo_losses = %s,
                        updated_at = NOW()
                    WHERE discord_id = %s
                    """,
                    (
                        int(update["solo_elo"]),
                        int(update["solo_wins"]),
                        int(update["solo_losses"]),
                        int(update["discord_id"]),
                    ),
                )
