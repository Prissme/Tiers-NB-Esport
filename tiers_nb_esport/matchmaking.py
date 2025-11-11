"""Bot Discord principal pour le matchmaking."""
from __future__ import annotations

import asyncio
import logging
import random
from collections import Counter
from typing import Dict, List, Optional

import discord
from discord.ext import commands

from . import config, database, elo_system
from .database import Player

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# État global
queue_lock = asyncio.Lock()
vote_lock = asyncio.Lock()
solo_queue: List[int] = []
match_votes: Dict[int, Dict[int, str]] = {}
MAX_SERIES_WINS = 2

# Bot setup
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)


class MatchVoteView(discord.ui.View):
    """Interface de vote pour un match en BO3."""

    def __init__(
        self,
        match_id: int,
        match_record: Dict,
        team1_players: List[Player],
        team2_players: List[Player],
    ):
        super().__init__(timeout=3600)
        self.match_id = match_id
        self.team1_ids = list(match_record["team1_ids"])
        self.team2_ids = list(match_record["team2_ids"])
        self.team1_players = team1_players
        self.team2_players = team2_players
        self.team1_score = int(match_record.get("team1_score", 0))
        self.team2_score = int(match_record.get("team2_score", 0))
        self.match_record = dict(match_record)
        self.message: Optional[discord.Message] = None

    async def on_timeout(self) -> None:
        match_votes.pop(self.match_id, None)
        self.disable_all_items()
        if self.message:
            await self.message.edit(view=self)
        self.stop()

    async def _register_vote(self, interaction: discord.Interaction, label: str) -> None:
        voter_id = interaction.user.id
        if voter_id not in self.team1_ids + self.team2_ids:
            await interaction.response.send_message(
                "Seuls les joueurs du match peuvent voter.", ephemeral=True
            )
            return

        async with vote_lock:
            votes = match_votes.setdefault(self.match_id, {})
            votes[voter_id] = label
            counts = Counter(votes.values())

        unique_players = set(self.team1_ids + self.team2_ids)
        total_players = len(unique_players)
        if total_players < 2:
            total_players = max(len(self.team1_ids) + len(self.team2_ids), 2)
        majority = total_players // 2 + 1
        top_vote: Optional[str] = None
        top_count = 0
        if counts:
            top_vote, top_count = counts.most_common(1)[0]

        series_summary: Optional[str] = None
        match_summary: Optional[str] = None

        if top_vote and top_count >= majority:
            if top_vote == "annulee":
                match_summary = elo_system.finalize_match_result(
                    self.match_id, top_vote, interaction.guild, database
                )
                if match_summary:
                    channel = interaction.channel or interaction.user.dm_channel
                    if channel:
                        await channel.send(match_summary)
                match_votes.pop(self.match_id, None)
                self.disable_all_items()
                if self.message:
                    await self.message.edit(view=self)
                self.stop()
            else:
                if top_vote == "bleue":
                    self.team1_score += 1
                else:
                    self.team2_score += 1

                self.match_record["team1_score"] = self.team1_score
                self.match_record["team2_score"] = self.team2_score

                if self.team1_score >= MAX_SERIES_WINS or self.team2_score >= MAX_SERIES_WINS:
                    updated_match = database.update_match_series_score(
                        self.match_id, self.team1_score, self.team2_score
                    )
                    if updated_match:
                        self.match_record.update(updated_match)
                        await self._refresh_message(updated_match)
                    else:
                        await self._refresh_message(self.match_record)
                    match_summary = elo_system.finalize_match_result(
                        self.match_id, top_vote, interaction.guild, database
                    )
                    if match_summary:
                        channel = interaction.channel or interaction.user.dm_channel
                        if channel:
                            await channel.send(match_summary)
                    match_votes.pop(self.match_id, None)
                    self.disable_all_items()
                    if self.message:
                        await self.message.edit(view=self)
                    self.stop()
                else:
                    async with vote_lock:
                        match_votes[self.match_id] = {}
                    team_label = "bleue" if top_vote == "bleue" else "rouge"
                    series_summary = (
                        f"Manche remportée par l'équipe {team_label}. "
                        f"Score actuel : {self.team1_score}-{self.team2_score}."
                    )
                    await self._refresh_message(self.match_record)

        await interaction.response.send_message(
            f"Vote enregistré pour l'équipe {label}.", ephemeral=True
        )

        if series_summary and interaction.channel:
            await interaction.channel.send(series_summary)

    async def _refresh_message(self, match_record: Dict) -> None:
        if not self.message:
            return
        embed = build_match_embed(match_record, self.team1_players, self.team2_players)
        await self.message.edit(embed=embed, view=self)

    @discord.ui.button(label="Victoire bleue", style=discord.ButtonStyle.primary, emoji="🔵")
    async def vote_blue(
        self, interaction: discord.Interaction, button: discord.ui.Button
    ) -> None:
        await self._register_vote(interaction, "bleue")

    @discord.ui.button(label="Victoire rouge", style=discord.ButtonStyle.danger, emoji="🔴")
    async def vote_red(
        self, interaction: discord.Interaction, button: discord.ui.Button
    ) -> None:
        await self._register_vote(interaction, "rouge")

    @discord.ui.button(label="Match annulé", style=discord.ButtonStyle.secondary, emoji="⚪")
    async def vote_cancel(
        self, interaction: discord.Interaction, button: discord.ui.Button
    ) -> None:
        await self._register_vote(interaction, "annulee")


