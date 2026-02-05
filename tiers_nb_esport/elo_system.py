"""Logique ELO et finalisation de match pour le matchmaking PrissLeague."""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import discord

from . import config
from .database import Player


def calculate_elo_change(player_elo: float, opponent_avg_elo: float, won: bool) -> int:
    """Calcul changement ELO avec formule existante (K=30)."""
    expected_score = 1 / (1 + 10 ** ((opponent_avg_elo - player_elo) / 400))
    actual_score = 1.0 if won else 0.0
    change = round(config.K_FACTOR * (actual_score - expected_score))
    return int(change)


def get_rank_for_elo(elo: int) -> Dict[str, object]:
    rank = config.RANKS[0]
    for candidate in config.RANKS:
        if elo >= int(candidate["min_elo"]):
            rank = candidate
    return rank


def get_rank_emoji(elo: int) -> str:
    return str(get_rank_for_elo(elo).get("emoji", "🏷️"))


def balance_teams(players: List[Player]) -> Tuple[List[int], List[int]]:
    """Équilibre les équipes par ELO alternant (serpent)."""
    sorted_players = sorted(players, key=lambda p: p.solo_elo, reverse=True)
    team1_ids = [player.discord_id for player in sorted_players[::2]]
    team2_ids = [player.discord_id for player in sorted_players[1::2]]
    return team1_ids, team2_ids


def describe_team(title: str, team_players: List[Player]) -> List[str]:
    """Formate description équipe avec emojis de rang au lieu de l'ELO."""
    if not team_players:
        return [f"**{title}**: Aucun joueur"]

    lines = [f"**{title}**"]
    for player in sorted(team_players, key=lambda p: p.solo_elo, reverse=True):
        lines.append(f"- {get_rank_emoji(player.solo_elo)} {player.name}")
    return lines


def _format_player_name(player: Player, guild: Optional[discord.Guild]) -> str:
    if guild:
        member = guild.get_member(player.discord_id)
        if member:
            return member.display_name
    return player.name


def finalize_match_result(
    match_id: int,
    winner_label: str,
    guild: Optional[discord.Guild],
    db_module,
) -> Optional[str]:
    """Traite résultat match et calcule changements ELO."""
    match = db_module.load_match(match_id)
    if not match:
        return None

    if match["status"] != "pending":
        return f"Le match #{match_id} a déjà été traité ({match['status']})."

    if not winner_label:
        return None

    normalized = winner_label.lower()
    if normalized not in {"bleue", "rouge", "annulee"}:
        return None

    team1_ids: List[int] = [int(pid) for pid in match["team1_ids"]]
    team2_ids: List[int] = [int(pid) for pid in match["team2_ids"]]

    if normalized == "annulee":
        db_module.cancel_match(match_id)
        return f"Le match #{match_id} a été annulé."

    players_map: Dict[int, Player] = db_module.fetch_players(team1_ids + team2_ids)

    missing_players = [pid for pid in team1_ids + team2_ids if pid not in players_map]
    for missing_id in missing_players:
        display_name = None
        if guild:
            member = guild.get_member(missing_id)
            if member:
                display_name = member.display_name
        players_map[missing_id] = db_module.ensure_player(missing_id, display_name)

    team1_players = [players_map[pid] for pid in team1_ids if pid in players_map]
    team2_players = [players_map[pid] for pid in team2_ids if pid in players_map]

    if not team1_players or not team2_players:
        return None

    opponent_avg_team1 = sum(player.solo_elo for player in team2_players) / len(team2_players)
    opponent_avg_team2 = sum(player.solo_elo for player in team1_players) / len(team1_players)

    updates: List[Dict[str, int]] = []
    elo_summaries: List[str] = []

    for player in team1_players:
        won = normalized == "bleue"
        delta = calculate_elo_change(player.solo_elo, opponent_avg_team1, won)
        new_elo = max(0, player.solo_elo + delta)
        solo_wins = player.solo_wins + (1 if won else 0)
        solo_losses = player.solo_losses + (0 if won else 1)
        updates.append(
            {
                "discord_id": player.discord_id,
                "solo_elo": new_elo,
                "solo_wins": solo_wins,
                "solo_losses": solo_losses,
            }
        )
        elo_summaries.append(
            f"{_format_player_name(player, guild)} {'+' if delta >= 0 else ''}{delta} → {new_elo}"
        )

    for player in team2_players:
        won = normalized == "rouge"
        delta = calculate_elo_change(player.solo_elo, opponent_avg_team2, won)
        new_elo = max(0, player.solo_elo + delta)
        solo_wins = player.solo_wins + (1 if won else 0)
        solo_losses = player.solo_losses + (0 if won else 1)
        updates.append(
            {
                "discord_id": player.discord_id,
                "solo_elo": new_elo,
                "solo_wins": solo_wins,
                "solo_losses": solo_losses,
            }
        )
        elo_summaries.append(
            f"{_format_player_name(player, guild)} {'+' if delta >= 0 else ''}{delta} → {new_elo}"
        )

    db_module.apply_player_updates(updates)
    db_module.complete_match(match_id, normalized)

    score = ""
    team1_score = match.get("team1_score")
    team2_score = match.get("team2_score")
    if isinstance(team1_score, int) and isinstance(team2_score, int):
        score = f" (score final {team1_score}-{team2_score})"

    header = (
        f"Victoire de l'équipe {'bleue' if normalized == 'bleue' else 'rouge'} "
        f"sur {match['map_name']} ({match['map_mode']}){score}."
    )

    description_lines: List[str] = [header, "", "Changements ELO:"]
    description_lines.extend(elo_summaries)

    return "\n".join(description_lines)
