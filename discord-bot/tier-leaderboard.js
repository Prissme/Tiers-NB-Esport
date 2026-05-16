'use strict';

// ============================================================
//  tier-leaderboard.js
//  Génère une image PNG du classement Tier via SVG + sharp
//  (aucune dépendance Python / canvas)
// ============================================================

const { AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');

const TIER_LEADERBOARD_CHANNEL_ID = '1505250882231468102';
const TIER_LEADERBOARD_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

const TIER_ORDER = ['Tier S', 'Tier A', 'Tier B', 'Tier C', 'Tier D', 'Tier E'];

const TIER_COLORS = {
  'Tier S': '#f1c40f',
  'Tier A': '#e74c3c',
  'Tier B': '#e67e22',
  'Tier C': '#9b59b6',
  'Tier D': '#3498db',
  'Tier E': '#2ecc71',
};

// état interne
let _client = null;
let _guild = null;
let _siteBaseUrl = 'https://www.lfn-esports.fr';
let _leaderboardChannel = null;
let _leaderboardMessageId = null;
let _intervalRef = null;

async function fetchTierPlayers() {
  const url = `${_siteBaseUrl}/api/site/player-standings`;
  const response = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!response.ok) throw new Error(`player-standings request failed (${response.status})`);
  const payload = await response.json();
  const players = Array.isArray(payload?.players) ? payload.players : [];
  return players.filter((p) => Number(p?.points || 0) > 0);
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str;
}

async function generateLeaderboardImage(players) {
  const W = 960;
  const PADDING = 28;
  const HEADER_H = 76;
  const ROW_H = 44;
  const TIER_H = 36;
  const GAP = 5;

  const byTier = {};
  for (const t of TIER_ORDER) byTier[t] = [];
  for (const p of players) {
    const t = p.tier || 'Tier E';
    if (byTier[t]) byTier[t].push(p);
  }
  const activeTiers = TIER_ORDER.filter((t) => byTier[t].length > 0);
  const totalRows = players.length;

  const H =
    HEADER_H +
    PADDING +
    activeTiers.length * (TIER_H + GAP) +
    totalRows * ROW_H +
    PADDING;

  const rows = [];
  let y = HEADER_H + PADDING;
  let globalRank = 0;

  for (const tier of TIER_ORDER) {
    const tierPlayers = byTier[tier];
    if (!tierPlayers.length) continue;

    const color = TIER_COLORS[tier];
    const count = tierPlayers.length;
    const label = `${tier}  \u2014  ${count} joueur${count > 1 ? 's' : ''}`;

    rows.push(`
      <rect x="0" y="${y}" width="${W}" height="${TIER_H}" fill="#14213d"/>
      <rect x="0" y="${y}" width="5" height="${TIER_H}" fill="${color}"/>
      <text x="${PADDING + 10}" y="${y + TIER_H / 2 + 6}" font-family="Arial,sans-serif" font-size="16" font-weight="bold" fill="${color}">${esc(label)}</text>
    `);
    y += TIER_H;

    for (const p of tierPlayers) {
      globalRank++;
      const rowBg = globalRank % 2 === 0 ? '#121830' : '#0e1426';
      const rankColor = globalRank <= 3 ? '#f1c40f' : '#6478a0';
      const rankStr = `#${globalRank}`;
      const name = truncate(esc(p.name || ''), 28);
      const tag = p.teamTag ? `  [${esc(p.teamTag)}]` : '';
      const cc = String(p.countryCode || 'FR').toUpperCase().slice(0, 2);
      const pts = `${Math.round(Number(p.points || 0))} pts`;

      rows.push(`
        <rect x="0" y="${y}" width="${W}" height="${ROW_H}" fill="${rowBg}"/>
        <rect x="0" y="${y}" width="2" height="${ROW_H}" fill="${color}"/>
        <text x="${PADDING}" y="${y + ROW_H / 2 + 6}" font-family="Arial,sans-serif" font-size="15" font-weight="bold" fill="${rankColor}">${rankStr}</text>
        <text x="${PADDING + 56}" y="${y + ROW_H / 2 + 6}" font-family="Arial,sans-serif" font-size="15" font-weight="bold" fill="#e6ebff">${name}${tag}</text>
        <text x="${W - PADDING - 120}" y="${y + ROW_H / 2 + 5}" font-family="Arial,sans-serif" font-size="12" fill="#647896">${cc}</text>
        <text x="${W - PADDING}" y="${y + ROW_H / 2 + 6}" font-family="Arial,sans-serif" font-size="15" font-weight="bold" fill="${color}" text-anchor="end">${pts}</text>
      `);
      y += ROW_H;
    }

    y += GAP;
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0b1021"/>
  <rect x="0" y="0" width="${W}" height="${HEADER_H}" fill="#0f1629"/>
  <text x="${PADDING}" y="42" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="#f1c40f">Classement Tier \u2014 LFN Esports</text>
  <text x="${PADDING}" y="62" font-family="Arial,sans-serif" font-size="12" fill="#647896">${players.length} joueurs class\u00e9s \u2022 mis \u00e0 jour toutes les 5 min</text>
  <text x="${W - PADDING}" y="62" font-family="Arial,sans-serif" font-size="12" fill="#647896" text-anchor="end">lfn-esports.fr</text>
  <rect x="0" y="${HEADER_H}" width="${W}" height="2" fill="#1e2846"/>
  ${rows.join('\n')}
  <rect x="0" y="${H - 2}" width="${W}" height="2" fill="#1e2846"/>
</svg>`;

  return sharp(Buffer.from(svg, 'utf8')).png().toBuffer();
}

async function sendOrUpdateTierLeaderboardEmbed() {
  if (!_client || !_guild) return;

  if (!_leaderboardChannel) {
    _leaderboardChannel = await _guild.channels.fetch(TIER_LEADERBOARD_CHANNEL_ID).catch(() => null);
  }
  if (!_leaderboardChannel?.isTextBased()) {
    console.warn('[TierLeaderboard] Channel introuvable ou non textuel:', TIER_LEADERBOARD_CHANNEL_ID);
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
    console.warn('[TierLeaderboard] Aucun joueur retourné, image non mise à jour.');
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
  const updatedAt = new Date().toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    dateStyle: 'short',
    timeStyle: 'short',
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
      console.warn('[TierLeaderboard] Edition impossible, nouveau message:', err?.message || err);
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

function initTierLeaderboard(client, guild, siteBaseUrl) {
  _client = client;
  _guild = guild;
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

  console.log('[TierLeaderboard] Initialise, mise a jour toutes les', TIER_LEADERBOARD_UPDATE_INTERVAL_MS / 60000, 'min.');
}

module.exports = { initTierLeaderboard };
