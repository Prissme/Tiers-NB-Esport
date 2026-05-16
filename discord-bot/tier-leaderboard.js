'use strict';

// ============================================================
//  tier-leaderboard.js — Version optimisée (rapide)
// ============================================================

const { AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');

const TIER_LEADERBOARD_CHANNEL_ID = '1505250882231468102';
const TIER_LEADERBOARD_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

const TIER_ORDER  = ['Tier S', 'Tier A', 'Tier B', 'Tier C', 'Tier D', 'Tier E'];
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
let _lastPlayersHash = '';        // Pour éviter de régénérer inutilement
let _cachedImage = null;          // Cache de l'image

// ── Fetch players ─────────────────────────────────────────────
async function fetchTierPlayers() {
  try {
    const res = await fetch(`${_siteBaseUrl}/api/site/player-standings`, {
      method: 'GET',
      headers: { 'User-Agent': 'LFN-Discord-Bot/1.0' },
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    return Array.isArray(payload?.players) 
      ? payload.players.filter(p => Number(p?.points || 0) > 0)
      : [];
  } catch (err) {
    console.error(`[TierLeaderboard] Fetch error: ${err.message}`);
    return [];
  }
}

// ── Escaping rapide ───────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function trunc(str, max = 22) {
  str = String(str ?? '');
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ── Génération optimisée ──────────────────────────────────────
async function generateLeaderboardImage(players) {
  const W = 1280;
  const PADDING = 26;
  const HEADER_H = 78;
  const ROW_H = 40;
  const TIER_H = 34;
  const GAP = 5;
  const DIVIDER = 4;
  const COL_W = Math.floor((W - DIVIDER) / 2);

  const byTier = Object.fromEntries(TIER_ORDER.map(t => [t, []]));
  for (const p of players) byTier[p.tier || 'Tier E'].push(p);

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
    let html = '';

    for (const tier of tiers) {
      const tp = byTier[tier];
      if (!tp.length) continue;

      const color = TIER_COLORS[tier];
      html += `
        <rect x="${xOffset}" y="${y}" width="${COL_W}" height="${TIER_H}" fill="#14213d" rx="4"/>
        <rect x="${xOffset}" y="${y}" width="6" height="${TIER_H}" fill="${color}"/>
        <text x="${xOffset + 22}" y="${y + TIER_H/2 + 5}" font-family="Poppins" font-size="15" font-weight="700" fill="${color}">${esc(tier)} — ${tp.length}</text>`;
      y += TIER_H + GAP;

      for (const p of tp) {
        rank++;
        const rowBg = rank % 2 === 0 ? '#121830' : '#0e1426';
        const rankColor = rank <= 3 ? '#f1c40f' : '#8ba3e0';
        const name = trunc(esc(p.name || ''));
        const tag = p.teamTag ? ` [${esc(p.teamTag)}]` : '';
        const country = esc(String(p.countryCode || 'FR').slice(0,2).toUpperCase());
        const points = `${Math.round(Number(p.points))} pts`;

        html += `
          <rect x="${xOffset}" y="${y}" width="${COL_W}" height="${ROW_H}" fill="${rowBg}" rx="3"/>
          <text x="${xOffset + 22}" y="${y + ROW_H/2 + 5}" font-family="Poppins" font-size="14.5" font-weight="700" fill="${rankColor}">#${rank}</text>
          <text x="${xOffset + 75}" y="${y + ROW_H/2 + 5}" font-family="Poppins" font-size="14" font-weight="600" fill="#e6ebff">${name}${tag}</text>
          <text x="${xOffset + COL_W - 78}" y="${y + ROW_H/2 + 4}" font-family="Poppins" font-size="11.5" fill="#647896" text-anchor="middle">${country}</text>
          <text x="${xOffset + COL_W - 22}" y="${y + ROW_H/2 + 5}" font-family="Poppins" font-size="14" font-weight="700" fill="${color}" text-anchor="end">${points}</text>`;
        y += ROW_H;
      }
      y += GAP;
    }
    return html;
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalHeight}" viewBox="0 0 ${W} ${totalHeight}">
  <defs><style>@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');</style></defs>
  <rect width="${W}" height="${totalHeight}" fill="#0b1021"/>
  <rect x="0" y="0" width="${W}" height="${HEADER_H}" fill="#0f1629"/>
  <text x="${PADDING}" y="47" font-family="Poppins" font-size="26.5" font-weight="700" fill="#f1c40f">Classement Tier — LFN Esports</text>
  <text x="${PADDING}" y="68" font-family="Poppins" font-size="13" fill="#647896">${players.length} joueurs • toutes les 5 min</text>
  <text x="${W - PADDING}" y="68" font-family="Poppins" font-size="13" fill="#647896" text-anchor="end">lfn-esports.fr</text>
  <rect x="0" y="${HEADER_H}" width="${W}" height="3" fill="#1e2846"/>
  <rect x="${COL_W}" y="${HEADER_H}" width="${DIVIDER}" height="${totalHeight - HEADER_H}" fill="#1e2846"/>
  ${renderColumn(col1, 0, 0)}
  ${renderColumn(col2, COL_W + DIVIDER, col1.reduce((a,t)=>a+byTier[t].length,0))}
</svg>`;

  return sharp(Buffer.from(svg, 'utf8'))
    .png({ quality: 92, compressionLevel: 8 })
    .toBuffer();
}

// ── Mise à jour ───────────────────────────────────────────────
async function sendOrUpdateTierLeaderboardEmbed() {
  if (!_client || !_guild) return;

  if (!_leaderboardChannel) {
    _leaderboardChannel = await _guild.channels.fetch(TIER_LEADERBOARD_CHANNEL_ID).catch(() => null);
  }
  if (!_leaderboardChannel?.isTextBased()) return;

  const players = await fetchTierPlayers();
  if (players.length === 0) return;

  // Cache : ne régénère que si les données ont changé
  const currentHash = JSON.stringify(players.map(p => ({n: p.name, p: p.points, t: p.tier})));
  if (currentHash === _lastPlayersHash && _cachedImage) {
    console.log('[TierLeaderboard] Données identiques → utilisation du cache');
  } else {
    console.log('[TierLeaderboard] Génération nouvelle image...');
    _cachedImage = await generateLeaderboardImage(players);
    _lastPlayersHash = currentHash;
  }

  const attachment = new AttachmentBuilder(_cachedImage, { name: 'classement-tier.png' });
  const updatedAt = new Date().toLocaleString('fr-FR', {timeZone:'Europe/Paris', dateStyle:'short', timeStyle:'short'});

  const payload = {
    content: `**🏆 Classement Tier LFN** — [Voir le site](https://www.lfn-esports.fr/classement) • ${updatedAt}`,
    files: [attachment],
  };

  if (_leaderboardMessageId) {
    try {
      const msg = await _leaderboardChannel.messages.fetch(_leaderboardMessageId);
      await msg.edit(payload);
      return;
    } catch { _leaderboardMessageId = null; }
  }

  const sent = await _leaderboardChannel.send(payload).catch(() => null);
  if (sent) _leaderboardMessageId = sent.id;
}

// ── Init ──────────────────────────────────────────────────────
function initTierLeaderboard(client, guild, siteBaseUrl = null) {
  _client = client;
  _guild = guild;
  if (siteBaseUrl) _siteBaseUrl = siteBaseUrl.replace(/\/+$/, '');

  console.log(`[TierLeaderboard] Initialisé avec URL: ${_siteBaseUrl}`);
  sendOrUpdateTierLeaderboardEmbed();

  if (_intervalRef) clearInterval(_intervalRef);
  _intervalRef = setInterval(sendOrUpdateTierLeaderboardEmbed, TIER_LEADERBOARD_UPDATE_INTERVAL_MS);

  console.log(`[TierLeaderboard] Démarré (toutes les 5 min)`);
}

module.exports = { initTierLeaderboard };
