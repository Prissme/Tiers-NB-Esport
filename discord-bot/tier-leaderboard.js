'use strict';

// ============================================================
//  tier-leaderboard.js
//  Module autonome — classement Tier dans un channel dédié
//  Génère une image PNG via Python/Pillow au lieu d'un embed texte
// ============================================================

const { AttachmentBuilder } = require('discord.js');
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const os = require('os');
const fs = require('fs/promises');

const execFileAsync = promisify(execFile);

const TIER_LEADERBOARD_CHANNEL_ID = '1505250882231468102';
const TIER_LEADERBOARD_UPDATE_INTERVAL_MS = 5 * 60 * 1000; // toutes les 5 minutes

// ── état interne ────────────────────────────────────────────
let _client = null;
let _guild = null;
let _siteBaseUrl = 'https://www.lfn-esports.fr';
let _leaderboardChannel = null;
let _leaderboardMessageId = null;
let _intervalRef = null;

// ── helpers ─────────────────────────────────────────────────

async function fetchTierPlayers() {
  const url = `${_siteBaseUrl}/api/site/player-standings`;
  const response = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!response.ok) throw new Error(`player-standings request failed (${response.status})`);
  const payload = await response.json();
  const players = Array.isArray(payload?.players) ? payload.players : [];
  return players.filter((p) => Number(p?.points || 0) > 0);
}

// ── génération image Python ──────────────────────────────────

/**
 * Génère l'image PNG du classement via un script Python inline.
 * @param {Array} players — liste triée de joueurs avec { name, tier, points, countryCode, teamTag }
 * @returns {Buffer} — contenu PNG
 */