async def send_match_message(
    guild: discord.Guild,
    match_record: Dict,
    team1_players: List[Player],
    team2_players: List[Player],
) -> None:
    channel = guild.get_channel(config.MATCH_CHANNEL_ID)
    if not channel:
        logger.warning("Salon de match introuvable (%s)", config.MATCH_CHANNEL_ID)
        return

    embed = build_match_embed(match_record, team1_players, team2_players)

    view = MatchVoteView(match_record["id"], match_record, team1_players, team2_players)
    message = await channel.send(embed=embed, view=view)
    view.message = message

    log_channel = guild.get_channel(config.LOG_CHANNEL_ID)
    if log_channel and log_channel != channel:
        await log_channel.send(f"Match #{match_record['id']} créé dans {channel.mention}")


def build_match_embed(
    match_record: Dict,
    team1_players: List[Player],
    team2_players: List[Player],
) -> discord.Embed:
    map_emoji = match_record.get("map_emoji") or "🗺️"
    embed = discord.Embed(
        title=f"Match #{match_record['id']} — {map_emoji} {match_record['map_mode']}",
        description=f"Carte: {match_record['map_name']}",
        colour=discord.Colour.blue(),
    )

    team1_lines = elo_system.describe_team("Équipe bleue", team1_players)
    team2_lines = elo_system.describe_team("Équipe rouge", team2_players)

    embed.add_field(name="Équipe bleue", value="\n".join(team1_lines), inline=False)
    embed.add_field(name="Équipe rouge", value="\n".join(team2_lines), inline=False)

    score_text = (
        f"Score de la série: {int(match_record.get('team1_score', 0))}-"
        f"{int(match_record.get('team2_score', 0))} (BO3)"
    )
    embed.set_footer(text=score_text)
    return embed


def _select_map() -> Dict[str, str]:
    mode = random.choice(config.MAP_ROTATION)
    map_name = random.choice(mode["maps"])
    return {"mode": mode["mode"], "map": map_name, "emoji": mode.get("emoji", "🗺️")}


