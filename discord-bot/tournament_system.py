"""
tournament_system.py
────────────────────
Système de tournois interactif pour Discord (discord.py 2.x)

Commandes disponibles :
  /cup_create  – Crée un tournoi et met à jour le menu principal
  /cup_menu    – (Re)poste le menu principal dans le salon courant
  /cup_list    – Liste tous les tournois actifs de manière textuelle
"""

from __future__ import annotations

import os
import json
import asyncio
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────

# ID de votre serveur de test pour rendre les commandes visibles IMMÉDIATEMENT.
# Remplacez 0 par l'identifiant de votre serveur (Clic droit sur le serveur -> Copier l'ID).
TEST_GUILD_ID = 1236724293027496047

BANNER_PATH = Path("./assets/Tournois.webp")   # Chemin vers l'image locale
BANNER_FILENAME = BANNER_PATH.name             # "Tournois.webp"

EMBED_COLOR_MAIN   = 0x0F0F1A   # Fond très sombre (menu principal)
EMBED_COLOR_DETAIL = 0x1A0F2E   # Violet profond (détail tournoi)
EMBED_COLOR_CREATE = 0x0A2E1A   # Vert sombre (confirmation création)

FOOTER_TEXT = "La course vers le first Tier A continue !"
DATA_FILE = Path("./tournaments_db.json")

log = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Modèle de données
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class Tournament:
    id: str                           # Identifiant court unique (ex: t1)
    name: str
    max_teams: int
    date: str
    cashprize: str
    signup_channel_id: int
    organizer_id: int
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    registered_teams: int = 0

    @property
    def slug(self) -> str:
        """custom_id unique pour l'intercepteur Discord."""
        return f"cup_btn:{self.id}"

    @property
    def teams_display(self) -> str:
        remaining = self.max_teams - self.registered_teams
        icon = "✅" if remaining > 0 else "🔴"
        return f"{self.registered_teams}/{self.max_teams} {icon}"

    @property
    def is_open(self) -> bool:
        return self.registered_teams < self.max_teams


# ──────────────────────────────────────────────────────────────────────────────
# Stockage Persistant (Base de données JSON)
# ──────────────────────────────────────────────────────────────────────────────

class TournamentStore:
    """Stockage avec sauvegarde JSON automatique pour survivre aux reboots."""

    def __init__(self) -> None:
        self._tournaments: dict[str, Tournament] = {}
        # guild_id (str pour JSON) → (channel_id, message_id)
        self._main_menu_refs: dict[str, tuple[int, int]] = {}
        self._id_counter = 0
        self.load()

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
        self.save()
        log.info("Tournoi créé dans la DB : %s (%s)", slug, name)
        return t

    def get(self, tournament_id: str) -> Optional[Tournament]:
        return self._tournaments.get(tournament_id)

    def all(self) -> list[Tournament]:
        return list(self._tournaments.values())

    def set_main_menu_ref(self, guild_id: int, channel_id: int, message_id: int) -> None:
        self._main_menu_refs[str(guild_id)] = (channel_id, message_id)
        self.save()

    def get_main_menu_ref(self, guild_id: int) -> Optional[tuple[int, int]]:
        return self._main_menu_refs.get(str(guild_id))

    def save(self) -> None:
        data = {
            "id_counter": self._id_counter,
            "refs": self._main_menu_refs,
            "tournaments": {k: asdict(v) for k, v in self._tournaments.items()}
        }
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)

    def load(self) -> None:
        if not DATA_FILE.exists():
            return
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                self._id_counter = data.get("id_counter", 0)
                self._main_menu_refs = data.get("refs", {})
                for k, v in data.get("tournaments", {}).items():
                    self._tournaments[k] = Tournament(**v)
            log.info("Données chargées avec succès (%d tournois)", len(self._tournaments))
        except Exception as e:
            log.error("Erreur lors du chargement du fichier JSON : %s", e)


# Singleton de stockage global
store = TournamentStore()


# ──────────────────────────────────────────────────────────────────────────────
# Helpers visuels
# ──────────────────────────────────────────────────────────────────────────────

