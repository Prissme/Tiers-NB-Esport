"""
tournament_system.py
────────────────────
Système de tournois interactif pour Discord (discord.py 2.x)

Commandes disponibles :
  /cup_create  – Crée un tournoi et met à jour le menu principal
  /cup_menu    – (Re)poste le menu principal dans le salon courant

Structure :
  TournamentStore  – Stockage en mémoire + helpers
  TournamentView   – discord.ui.View avec boutons dynamiques
  MainMenuView     – discord.ui.View du menu principal
  TournamentCog    – Commandes slash
"""

from __future__ import annotations

import os
import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────

BANNER_PATH = Path("./assets/Tournois.webp")   # Chemin vers l'image locale
BANNER_FILENAME = BANNER_PATH.name             # "Tournois.webp"

EMBED_COLOR_MAIN   = 0x0F0F1A   # Fond très sombre (menu principal)
EMBED_COLOR_DETAIL = 0x1A0F2E   # Violet profond (détail tournoi)
EMBED_COLOR_CREATE = 0x0A2E1A   # Vert sombre (confirmation création)

FOOTER_TEXT = "La course vers le first Tier A continue !"

log = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Modèle de données
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class Tournament:
    id: str                           # Identifiant court unique (slug)
    name: str
    max_teams: int
    date: str
    cashprize: str
    signup_channel_id: int
    organizer_id: int
    created_at: datetime = field(default_factory=datetime.utcnow)
    registered_teams: int = 0

    @property
    def slug(self) -> str:
        """custom_id safe (≤ 100 chars)."""
        return f"cup:{self.id}"

    @property
    def teams_display(self) -> str:
        remaining = self.max_teams - self.registered_teams
        icon = "✅" if remaining > 0 else "🔴"
        return f"{self.registered_teams}/{self.max_teams} {icon}"

    @property
    def is_open(self) -> bool:
        return self.registered_teams < self.max_teams


# ──────────────────────────────────────────────────────────────────────────────
# Stockage en mémoire
# ──────────────────────────────────────────────────────────────────────────────

class TournamentStore:
    """Stockage en mémoire des tournois et du message principal."""

    def __init__(self) -> None:
        self._tournaments: dict[str, Tournament] = {}
        # guild_id → (channel_id, message_id)
        self._main_menu_refs: dict[int, tuple[int, int]] = {}
        self._id_counter = 0

    # ── CRUD ──────────────────────────────────────────────────────────────────

    def create(
        self,
        name: str,
        max_teams: int,
        date: str,
        cashprize: str,
        signup_channel_id: int,
        organizer_id: int,
    ) -> Tournament:
        self._id_counter += 1
        slug = f"t{self._id_counter}"
        t = Tournament(
            id=slug,
            name=name,
            max_teams=max_teams,
            date=date,
            cashprize=cashprize,
            signup_channel_id=signup_channel_id,
            organizer_id=organizer_id,
        )
        self._tournaments[slug] = t
        log.info("Tournament created: %s (%s)", slug, name)
        return t

    def get(self, tournament_id: str) -> Optional[Tournament]:
        return self._tournaments.get(tournament_id)

    def all(self) -> list[Tournament]:
        return list(self._tournaments.values())

    # ── Menu principal ────────────────────────────────────────────────────────

    def set_main_menu_ref(self, guild_id: int, channel_id: int, message_id: int) -> None:
        self._main_menu_refs[guild_id] = (channel_id, message_id)

    def get_main_menu_ref(self, guild_id: int) -> Optional[tuple[int, int]]:
        return self._main_menu_refs.get(guild_id)


# Singleton global
store = TournamentStore()


# ──────────────────────────────────────────────────────────────────────────────
# Helpers visuels
# ──────────────────────────────────────────────────────────────────────────────

def load_banner_file() -> Optional[discord.File]:
    """Retourne un discord.File si l'image existe, sinon None."""
    if BANNER_PATH.exists():
        return discord.File(str(BANNER_PATH), filename=BANNER_FILENAME)
    log.warning("Banner not found at %s — embed will not include image.", BANNER_PATH)
    return None