async def create_match_if_possible(guild: discord.Guild) -> None:
    async with queue_lock:
        if len(solo_queue) < config.QUEUE_TARGET_SIZE:
            return
        selected_ids = [solo_queue.pop(0) for _ in range(config.QUEUE_TARGET_SIZE)]

    players_map = database.fetch_players(selected_ids)

    resolved_players: List[Player] = []
    for discord_id in selected_ids:
        player = players_map.get(discord_id)
        if not player:
            member = guild.get_member(discord_id)
            display_name = member.display_name if member else f"Joueur {discord_id}"
            player = database.ensure_player(discord_id, display_name)
        resolved_players.append(player)

    team1_ids, team2_ids = elo_system.balance_teams(resolved_players)
    team1_players = [p for p in resolved_players if p.discord_id in team1_ids]
    team2_players = [p for p in resolved_players if p.discord_id in team2_ids]

    map_info = _select_map()
    match_record = database.record_match(team1_ids, team2_ids, map_info)
    await send_match_message(guild, match_record, team1_players, team2_players)


def compute_tier_boundaries(total_players: int) -> List[Dict[str, int]]:
    if total_players <= 0:
        return []

    remaining = total_players
    boundaries: List[Dict[str, int]] = []

    for index, distribution in enumerate(config.TIER_DISTRIBUTION):
        if remaining <= 0:
            break

        ratio = float(distribution.get("ratio", 0) or 0)
        min_count = int(distribution.get("minCount", 0) or 0)
        future_min = sum(
            int(next_dist.get("minCount", 0) or 0)
            for next_dist in config.TIER_DISTRIBUTION[index + 1 :]
        )

        if index == len(config.TIER_DISTRIBUTION) - 1:
            count = remaining
        else:
            count = int(total_players * ratio)
            if count < min_count:
                count = min_count
            max_allowed = remaining - future_min
            if max_allowed < 0:
                max_allowed = 0
            if count > max_allowed:
                count = max(min_count, max_allowed)

        if count > remaining:
            count = remaining

        if count <= 0:
            continue

        remaining -= count
        boundaries.append({"tier": distribution["tier"], "end_rank": total_players - remaining})

    return boundaries


def get_tier_by_rank(rank: int, boundaries: List[Dict[str, int]]) -> Optional[str]:
    if rank <= 0 or not boundaries:
        return None

    for boundary in boundaries:
        end_rank = boundary.get("end_rank")
        if isinstance(end_rank, int) and rank <= end_rank:
            return boundary.get("tier")

    return None


@bot.event
async def on_ready():
    logger.info("Bot connecté en tant que %s", bot.user)


@bot.command(name="ping")
async def ping_command(ctx: commands.Context):
    role = ctx.guild.get_role(config.PING_ROLE_ID)
    if not role:
        await ctx.reply("Rôle de notification introuvable.")
        return
    if role in ctx.author.roles:
        await ctx.author.remove_roles(role)
        await ctx.reply("Rôle retiré.")
    else:
        await ctx.author.add_roles(role)
        await ctx.reply("Rôle ajouté !")


@bot.command(name="join")
async def join_queue(ctx: commands.Context):
    user_id = ctx.author.id
    if database.player_has_pending_match(user_id):
        await ctx.reply(
            "Tu as déjà un match en attente de validation. Attends que le résultat soit confirmé."
        )
        return
    async with queue_lock:
        if user_id in solo_queue:
            await ctx.reply("Tu es déjà dans la file d'attente.")
            return
        solo_queue.append(user_id)
    display_name = ctx.author.display_name
    database.ensure_player(user_id, display_name)
    await ctx.reply(f"{display_name} a rejoint la file ({len(solo_queue)}/{config.QUEUE_TARGET_SIZE}).")
    await create_match_if_possible(ctx.guild)


@bot.command(name="leave")
async def leave_queue(ctx: commands.Context):
    user_id = ctx.author.id
    async with queue_lock:
        if user_id not in solo_queue:
            await ctx.reply("Tu n'es pas dans la file d'attente.")
            return
        solo_queue.remove(user_id)
    await ctx.reply("Tu as quitté la file d'attente.")