def load_banner_file() -> Optional[discord.File]:
    """Retourne un discord.File si l'image existe, sinon None."""
    if BANNER_PATH.exists():
        return discord.File(str(BANNER_PATH), filename=BANNER_FILENAME)
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
    organizer: Optional[discord.User],
    signup_channel: Optional[discord.TextChannel],
) -> discord.Embed:
    organizer_mention = organizer.mention if organizer else f"<@{t.organizer_id}>"
    channel_mention = signup_channel.mention if signup_channel else f"<#{t.signup_channel_id}>"

    embed = discord.Embed(
        title=f"🏆  {t.name}",
        description=f"La Cup organisée par {organizer_mention}\n\u200b",
        color=EMBED_COLOR_DETAIL,
        timestamp=datetime.fromisoformat(t.created_at),
    )

    if BANNER_PATH.exists():
        embed.set_image(url=f"attachment://{BANNER_FILENAME}")

    embed.add_field(name="💰  Cashprize", value=f"**{t.cashprize}** ✅", inline=True)
    embed.add_field(name="📅  Date", value=f"**{t.date}**", inline=True)
    embed.add_field(name="👥  Équipes", value=f"**{t.max_teams} MAX** ❗", inline=True)
    embed.add_field(name="📋  Inscrits", value=f"**{t.registered_teams}/{t.max_teams}**", inline=True)
    embed.add_field(name="🔗  Inscriptions", value=channel_mention, inline=True)
    embed.add_field(name="📊  Statut", value="🟢 **Ouvert**" if t.is_open else "🔴 **Complet**", inline=True)

    embed.set_footer(text=FOOTER_TEXT)
    return embed


# ──────────────────────────────────────────────────────────────────────────────
# Vues et Composants UI (Fixés pour la Persistance)
# ──────────────────────────────────────────────────────────────────────────────

class MainMenuView(discord.ui.View):
    """Génère l'affichage visuel des boutons sous le menu principal (Max 25 boutons)."""

    def __init__(self, tournaments: list[Tournament]) -> None:
        super().__init__(timeout=None)

        for t in tournaments[:25]:
            label = t.name if len(t.name) <= 80 else t.name[:77] + "…"
            btn = discord.ui.Button(
                label=label,
                style=discord.ButtonStyle.primary,
                custom_id=t.slug,  # Préfixé par 'cup_btn:'
                emoji="🏆"
            )
            self.add_item(btn)


class DynamicTournamentView(discord.ui.View):
    """
    Vue persistante globale enregistrée au démarrage du bot.
    Elle intercepte tous les clics de boutons commençant par 'cup_btn:'.
    """

    def __init__(self) -> None:
        super().__init__(timeout=None)

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        custom_id = interaction.data.get("custom_id", "") if interaction.data else ""

        # Si le bouton cliqué n'appartient pas au système de tournoi, on l'ignore
        if not custom_id or not custom_id.startswith("cup_btn:"):
            return True

        await interaction.response.defer(ephemeral=True)
        tournament_id = custom_id.split(":", 1)[1]
        t = store.get(tournament_id)

        if not t:
            await interaction.followup.send("❌ Ce tournoi n'existe plus dans la base de données.", ephemeral=True)
            return False

        # Récupération de l'organisateur (User)
        organizer = interaction.client.get_user(t.organizer_id)
        if not organizer:
            try:
                organizer = await interaction.client.fetch_user(t.organizer_id)
            except discord.NotFound:
                organizer = None

        # Récupération du salon textuel
        signup_channel = None
        if interaction.guild:
            signup_channel = interaction.guild.get_channel(t.signup_channel_id)

        embed = build_tournament_detail_embed(t, organizer, signup_channel) # type: ignore

        files: list[discord.File] = []
        banner = load_banner_file()
        if banner:
            files.append(banner)

        await interaction.followup.send(embed=embed, files=files, ephemeral=True)
        return False


# ──────────────────────────────────────────────────────────────────────────────
# Fonction de mise à jour en temps réel
# ──────────────────────────────────────────────────────────────────────────────

async def refresh_main_menu(client: discord.Client, guild: discord.Guild) -> None:
    """Met à jour proprement l'embed et les boutons du menu principal."""
    ref = store.get_main_menu_ref(guild.id)
    if not ref:
        return

    channel_id, message_id = ref
    channel = guild.get_channel(channel_id)
    if not isinstance(channel, discord.TextChannel):
        return

    tournaments = store.all()
    embed = build_main_menu_embed(tournaments)
    view = MainMenuView(tournaments)
    banner = load_banner_file()

    try:
        msg = await channel.fetch_message(message_id)
        if banner:
            # Édition propre de l'image (v2.x) sans forcer la suppression du message
            await msg.edit(embed=embed, attachments=[banner], view=view)
        else:
            await msg.edit(embed=embed, view=view)
    except discord.NotFound:
        log.warning("Menu principal introuvable (Message supprimé ?) pour le serveur %s", guild.id)


# ──────────────────────────────────────────────────────────────────────────────
# Cog Principal (Commandes Slash)
# ──────────────────────────────────────────────────────────────────────────────

class TournamentCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(
        name="cup_create",
        description="Crée un nouveau tournoi et met à jour le menu principal.",
    )
    @app_commands.describe(
        name="Nom du tournoi",
        max_teams="Nombre maximum d'équipes (2-256)",
        date="Date du tournoi (ex: 20 Juillet)",
        cashprize="Cashprize (ex: 50€, Cash, Rôles...)",
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
            await interaction.followup.send("❌ `max_teams` doit être compris entre 2 and 256.", ephemeral=True)
            return

        if len(name) > 80:
            await interaction.followup.send("❌ Le nom du tournoi ne doit pas dépasser 80 caractères.", ephemeral=True)
            return

        tournament = store.create(
            name=name,
            max_teams=max_teams,
            date=date,
            cashprize=cashprize,
            signup_channel_id=signup_channel.id,
            organizer_id=interaction.user.id,
        )

        confirm_embed = discord.Embed(title="✅  Tournoi créé avec succès", color=EMBED_COLOR_CREATE)
        confirm_embed.add_field(name="Nom", value=name, inline=True)
        confirm_embed.add_field(name="Équipes max", value=str(max_teams), inline=True)
        confirm_embed.add_field(name="ID interne", value=f"`{tournament.id}`", inline=True)
        confirm_embed.set_footer(text=FOOTER_TEXT)

        await interaction.followup.send(embed=confirm_embed, ephemeral=True)

        if interaction.guild:
            ref = store.get_main_menu_ref(interaction.guild.id)
            if ref:
                await refresh_main_menu(self.bot, interaction.guild)
            else:
                await interaction.followup.send(
                    "ℹ️ Aucun menu principal trouvé. Utilisez `/cup_menu` dans le bon salon pour l'afficher.",
                    ephemeral=True,
                )

    @app_commands.command(
        name="cup_menu",
        description="(Re)poste le menu principal des tournois dans ce salon.",
    )
    @app_commands.default_permissions(manage_guild=True)
    async def cup_menu(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True)

        if not isinstance(interaction.channel, discord.TextChannel):
            await interaction.followup.send("❌ Cette commande doit être utilisée dans un salon texte.", ephemeral=True)
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

        await interaction.followup.send("✅ Menu principal posté avec succès !", ephemeral=True)

    @app_commands.command(name="cup_list", description="Liste textuelle de tous les tournois actifs.")
    async def cup_list(self, interaction: discord.Interaction) -> None:
        tournaments = store.all()
        if not tournaments:
            await interaction.response.send_message("Aucun tournoi actif pour le moment.", ephemeral=True)
            return

        lines = [
            f"**{i+1}.** `{t.id}` — **{t.name}** · {t.date} · {t.cashprize} · {t.teams_display}"
            for i, t in enumerate(tournaments)
        ]
        embed = discord.Embed(title="📋  Liste des tournois", description="\n".join(lines), color=EMBED_COLOR_MAIN)
        embed.set_footer(text=FOOTER_TEXT)
        await interaction.response.send_message(embed=embed, ephemeral=True)


# ──────────────────────────────────────────────────────────────────────────────
# Démarrage du Bot
# ──────────────────────────────────────────────────────────────────────────────

async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

    token = os.environ.get("DISCORD_BOT_TOKEN")
    if not token:
        raise RuntimeError("La variable d'environnement DISCORD_BOT_TOKEN n'est pas définie.")

    intents = discord.Intents.default()
    intents.message_content = True
    intents.members = True

    bot = commands.Bot(command_prefix="!", intents=intents)

    @bot.event
    async def on_ready() -> None:
        log.info("Connecté en tant que %s (id: %s)", bot.user, bot.user.id)

        # Fix de persistance : Enregistrement de l'écouteur global
        bot.add_view(DynamicTournamentView())

        # Gestion de la synchronisation des commandes slash instantanée
        if TEST_GUILD_ID != 0:
            guild_object = discord.Object(id=TEST_GUILD_ID)
            bot.tree.copy_global_to(guild=guild_object)
            synced = await bot.tree.sync(guild=guild_object)
            log.info("%d commandes synchronisées INSTANTANÉMENT sur le serveur de test.", len(synced))
        else:
            # Synchro globale classique (Peut prendre jusqu'à 1 heure à se propager si TEST_GUILD_ID n'est pas défini)
            synced = await bot.tree.sync()
            log.info("%d commandes synchronisées globalement.", len(synced))

    await bot.add_cog(TournamentCog(bot))
    await bot.start(token)


if __name__ == "__main__":
    asyncio.run(main())
