'use strict';

// ============================================================
//  tier-leaderboard.js
//  2 colonnes, format paysage — Discord affiche l'image inline
// ============================================================

const { AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');

const TIER_LEADERBOARD_CHANNEL_ID = '1505250882231468102';
const TIER_LEADERBOARD_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

const TIER_ORDER = ['Tier S', 'Tier A', 'Tier B', 'Tier C', 'Tier D', 'Tier E'];
const TIER_COLORS = {
  'Tier S': '#f1c40f', 'Tier A': '#e74c3c', 'Tier B': '#e67e22',
  'Tier C': '#9b59b6', 'Tier D': '#3498db', 'Tier E': '#2ecc71',
};

let _client = null;
let _guild = null;
let _siteBaseUrl = 'https://www.lfn-esports.fr';
let _leaderboardChannel = null;
let _leaderboardMessageId = null;
let _intervalRef = null;

// ── fetch ────────────────────────────────────────────────────
async function fetchTierPlayers() {
  const url = `${_siteBaseUrl}/api/site/player-standings`;
  const res = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!res.ok) throw new Error(`player-standings ${res.status}`);
  const payload = await res.json();
  const players = Array.isArray(payload?.players) ? payload.players : [];
  return players.filter((p) => Number(p?.points || 0) > 0);
}

// ── helpers SVG ──────────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function trunc(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str;
}