@bot.command(name="queue")
async def show_queue(ctx: commands.Context):
    async with queue_lock:
        queue_copy = list(solo_queue)
    if not queue_copy:
        await ctx.reply("La file est vide.")
        return
    lines = [f"File solo ({len(queue_copy)}/{config.QUEUE_TARGET_SIZE}):"]
    for index, user_id in enumerate(queue_copy, start=1):
        member = ctx.guild.get_member(user_id)
        name = member.display_name if member else f"Joueur {user_id}"
        lines.append(f"{index}. {name}")
    await ctx.reply("\n".join(lines))


@bot.command(name="maps")
async def show_maps(ctx: commands.Context):
    lines = ["Rotation actuelle des cartes:"]
    for mode in config.MAP_ROTATION:
        maps = ", ".join(mode["maps"])
        lines.append(f"{mode.get('emoji', '🗺️')} {mode['mode']}: {maps}")
    await ctx.reply("\n".join(lines))


@bot.command(name="elo")
async def show_elo(ctx: commands.Context, member: Optional[discord.Member] = None):
    target = member or ctx.author
    player = database.fetch_player(target.id)
    if not player:
        await ctx.reply("Aucune donnée ELO pour ce joueur.")
        return
    await ctx.reply(
        f"Stats de {target.display_name}: {player.solo_elo} ELO — "
        f"{player.solo_wins}V/{player.solo_losses}D"
    )


@bot.command(name="lb")
async def leaderboard(ctx: commands.Context, top: Optional[int] = None):
    top_n = top if top is not None else 10
    try:
        top_n = int(top_n)
    except (TypeError, ValueError):
        await ctx.reply("La limite doit être un nombre.")
        return

    top_n = max(1, min(25, top_n))

    players, total_players = database.fetch_leaderboard(top_n)
    if not players:
        await ctx.reply("Aucun joueur n'est encore classé.")
        return

    boundaries = compute_tier_boundaries(total_players)

    lines = [f"Classement ELO — Top {len(players)}"]
    for index, player in enumerate(players, start=1):
        member = ctx.guild.get_member(player.discord_id)
        name = member.display_name if member else player.name
        tier = get_tier_by_rank(index, boundaries) or "No-tier"
        lines.append(
            f"{index}. {name} — {player.solo_elo} ELO — {player.solo_wins}V/{player.solo_losses}D — Tier {tier}"
        )

    await ctx.reply("\n".join(lines))


@bot.command(name="resetstats")
@commands.has_permissions(manage_guild=True)
async def reset_stats(ctx: commands.Context, member: discord.Member):
    player = database.ensure_player(member.id, member.display_name)
    database.apply_player_updates(
        [
            {
                "discord_id": player.discord_id,
                "solo_elo": 1000,
                "solo_wins": 0,
                "solo_losses": 0,
            }
        ]
    )
    await ctx.reply(f"Stats de {member.display_name} réinitialisées.")


@reset_stats.error
async def reset_stats_error(ctx: commands.Context, error: commands.CommandError):
    if isinstance(error, commands.MissingPermissions):
        await ctx.reply("Tu n'as pas la permission d'utiliser cette commande.")
    else:
        raise error


@bot.command(name="help")
async def help_command(ctx: commands.Context):
    help_text = (
        "**Commandes matchmaking**\n"
        "!join — Rejoindre la file solo\n"
        "!leave — Quitter la file\n"
        "!queue — Afficher la file en cours\n"
        "!elo [@joueur] — Voir les statistiques\n"
        "!maps — Voir la rotation des cartes\n"
        "!ping — Activer/désactiver le rôle de notification"
    )
    await ctx.reply(help_text)


async def main():
    """Point d'entrée principal du bot."""
    if not config.DISCORD_TOKEN:
        raise RuntimeError("DISCORD_TOKEN environment variable is not set")
    if not config.DATABASE_URL:
        raise RuntimeError("DATABASE_URL environment variable is not set")

    database.init_db()
    await bot.start(config.DISCORD_TOKEN)


if __name__ == "__main__":
    asyncio.run(main())
