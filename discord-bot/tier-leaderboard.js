'use strict';

// ============================================================
//  tier-leaderboard.js
//  Version propre — Poppins via Google Fonts (Sharp + librsvg)
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
  const res = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!res.ok) throw new Error(`player-standings ${res.status}`);
  const payload = await res.json();
  return Array.isArray(payload?.players) 
    ? payload.players.filter(p => Number(p?.points || 0) > 0)
    : [];
}

// ── Helpers ───────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function trunc(str, max = 24) {
  str = String(str ?? '');
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ── Génération de l'image ─────────────────────────────────────
async function generateLeaderboardImage(players) {
  const W = 1280;
  const PADDING = 28;
  const HEADER_H = 80;
  const ROW_H = 42;
  const TIER_H = 36;
  const GAP = 6;
  const DIVIDER = 3;
  const COL_W = Math.floor((W - DIVIDER) / 2);

  const byTier = {};
  for (const t of TIER_ORDER) byTier[t] = [];
  for (const p of players) {
    const tier = p.tier || 'Tier E';
    if (byTier[tier]) byTier[tier].push(p);
  }

  const activeTiers = TIER_ORDER.filter(t => byTier[t].length > 0);

  // Répartition équilibrée entre les deux colonnes
  let col1 = [], col2 = [], rows1 = 0, rows2 = 0;
  for (const tier of activeTiers) {
    const rowCount = byTier[tier].length + 1;
    if (rows1 <= rows2) {
      col1.push(tier);
      rows1 += rowCount;
    } else {
      col2.push(tier);
      rows2 += rowCount;
    }
  }

  const totalRows = Math.max(rows1, rows2);
  const H = HEADER_H + PADDING * 2 + totalRows * ROW_H;

  function renderColumn(tiers, xOffset, startRank) {
    let y = HEADER_H + PADDING;
    let rank = startRank;
    let svgParts = [];

    for (const tier of tiers) {
      const playersInTier = byTier[tier];
      if (!playersInTier.length) continue;

      const color = TIER_COLORS[tier];
      const count = playersInTier.length;

      // Tier header
      svgParts.push(`
        <rect x="${xOffset}" y="${y}" width="${COL_W}" height="${TIER_H}" fill="#14213d" rx="4"/>
        <rect x="${xOffset}" y="${y}" width="6" height="${TIER_H}" fill="${color}" rx="4"/>
        <text x="${xOffset + 22}" y="${y + TIER_H/2 + 6}" 
              font-family="Poppins, Arial, sans-serif" font-size="15" font-weight="700" fill="${color}">
          ${esc(tier)} — ${count} joueur${count > 1 ? 's' : ''}
        </text>
      `);
      y += TIER_H + GAP;

      // Players
      for (const p of playersInTier) {
        rank++;
        const rowBg = rank % 2 === 0 ? '#121830' : '#0e1426';
        const rankColor = rank <= 3 ? '#f1c40f' : '#8ba3e0';
        const name = trunc(esc(p.name || ''), 23);
        const tag = p.teamTag ? ` [${esc(p.teamTag)}]` : '';
        const country = String(p.countryCode || 'FR').toUpperCase().slice(0, 2);
        const points = `${Math.round(Number(p.points || 0))} pts`;

        svgParts.push(`
          <rect x="${xOffset}" y="${y}" width="${COL_W}" height="${ROW_H}" fill="${rowBg}" rx="3"/>
          <text x="${xOffset + 22}" y="${y + ROW_H/2 + 6}" 
                font-family="Poppins, Arial, sans-serif" font-size="14.5" font-weight="700" fill="${rankColor}">
            #${rank}
          </text>
          <text x="${xOffset + 78}" y="${y + ROW_H/2 + 6}" 
                font-family="Poppins, Arial, sans-serif" font-size="14" font-weight="600" fill="#e6ebff">
            ${name}${tag}
          </text>
          <text x="${xOffset + COL_W - 78}" y="${y + ROW_H/2 + 5}" 
                font-family="Poppins, Arial, sans-serif" font-size="11.5" fill="#647896" text-anchor="middle">
            ${country}
          </text>
          <text x="${xOffset + COL_W - 22}" y="${y + ROW_H/2 + 6}" 
                font-family="Poppins, Arial, sans-serif" font-size="14" font-weight="700" fill="${color}" text-anchor="end">
            ${points}
          </text>
        `);
        y += ROW_H;
      }
      y += GAP;
    }
    return svgParts.join('');
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="#0b1021"/>
  
  <!-- Header -->
  <rect x="0" y="0" width="${W}" height="${HEADER_H}" fill="#0f1629"/>
  <text x="${PADDING}" y="48" font-family="Poppins, Arial, sans-serif" font-size="26" font-weight="700" fill="#f1c40f">
    Classement Tier — LFN Esports
  </text>
  <text x="${PADDING}" y="68" font-family="Poppins, Arial, sans-serif" font-size="13" fill="#647896">
    ${players.length} joueurs classés • Mise à jour toutes les 5 min
  </text>
  <text x="${W - PADDING}" y="68" font-family="Poppins, Arial, sans-serif" font-size="13" fill="#647896" text-anchor="end">
    lfn-esports.fr
  </text>

  <rect x="0" y="${HEADER_H}" width="${W}" height="3" fill="#1e2846"/>
  <rect x="${COL_W}" y="${HEADER_H}" width="${DIVIDER}" height="${H - HEADER_H}" fill="#1e2846"/>

  ${renderColumn(col1, 0, 0)}
  ${renderColumn(col2, COL_W + DIVIDER, col1.reduce((sum, t) => sum + byTier[t].length, 0))}

  <rect x="0" y="${H - 3}" width="${W}" height="3" fill="#1e2846"/>
</svg>`;

  return sharp(Buffer.from(svg, 'utf8'))
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();
}

// Le reste du code (init, sendOrUpdate...) reste identique
// ... (je peux te le remettre si besoin)

module.exports = { initTierLeaderboard };