// ── génération image ─────────────────────────────────────────
async function generateLeaderboardImage(players) {
  const W       = 1280;
  const PADDING = 20;
  const HEADER_H = 70;
  const ROW_H   = 36;
  const TIER_H  = 30;
  const GAP     = 4;
  const DIVIDER = 2;
  const COL_W   = Math.floor((W - DIVIDER) / 2);

  // Grouper par tier
  const byTier = {};
  for (const t of TIER_ORDER) byTier[t] = [];
  for (const p of players) {
    const t = p.tier || 'Tier E';
    if (byTier[t]) byTier[t].push(p);
  }
  const activeTiers = TIER_ORDER.filter((t) => byTier[t].length > 0);

  // Répartir les tiers en 2 colonnes (équilibre par nombre de lignes)
  const col1 = [], col2 = [];
  let rows1 = 0, rows2 = 0;
  for (const t of activeTiers) {
    const r = byTier[t].length + 1; // +1 pour l'en-tête de tier
    if (rows1 <= rows2) { col1.push(t); rows1 += r; }
    else                { col2.push(t); rows2 += r; }
  }

  const maxRows = Math.max(rows1, rows2);
  const H = HEADER_H + PADDING + maxRows * ROW_H + PADDING;

  // Compter le rang de départ de la colonne 2
  const col2RankStart = col1.reduce((s, t) => s + byTier[t].length, 0);

  function renderColumn(tiers, xOffset, rankStart) {
    const parts = [];
    let y = HEADER_H + PADDING;
    let rank = rankStart;

    for (const tier of tiers) {
      const tp = byTier[tier];
      if (!tp.length) continue;
      const color = TIER_COLORS[tier];
      const cnt = tp.length;

      // Barre de tier
      parts.push(`
        <rect x="${xOffset}" y="${y}" width="${COL_W}" height="${TIER_H}" fill="#14213d"/>
        <rect x="${xOffset}" y="${y}" width="4" height="${TIER_H}" fill="${color}"/>
        <text x="${xOffset + PADDING}" y="${y + TIER_H / 2 + 5}"
          font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="${color}"
        >${esc(tier)}  \u2014  ${cnt} joueur${cnt > 1 ? 's' : ''}</text>
      `);
      y += TIER_H + GAP;

      for (const p of tp) {
        rank++;
        const rowBg     = rank % 2 === 0 ? '#121830' : '#0e1426';
        const rankColor = rank <= 3 ? '#f1c40f' : '#6478a0';
        const name      = trunc(esc(p.name || ''), 22);
        const tag       = p.teamTag ? `  [${esc(p.teamTag)}]` : '';
        const cc        = String(p.countryCode || 'FR').toUpperCase().slice(0, 2);
        const pts       = `${Math.round(Number(p.points || 0))} pts`;

        parts.push(`
          <rect x="${xOffset}" y="${y}" width="${COL_W}" height="${ROW_H}" fill="${rowBg}"/>
          <rect x="${xOffset}" y="${y}" width="2" height="${ROW_H}" fill="${color}"/>
          <text x="${xOffset + PADDING}" y="${y + ROW_H / 2 + 5}"
            font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="${rankColor}">#${rank}</text>
          <text x="${xOffset + PADDING + 44}" y="${y + ROW_H / 2 + 5}"
            font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="#e6ebff">${name}${tag}</text>
          <text x="${xOffset + COL_W - PADDING - 58}" y="${y + ROW_H / 2 + 4}"
            font-family="Arial,sans-serif" font-size="11" fill="#647896">${cc}</text>
          <text x="${xOffset + COL_W - PADDING}" y="${y + ROW_H / 2 + 5}"
            font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="${color}" text-anchor="end">${pts}</text>
        `);
        y += ROW_H;
      }
      y += GAP;
    }
    return parts.join('');
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0b1021"/>

  <!-- Header -->
  <rect x="0" y="0" width="${W}" height="${HEADER_H}" fill="#0f1629"/>
  <text x="${PADDING}" y="38" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="#f1c40f">Classement Tier \u2014 LFN Esports</text>
  <text x="${PADDING}" y="58" font-family="Arial,sans-serif" font-size="12" fill="#647896">${players.length} joueurs class\u00e9s \u2022 mis \u00e0 jour toutes les 5 min</text>
  <text x="${W - PADDING}" y="58" font-family="Arial,sans-serif" font-size="12" fill="#647896" text-anchor="end">lfn-esports.fr</text>
  <rect x="0" y="${HEADER_H}" width="${W}" height="2" fill="#1e2846"/>

  <!-- Séparateur de colonnes -->
  <rect x="${COL_W}" y="${HEADER_H}" width="${DIVIDER}" height="${H - HEADER_H}" fill="#1e2846"/>

  <!-- Colonnes -->
  ${renderColumn(col1, 0, 0)}
  ${renderColumn(col2, COL_W + DIVIDER, col2RankStart)}

  <!-- Pied de page -->
  <rect x="0" y="${H - 2}" width="${W}" height="2" fill="#1e2846"/>
</svg>`;

  return sharp(Buffer.from(svg, 'utf8')).png().toBuffer();
}

// ── envoi Discord ─────────────────────────────────────────────
async function sendOrUpdateTierLeaderboardEmbed() {
  if (!_client || !_guild) return;

  if (!_leaderboardChannel) {
    _leaderboardChannel = await _guild.channels.fetch(TIER_LEADERBOARD_CHANNEL_ID).catch(() => null);
  }
  if (!_leaderboardChannel?.isTextBased()) {
    console.warn('[TierLeaderboard] Channel introuvable:', TIER_LEADERBOARD_CHANNEL_ID);
    return;
  }

  let players = [];
  try {
    players = await fetchTierPlayers();
  } catch (err) {
    console.warn('[TierLeaderboard] Impossible de charger les joueurs:', err?.message || err);
    return;
  }
  if (!players.length) {
    console.warn('[TierLeaderboard] Aucun joueur, image non mise a jour.');
    return;
  }

  let imageBuffer;
  try {
    imageBuffer = await generateLeaderboardImage(players);
  } catch (err) {
    console.error('[TierLeaderboard] Echec generation image:', err?.message || err);
    return;
  }

  const attachment = new AttachmentBuilder(imageBuffer, { name: 'classement-tier.png' });
  const updatedAt  = new Date().toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short',
  });
  const payload = {
    content: `**\uD83C\uDFC6 Classement Tier LFN** \u2014 [Voir le site](https://www.lfn-esports.fr/classement) \u2022 ${updatedAt}`,
    files: [attachment],
  };

  if (_leaderboardMessageId) {
    try {
      const existing = await _leaderboardChannel.messages.fetch(_leaderboardMessageId);
      await existing.edit(payload);
      console.log('[TierLeaderboard] Image mise a jour.');
      return;
    } catch (err) {
      console.warn('[TierLeaderboard] Edition impossible:', err?.message || err);
      _leaderboardMessageId = null;
    }
  }

  try {
    const recent = await _leaderboardChannel.messages.fetch({ limit: 20 });
    const old = recent.filter(
      (m) => m.author.id === _client.user?.id && m.content?.includes('Classement Tier LFN')
    );
    await Promise.all(old.map((m) => m.delete().catch(() => null)));
  } catch (_) {}

  const sent = await _leaderboardChannel.send(payload).catch((err) => {
    console.error('[TierLeaderboard] Echec envoi:', err);
    return null;
  });
  if (sent) {
    _leaderboardMessageId = sent.id;
    console.log('[TierLeaderboard] Image postee, ID:', sent.id);
  }
}

// ── init ──────────────────────────────────────────────────────
function initTierLeaderboard(client, guild, siteBaseUrl) {
  _client = client;
  _guild  = guild;
  if (siteBaseUrl) _siteBaseUrl = siteBaseUrl.replace(/\/+$/, '');

  sendOrUpdateTierLeaderboardEmbed().catch((err) =>
    console.error('[TierLeaderboard] Erreur initiale:', err)
  );

  if (_intervalRef) clearInterval(_intervalRef);
  _intervalRef = setInterval(() => {
    sendOrUpdateTierLeaderboardEmbed().catch((err) =>
      console.error('[TierLeaderboard] Erreur mise a jour:', err)
    );
  }, TIER_LEADERBOARD_UPDATE_INTERVAL_MS);

  console.log('[TierLeaderboard] Initialise, toutes les', TIER_LEADERBOARD_UPDATE_INTERVAL_MS / 60000, 'min.');
}

module.exports = { initTierLeaderboard };