async function generateLeaderboardImage(players) {
  const tmpDir = os.tmpdir();
  const dataFile = path.join(tmpDir, `lfn_lb_${Date.now()}.json`);
  const outFile = path.join(tmpDir, `lfn_lb_${Date.now()}.png`);

  // Écrire les données JSON dans un fichier temporaire
  await fs.writeFile(dataFile, JSON.stringify(players), 'utf8');

  const pythonScript = /* python */ `
import json, sys, os
from PIL import Image, ImageDraw, ImageFont

# ── Polices ────────────────────────────────────────────────
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD    = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# Fallback si DejaVu absent
for candidate in [FONT_REGULAR, FONT_BOLD]:
    if not os.path.exists(candidate):
        sys.exit(f"Font not found: {candidate}")

# ── Constantes de style ────────────────────────────────────
TIER_ORDER = ['Tier S','Tier A','Tier B','Tier C','Tier D','Tier E']
TIER_COLORS = {
    'Tier S': (241,196, 15),
    'Tier A': (231, 76, 60),
    'Tier B': (230,126, 34),
    'Tier C': (155, 89,182),
    'Tier D': ( 52,152,219),
    'Tier E': ( 46,204,113),
}
BG_DARK   = (11, 16, 33)
BG_HEADER = (15, 22, 45)
BG_ROW_A  = (18, 24, 45)
BG_ROW_B  = (14, 20, 38)
BG_TIER   = (20, 28, 55)
ACCENT    = (30, 40, 70)
TEXT_MAIN = (230,235,255)
TEXT_DIM  = (100,120,160)
GOLD      = (241,196, 15)

WIDTH    = 960
PADDING  = 28
HEADER_H = 76
ROW_H    = 46
TIER_H   = 38
GAP      = 6

# ── Données ────────────────────────────────────────────────
with open(sys.argv[1]) as f:
    players = json.load(f)

by_tier = {t: [] for t in TIER_ORDER}
for p in players:
    t = p.get('tier', 'Tier E')
    if t in by_tier:
        by_tier[t].append(p)

active_tiers = [t for t in TIER_ORDER if by_tier[t]]
total_rows   = sum(len(by_tier[t]) for t in active_tiers)
total_h = (HEADER_H + PADDING
           + len(active_tiers) * (TIER_H + GAP)
           + total_rows * ROW_H
           + PADDING * 2)

# ── Création image ─────────────────────────────────────────
img  = Image.new('RGB', (WIDTH, total_h), BG_DARK)
draw = ImageDraw.Draw(img)

f_title = ImageFont.truetype(FONT_BOLD,    26)
f_tier  = ImageFont.truetype(FONT_BOLD,    17)
f_bold  = ImageFont.truetype(FONT_BOLD,    16)
f_reg   = ImageFont.truetype(FONT_REGULAR, 15)
f_small = ImageFont.truetype(FONT_REGULAR, 12)

# Header
draw.rectangle([0, 0, WIDTH, HEADER_H], fill=BG_HEADER)
draw.text((PADDING, 15), "Classement Tier — LFN Esports", font=f_title, fill=GOLD)
sub = f"{len(players)} joueurs classes"
draw.text((PADDING, 48), sub, font=f_small, fill=TEXT_DIM)
site_w = int(draw.textlength("lfn-esports.fr", font=f_small))
draw.text((WIDTH - PADDING - site_w, 48), "lfn-esports.fr", font=f_small, fill=TEXT_DIM)
draw.rectangle([0, HEADER_H, WIDTH, HEADER_H + 2], fill=ACCENT)

y = HEADER_H + PADDING
global_rank = 0

for tier in TIER_ORDER:
    tier_players = by_tier[tier]
    if not tier_players:
        continue

    color = TIER_COLORS[tier]

    # Barre de tier
    draw.rectangle([0, y, WIDTH, y + TIER_H], fill=BG_TIER)
    draw.rectangle([0, y, 5, y + TIER_H], fill=color)
    count = len(tier_players)
    label = f"{tier}  —  {count} joueur{'s' if count > 1 else ''}"
    draw.text((PADDING + 10, y + 10), label, font=f_tier, fill=color)
    y += TIER_H

    for p in tier_players:
        global_rank += 1
        row_bg = BG_ROW_A if global_rank % 2 == 0 else BG_ROW_B
        draw.rectangle([0, y, WIDTH, y + ROW_H], fill=row_bg)

        # Barre de couleur latérale (fine)
        draw.rectangle([0, y, 2, y + ROW_H], fill=color)

        # Rang
        if   global_rank == 1: rank_str = "#1"
        elif global_rank == 2: rank_str = "#2"
        elif global_rank == 3: rank_str = "#3"
        else:                  rank_str = f"#{global_rank}"

        rank_color = GOLD if global_rank <= 3 else TEXT_DIM
        draw.text((PADDING, y + 14), rank_str, font=f_bold, fill=rank_color)

        # Nom + tag
        name = str(p.get('name', ''))
        tag  = p.get('teamTag')
        display = f"{name}  [{tag}]" if tag else name
        name_x = PADDING + 58
        draw.text((name_x, y + 14), display, font=f_bold, fill=TEXT_MAIN)

        # Pays
        cc = str(p.get('countryCode') or 'FR').upper()[:2]
        country_w = int(draw.textlength(cc, font=f_small))
        draw.text((WIDTH - PADDING - 80 - country_w, y + 16), cc, font=f_small, fill=TEXT_DIM)

        # Points
        pts = f"{round(float(p.get('points', 0)))} pts"
        pts_w = int(draw.textlength(pts, font=f_bold))
        draw.text((WIDTH - PADDING - pts_w, y + 14), pts, font=f_bold, fill=color)

        y += ROW_H

    y += GAP

# Pied de page
draw.rectangle([0, total_h - 2, WIDTH, total_h], fill=ACCENT)

img.save(sys.argv[2], format='PNG', optimize=True)
print("OK")
`;

  const scriptFile = path.join(tmpDir, `lfn_gen_${Date.now()}.py`);
  await fs.writeFile(scriptFile, pythonScript, 'utf8');

  try {
    await execFileAsync('python3', [scriptFile, dataFile, outFile], { timeout: 30_000 });
    const buffer = await fs.readFile(outFile);
    return buffer;
  } finally {
    // Nettoyage silencieux des fichiers temporaires
    fs.unlink(dataFile).catch(() => null);
    fs.unlink(outFile).catch(() => null);
    fs.unlink(scriptFile).catch(() => null);
  }
}

// ── fonction principale ──────────────────────────────────────

