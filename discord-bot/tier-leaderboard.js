'use strict';

// ============================================================
//  tier-leaderboard.js
//  Classement Tier LFN — Version robuste
// ============================================================

const { AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');

const TIER_LEADERBOARD_CHANNEL_ID = '1505250882231468102';
const TIER_LEADERBOARD_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

const TIER_ORDER  = ['Tier S', 'Tier A', 'Tier B', 'Tier C', 'Tier D', 'Tier E'];
const TIER_COLORS = {
  'Tier S': '#f1c40f',
  'Tier A': '#e74c3c',
  'Tier B': '#e67e22',
  'Tier C': '#9b59b6',
  'Tier D': '#3498db',
  'Tier E': '#2ecc71',
};

let _client = null;
let _guild = null;
let _siteBaseUrl = 'https://www.lfn-esports.fr';
let _leaderboardChannel = null;
let _leaderboardMessageId = null;
let _intervalRef = null;

// ── Fetch players ─────────────────────────────────────────────
async function fetchTierPlayers() {
  const url = `${_siteBaseUrl}/api/site/player-standings`;
  console.log(`[TierLeaderboard] Fetch → ${url}`);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'LFN-Discord-Bot/1.0' },
        signal: AbortSignal.timeout(15000)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const payload = await res.json();
      const players = Array.isArray(payload?.players) 
        ? payload.players.filter(p => Number(p?.points || 0) > 0)
        : [];

      console.log(`[TierLeaderboard] ✅ ${players.length} joueurs récupérés`);
      return players;

    } catch (err) {
      console.error(`[TierLeaderboard] Fetch error (tentative ${attempt}/3): ${err.message}`);
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
    }
  }
  return [];
}