def build_main_menu_embed(tournaments: list[Tournament]) -> discord.Embed:
    embed = discord.Embed(
        title="🎮  Tournois disponibles",
        description=(
            "Clique sur une cup pour voir les détails, les conditions d'inscription "
            "et le cashprize.\n\u200b"
        ),
        color=EMBED_COLOR_MAIN,
        timestamp=datetime.utcnow(),
    )

    if BANNER_PATH.exists():
        embed.set_image(url=f"attachment://{BANNER_FILENAME}")

    if not tournaments:
        embed.add_field(
            name="Aucun tournoi actif",
            value="Reviens bientôt ou contacte un admin pour créer une cup.",
            inline=False,
        )
    else:
        for t in tournaments:
            status = "🟢 Ouvert" if t.is_open else "🔴 Complet"
            embed.add_field(
                name=f"**{t.name}**",
                value=(
                    f"📅 `{t.date}`  |  💰 `{t.cashprize}`  |  "
                    f"👥 `{t.teams_display}`  |  {status}"
                ),
                inline=False,
            )

    embed.set_footer(text=FOOTER_TEXT)
    return embed


def build_tournament_detail_embed(
    t: Tournament,
    organizer: Optional[discord.Member | discord.User],
    signup_channel: Optional[discord.TextChannel],
) -> discord.Embed:
    organizer_mention = organizer.mention if organizer else f"<@{t.organizer_id}>"
    channel_mention = signup_channel.mention if signup_channel else f"<#{t.signup_channel_id}>"

    embed = discord.Embed(
        title=f"🏆  {t.name}",
        description=f"La Cup organisée par {organizer_mention}\n\u200b",
        color=EMBED_COLOR_DETAIL,
        timestamp=t.created_at,
    )

    if BANNER_PATH.exists():
        embed.set_image(url=f"attachment://{BANNER_FILENAME}")

    embed.add_field(
        name="💰  Cashprize",
        value=f"**{t.cashprize}** ✅",
        inline=True,
    )
    embed.add_field(
        name="📅  Date",
        value=f"**{t.date}**",
        inline=True,
    )
    embed.add_field(
        name="👥  Équipes",
        value=f"**{t.max_teams} MAX** ❗",
        inline=True,
    )
    embed.add_field(
        name="📋  Inscrits",
        value=f"**{t.registered_teams}/{t.max_teams}**",
        inline=True,
    )
    embed.add_field(
        name="🔗  Inscriptions",
        value=channel_mention,
        inline=True,
    )
    embed.add_field(
        name="📊  Statut",
        value="🟢 **Ouvert**" if t.is_open else "🔴 **Complet**",
        inline=True,
    )

    embed.set_footer(text=FOOTER_TEXT)
    return embed


# ──────────────────────────────────────────────────────────────────────────────
# Bouton individuel de tournoi
# ──────────────────────────────────────────────────────────────────────────────

class TournamentButton(discord.ui.Button):
    def __init__(self, tournament: Tournament) -> None:
        label = tournament.name
        if len(label) > 80:
            label = label[:77] + "…"

        super().__init__(
            label=label,
            style=discord.ButtonStyle.primary,
            custom_id=tournament.slug,   # persistant entre redémarrages
            emoji="🏆",
        )
        self.tournament_id = tournament.id

    async def callback(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True)

        t = store.get(self.tournament_id)
        if not t:
            await interaction.followup.send(
                "❌ Ce tournoi n'existe plus.", ephemeral=True
            )
            return

        # Récupération asynchrone du channel et de l'organisateur
        organizer: Optional[discord.Member | discord.User] = None
        signup_channel: Optional[discord.TextChannel] = None

        guild = interaction.guild
        if guild:
            try:
                organizer = await guild.fetch_member(t.organizer_id)
            except discord.NotFound:
                try:
                    organizer = await interaction.client.fetch_user(t.organizer_id)
                except discord.NotFound:
                    pass

            signup_channel = guild.get_channel(t.signup_channel_id)  # type: ignore

        embed = build_tournament_detail_embed(t, organizer, signup_channel)

        files: list[discord.File] = []
        banner = load_banner_file()
        if banner:
            files.append(banner)

        await interaction.followup.send(
            embed=embed,
            files=files,
            ephemeral=True,
        )