async function sendOrUpdateTierLeaderboardEmbed() {
  if (!_client || !_guild) return;

  // Résolution du channel
  if (!_leaderboardChannel) {
    _leaderboardChannel = await _guild.channels.fetch(TIER_LEADERBOARD_CHANNEL_ID).catch(() => null);
  }
  if (!_leaderboardChannel?.isTextBased()) {
    console.warn('[TierLeaderboard] Channel introuvable ou non textuel:', TIER_LEADERBOARD_CHANNEL_ID);
    return;
  }

  // Récupération des joueurs
  let players = [];
  try {
    players = await fetchTierPlayers();
  } catch (err) {
    console.warn('[TierLeaderboard] Impossible de charger les joueurs:', err?.message || err);
    return;
  }

  if (!players.length) {
    console.warn('[TierLeaderboard] Aucun joueur retourné, image non mise à jour.');
    return;
  }

  // Génération de l'image
  let imageBuffer;
  try {
    imageBuffer = await generateLeaderboardImage(players);
  } catch (err) {
    console.error('[TierLeaderboard] Échec de la génération de l\'image:', err?.message || err);
    return;
  }

  const attachment = new AttachmentBuilder(imageBuffer, { name: 'classement-tier.png' });
  const updatedAt = new Date().toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    dateStyle: 'short',
    timeStyle: 'short',
  });
  const payload = {
    content: `**🏆 Classement Tier LFN** — mis à jour toutes les 5 min\n[Voir le classement complet](https://www.lfn-esports.fr/classement) • ${updatedAt}`,
    files: [attachment],
  };

  // Tenter d'éditer le message existant
  if (_leaderboardMessageId) {
    try {
      const existing = await _leaderboardChannel.messages.fetch(_leaderboardMessageId);
      await existing.edit(payload);
      console.log('[TierLeaderboard] Image mise à jour.');
      return;
    } catch (err) {
      console.warn('[TierLeaderboard] Impossible d\'éditer le message existant, nouveau message:', err?.message || err);
      _leaderboardMessageId = null;
    }
  }

  // Nettoyer les anciens messages du bot dans ce channel
  try {
    const recent = await _leaderboardChannel.messages.fetch({ limit: 20 });
    const old = recent.filter(
      (m) =>
        m.author.id === _client.user?.id &&
        m.content?.includes('Classement Tier LFN')
    );
    await Promise.all(old.map((m) => m.delete().catch(() => null)));
  } catch (_) {}

  // Envoyer un nouveau message
  const sent = await _leaderboardChannel.send(payload).catch((err) => {
    console.error('[TierLeaderboard] Échec de l\'envoi:', err);
    return null;
  });
  if (sent) {
    _leaderboardMessageId = sent.id;
    console.log('[TierLeaderboard] Image postée, message ID:', sent.id);
  }
}

// ── initialisation ────────────────────────────────────────────

/**
 * Appelle cette fonction dans onReady() de unified-bot.js
 * @param {Client} client   — le client Discord.js
 * @param {Guild}  guild    — le guild résolu
 * @param {string} siteBaseUrl — optionnel, ex: 'https://www.lfn-esports.fr'
 */
function initTierLeaderboard(client, guild, siteBaseUrl) {
  _client = client;
  _guild = guild;
  if (siteBaseUrl) _siteBaseUrl = siteBaseUrl.replace(/\/+$/, '');

  // Premier envoi immédiat
  sendOrUpdateTierLeaderboardEmbed().catch((err) =>
    console.error('[TierLeaderboard] Erreur initiale:', err)
  );

  // Mise à jour périodique
  if (_intervalRef) clearInterval(_intervalRef);
  _intervalRef = setInterval(() => {
    sendOrUpdateTierLeaderboardEmbed().catch((err) =>
      console.error('[TierLeaderboard] Erreur mise à jour:', err)
    );
  }, TIER_LEADERBOARD_UPDATE_INTERVAL_MS);

  console.log('[TierLeaderboard] Initialisé, mise à jour toutes les', TIER_LEADERBOARD_UPDATE_INTERVAL_MS / 60000, 'min.');
}

module.exports = { initTierLeaderboard };

// ============================================================
//  INTÉGRATION dans unified-bot.js — aucun changement requis.
//  Le module expose exactement la même API qu'avant :
//    const { initTierLeaderboard } = require('./tier-leaderboard');
//    initTierLeaderboard(readyClient, guild, SITE_BASE_URL);
// ============================================================