// ── Helpers améliorés ─────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function trunc(str, max = 23) {
  str = String(str ?? '');
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ── Génération Image ──────────────────────────────────────────
async function generateLeaderboardImage(players) {
  const W = 1280;
  const PADDING = 28;
  const HEADER_H = 82;
  const ROW_H = 42;
  const TIER_H = 36;
  const GAP = 6;
  const DIVIDER = 4;
  const COL_W = Math.floor((W - DIVIDER) / 2);

  const byTier = Object.fromEntries(TIER_ORDER.map(t => [t, []]));
  for (const p of players) {
    const tier = p.tier || 'Tier E';
    if (byTier[tier]) byTier[tier].push(p);
  }

  const activeTiers = TIER_ORDER.filter(t => byTier[t].length > 0);

  let col1 = [], col2 = [], rows1 = 0, rows2 = 0;
  for (const tier of activeTiers) {
    const needed = byTier[tier].length + 1;
    if (rows1 <= rows2) { col1.push(tier); rows1 += needed; }
    else { col2.push(tier); rows2 += needed; }
  }

  const totalHeight = HEADER_H + PADDING * 2 + Math.max(rows1, rows2) * ROW_H;

  function renderColumn(tiers, xOffset, startRank) {
    let y = HEADER_H + PADDING;
    let rank = startRank;
    const parts = [];

    for (const tier of tiers) {
      const tp = byTier[tier];
      if (!tp.length) continue;

      const color = TIER_COLORS[tier];
      const count = tp.length;

      parts.push(`
        <rect x="${xOffset}" y="${y}" width="${COL_W}" height="${TIER_H}" fill="#14213d" rx="4"/>
        <rect x="${xOffset}" y="${y}" width="6" height="${TIER_H}" fill="${color}" rx="4"/>
        <text x="${xOffset + 24}" y="${y + TIER_H/2 + 6}" 
              font-family="Poppins, Arial, sans-serif" font-size="15.5" font-weight="700" fill="${color}">
          ${esc(tier)} — ${count} joueur${count > 1 ? 's' : ''}
        </text>
      `);
      y += TIER_H + GAP;

      for (const p of tp) {
        rank++;
        const rowBg = rank % 2 === 0 ? '#121830' : '#0e1426';
        const rankColor = rank <= 3 ? '#f1c40f' : '#8ba3e0';
        const name = trunc(esc(p.name || ''));
        const tag = p.teamTag ? ` [${esc(p.teamTag)}]` : '';
        const country = esc(String(p.countryCode || 'FR').toUpperCase().slice(0, 2));
        const points = `${Math.round(Number(p.points || 0))} pts`;

        parts.push(`
          <rect x="${xOffset}" y="${y}" width="${COL_W}" height="${ROW_H}" fill="${rowBg}" rx="4"/>
          <text x="${xOffset + 24}" y="${y + ROW_H/2 + 6}" 
                font-family="Poppins, Arial, sans-serif" font-size="14.5" font-weight="700" fill="${rankColor}">#${rank}</text>
          <text x="${xOffset + 78}" y="${y + ROW_H/2 + 6}" 
                font-family="Poppins, Arial, sans-serif" font-size="14" font-weight="600" fill="#e6ebff">${name}${tag}</text>
          <text x="${xOffset + COL_W - 78}" y="${y + ROW_H/2 + 5}" 
                font-family="Poppins, Arial, sans-serif" font-size="11.5" fill="#647896" text-anchor="middle">${country}</text>
          <text x="${xOffset + COL_W - 22}" y="${y + ROW_H/2 + 6}" 
                font-family="Poppins, Arial, sans-serif" font-size="14" font-weight="700" fill="${color}" text-anchor="end">${points}</text>
        `);
        y += ROW_H;
      }
      y += GAP;
    }
    return parts.join('');
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalHeight}" viewBox="0 0 ${W} ${totalHeight}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
    </style>
  </defs>
  <rect width="${W}" height="${totalHeight}" fill="#0b1021"/>
  
  <rect x="0" y="0" width="${W}" height="${HEADER_H}" fill="#0f1629"/>
  <text x="${PADDING}" y="48" font-family="Poppins, Arial, sans-serif" font-size="27" font-weight="700" fill="#f1c40f">Classement Tier — LFN Esports</text>
  <text x="${PADDING}" y="70" font-family="Poppins, Arial, sans-serif" font-size="13.5" fill="#647896">${players.length} joueurs classés • Mise à jour toutes les 5 min</text>
  <text x="${W - PADDING}" y="70" font-family="Poppins, Arial, sans-serif" font-size="13.5" fill="#647896" text-anchor="end">lfn-esports.fr</text>

  <rect x="0" y="${HEADER_H}" width="${W}" height="3" fill="#1e2846"/>
  <rect x="${COL_W}" y="${HEADER_H}" width="${DIVIDER}" height="${totalHeight - HEADER_H}" fill="#1e2846"/>

  ${renderColumn(col1, 0, 0)}
  ${renderColumn(col2, COL_W + DIVIDER, col1.reduce((acc, t) => acc + byTier[t].length, 0))}

  <rect x="0" y="${totalHeight - 3}" width="${W}" height="3" fill="#1e2846"/>
</svg>`;

  return sharp(Buffer.from(svg, 'utf8'))
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
}

// ── Send / Update ─────────────────────────────────────────────
async function sendOrUpdateTierLeaderboardEmbed() {
  if (!_client || !_guild) return;

  if (!_leaderboardChannel) {
    _leaderboardChannel = await _guild.channels.fetch(TIER_LEADERBOARD_CHANNEL_ID).catch(() => null);
  }

  if (!_leaderboardChannel?.isTextBased()) return;

  const players = await fetchTierPlayers();
  if (players.length === 0) return;

  let imageBuffer;
  try {
    imageBuffer = await generateLeaderboardImage(players);
  } catch (err) {
    console.error('[TierLeaderboard] Erreur génération image:', err.message);
    return;
  }

  const attachment = new AttachmentBuilder(imageBuffer, { name: 'classement-tier.png' });
  const updatedAt = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' });

  const payload = {
    content: `**🏆 Classement Tier LFN** — [Voir le site](https://www.lfn-esports.fr/classement) • ${updatedAt}`,
    files: [attachment],
  };

  if (_leaderboardMessageId) {
    try {
      const msg = await _leaderboardChannel.messages.fetch(_leaderboardMessageId);
      await msg.edit(payload);
      console.log('[TierLeaderboard] Message mis à jour');
      return;
    } catch { _leaderboardMessageId = null; }
  }

  try {
    const sent = await _leaderboardChannel.send(payload);
    _leaderboardMessageId = sent.id;
    console.log('[TierLeaderboard] Nouveau message envoyé');
  } catch (err) {
    console.error('[TierLeaderboard] Erreur envoi:', err.message);
  }
}

// ── Init ──────────────────────────────────────────────────────
function initTierLeaderboard(client, guild, siteBaseUrl = null) {
  _client = client;
  _guild = guild;
  if (siteBaseUrl) {
    _siteBaseUrl = siteBaseUrl.replace(/\/+$/, '');
    if (!_siteBaseUrl.startsWith('https://www.')) {
      _siteBaseUrl = _siteBaseUrl.replace('https://', 'https://www.');
    }
  }

  console.log(`[TierLeaderboard] Initialisation avec URL: ${_siteBaseUrl}`);
  sendOrUpdateTierLeaderboardEmbed();

  if (_intervalRef) clearInterval(_intervalRef);
  _intervalRef = setInterval(sendOrUpdateTierLeaderboardEmbed, TIER_LEADERBOARD_UPDATE_INTERVAL_MS);

  console.log(`[TierLeaderboard] Démarré (toutes les 5 min)`);
}

module.exports = { initTierLeaderboard };