# ──────────────────────────────────────────────────────────────────────────────
# View du menu principal
# ──────────────────────────────────────────────────────────────────────────────

class MainMenuView(discord.ui.View):
    """View persistante contenant un bouton par tournoi."""

    def __init__(self, tournaments: list[Tournament]) -> None:
        super().__init__(timeout=None)   # Persistant !

        for t in tournaments[:25]:      # Discord limite à 25 composants par message
            self.add_item(TournamentButton(t))


# ──────────────────────────────────────────────────────────────────────────────
# Utilitaire : mise à jour du message principal
# ──────────────────────────────────────────────────────────────────────────────

async def refresh_main_menu(
    client: discord.Client,
    guild: discord.Guild,
) -> None:
    """Met à jour (ou reposte) le message principal du menu."""
    ref = store.get_main_menu_ref(guild.id)
    tournaments = store.all()
    embed = build_main_menu_embed(tournaments)
    view = MainMenuView(tournaments)

    files: list[discord.File] = []
    banner = load_banner_file()
    if banner:
        files.append(banner)

    if ref:
        channel_id, message_id = ref
        channel = guild.get_channel(channel_id)
        if isinstance(channel, discord.TextChannel):
            try:
                msg = await channel.fetch_message(message_id)
                # discord.py ne permet pas de mettre à jour les fichiers via edit()
                # On supprime et reposte si une image est présente
                if files:
                    await msg.delete()
                    new_msg = await channel.send(embed=embed, files=files, view=view)
                else:
                    new_msg = await msg.edit(embed=embed, view=view)
                store.set_main_menu_ref(guild.id, channel.id, new_msg.id)
                return
            except discord.NotFound:
                pass  # Message supprimé → on reposte

    log.warning("refresh_main_menu: no valid ref found for guild %s", guild.id)


# ──────────────────────────────────────────────────────────────────────────────
# Cog principal
# ──────────────────────────────────────────────────────────────────────────────

class TournamentCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    # ── /cup_create ──────────────────────────────────────────────────────────

    @app_commands.command(
        name="cup_create",
        description="Crée un nouveau tournoi et met à jour le menu principal.",
    )
    @app_commands.describe(
        name="Nom du tournoi",
        max_teams="Nombre maximum d'équipes",
        date="Date du tournoi (ex: 20 Juillet 2025)",
        cashprize="Cashprize (ex: 50€, Nintendo Switch...)",
        signup_channel="Salon d'inscription",
    )
    @app_commands.default_permissions(manage_guild=True)
    async def cup_create(
        self,
        interaction: discord.Interaction,
        name: str,
        max_teams: int,
        date: str,
        cashprize: str,
        signup_channel: discord.TextChannel,
    ) -> None:
        await interaction.response.defer(ephemeral=True)

        if max_teams < 2 or max_teams > 256:
            await interaction.followup.send(
                "❌ `max_teams` doit être compris entre 2 et 256.", ephemeral=True
            )
            return

        if len(name) > 80:
            await interaction.followup.send(
                "❌ Le nom du tournoi ne doit pas dépasser 80 caractères.", ephemeral=True
            )
            return

        tournament = store.create(
            name=name,
            max_teams=max_teams,
            date=date,
            cashprize=cashprize,
            signup_channel_id=signup_channel.id,
            organizer_id=interaction.user.id,
        )

        # Confirmation
        confirm_embed = discord.Embed(
            title="✅  Tournoi créé avec succès",
            color=EMBED_COLOR_CREATE,
        )
        confirm_embed.add_field(name="Nom", value=name, inline=True)
        confirm_embed.add_field(name="Équipes max", value=str(max_teams), inline=True)
        confirm_embed.add_field(name="Date", value=date, inline=True)
        confirm_embed.add_field(name="Cashprize", value=cashprize, inline=True)
        confirm_embed.add_field(name="Salon", value=signup_channel.mention, inline=True)
        confirm_embed.add_field(name="ID interne", value=f"`{tournament.id}`", inline=True)
        confirm_embed.set_footer(text=FOOTER_TEXT)

        await interaction.followup.send(embed=confirm_embed, ephemeral=True)

        # Mise à jour du menu principal si un message de référence existe
        if interaction.guild:
            ref = store.get_main_menu_ref(interaction.guild.id)
            if ref:
                await refresh_main_menu(self.bot, interaction.guild)
            else:
                await interaction.followup.send(
                    "ℹ️ Aucun menu principal trouvé. "
                    "Utilise `/cup_menu` pour en créer un dans ce salon.",
                    ephemeral=True,
                )

    # ── /cup_menu ─────────────────────────────────────────────────────────────

    @app_commands.command(
        name="cup_menu",
        description="(Re)poste le menu principal des tournois dans ce salon.",
    )
    @app_commands.default_permissions(manage_guild=True)
    async def cup_menu(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True)

        if not isinstance(interaction.channel, discord.TextChannel):
            await interaction.followup.send(
                "❌ Cette commande doit être utilisée dans un salon texte.", ephemeral=True
            )
            return

        tournaments = store.all()
        embed = build_main_menu_embed(tournaments)
        view = MainMenuView(tournaments)

        files: list[discord.File] = []
        banner = load_banner_file()
        if banner:
            files.append(banner)

        msg = await interaction.channel.send(embed=embed, files=files, view=view)

        if interaction.guild:
            store.set_main_menu_ref(interaction.guild.id, interaction.channel.id, msg.id)

        await interaction.followup.send(
            "✅ Menu principal posté avec succès !", ephemeral=True
        )

    # ── /cup_list ─────────────────────────────────────────────────────────────

    @app_commands.command(
        name="cup_list",
        description="Liste tous les tournois actifs.",
    )
    async def cup_list(self, interaction: discord.Interaction) -> None:
        tournaments = store.all()
        if not tournaments:
            await interaction.response.send_message(
                "Aucun tournoi actif pour le moment.", ephemeral=True
            )
            return

        lines = [
            f"**{i+1}.** `{t.id}` — **{t.name}** · {t.date} · {t.cashprize} · {t.teams_display}"
            for i, t in enumerate(tournaments)
        ]
        embed = discord.Embed(
            title="📋  Liste des tournois",
            description="\n".join(lines),
            color=EMBED_COLOR_MAIN,
        )
        embed.set_footer(text=FOOTER_TEXT)
        await interaction.response.send_message(embed=embed, ephemeral=True)


# ──────────────────────────────────────────────────────────────────────────────
# Bot setup
# ──────────────────────────────────────────────────────────────────────────────

async def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    token = os.environ.get("DISCORD_BOT_TOKEN")
    if not token:
        raise RuntimeError("DISCORD_BOT_TOKEN n'est pas défini.")

    intents = discord.Intents.default()
    intents.message_content = True
    intents.members = True

    bot = commands.Bot(command_prefix="!", intents=intents)

    @bot.event
    async def on_ready() -> None:
        log.info("Connecté en tant que %s (id: %s)", bot.user, bot.user.id)

        # Réenregistrement des vues persistantes (boutons après redémarrage)
        # Reconstruit la view pour chaque tournoi existant au démarrage
        bot.add_view(MainMenuView(store.all()))

        # Synchro des slash commands
        synced = await bot.tree.sync()
        log.info("%d commandes synchronisées.", len(synced))

    await bot.add_cog(TournamentCog(bot))
    await bot.start(token)


if __name__ == "__main__":
    asyncio.run(main())
