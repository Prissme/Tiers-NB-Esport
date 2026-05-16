'use strict';

// ============================================================
//  tier-leaderboard.js
// ============================================================

const { AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');

// --- CONFIGURATION ---
const TIER_LEADERBOARD_CHANNEL_ID = '1505250882231468102';
const TIER_LEADERBOARD_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

// 🌐 UNE SEULE SOURCE DE VÉRITÉ
let SITE_BASE_URL = process.env.SITE_BASE_URL || "http://localhost:3000";

// --- DESIGN ---
const TIER_ORDER = ['Tier S', 'Tier A', 'Tier B', 'Tier C', 'Tier D', 'Tier E'];
const TIER_COLORS = {
  'Tier S': '#FFD700',
  'Tier A': '#FF4500',
  'Tier B': '#FF8C00',
  'Tier C': '#9932CC',
  'Tier D': '#4169E1',
  'Tier E': '#2E8B57',
};

// --- GLOBALS ---
let _client = null;
let _guild = null;
let _leaderboardChannel = null;
let _leaderboardMessageId = null;
let _intervalRef = null;

// ============================================================
// FETCH
// ============================================================
async function fetchTierPlayers() {
  const res = await fetch(`${SITE_BASE_URL}/api/site/player-standings`, { cache: 'no-store' });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const payload = await res.json();

  if (!Array.isArray(payload?.players)) throw new Error('Invalid format');

  return payload.players
    .filter(p => Number(p?.points || 0) > 0)
    .sort((a, b) => b.points - a.points);
}

// ============================================================
// UTILS
// ============================================================
const esc = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const trunc = (str, len) =>
  !str ? '' : str.length > len ? str.slice(0, len - 1) + '…' : str;

// ============================================================
// IMAGE
// ============================================================
async function generateLeaderboardImage(players) {
  const W = 1920;
  const PADDING = 30;
  const HEADER_H = 100;
  const ROW_H = 45;
  const TIER_H = 40;
  const GAP = 8;
  const DIVIDER_W = 4;
  const COL_W = Math.floor((W - DIVIDER_W) / 2);

  const byTier = {};
  TIER_ORDER.forEach(t => byTier[t] = []);

  for (const p of players) {
    const t = p.tier || 'Tier E';
    if (byTier[t]) byTier[t].push(p);
  }

  const active = TIER_ORDER.filter(t => byTier[t].length);

  if (!active.length) throw new Error('No players');

  let col1 = [], col2 = [];
  let r1 = 0, r2 = 0;

  for (const t of active) {
    const count = byTier[t].length + 1;
    if (r1 <= r2) { col1.push(t); r1 += count; }
    else { col2.push(t); r2 += count; }
  }

  const maxRows = Math.max(r1, r2);
  const H = HEADER_H + PADDING + maxRows * ROW_H + active.length * GAP + PADDING;

  const col2Start = col1.reduce((s, t) => s + byTier[t].length, 0);

  const render = (tiers, x, startRank) => {
    let y = HEADER_H + PADDING;
    let rank = startRank;
    let out = '';

    for (const t of tiers) {
      const list = byTier[t];
      const color = TIER_COLORS[t];

      out += `
        <rect x="${x}" y="${y}" width="${COL_W}" height="${TIER_H}" fill="#1A1A2E"/>
        <rect x="${x}" y="${y}" width="6" height="${TIER_H}" fill="${color}"/>
        <text x="${x + PADDING}" y="${y + 25}" fill="${color}" font-size="20" font-weight="bold">
          ${esc(t)} — ${list.length}
        </text>
      `;
      y += TIER_H + GAP;

      for (const p of list) {
        rank++;
        const name = trunc(esc(p.name), 20);
        const pts = Math.round(p.points);

        out += `
          <rect x="${x}" y="${y}" width="${COL_W}" height="${ROW_H}" fill="#0F172A"/>
          <text x="${x + PADDING}" y="${y + 28}" fill="#FFD700">#${rank}</text>
          <text x="${x + 80}" y="${y + 28}" fill="#FFF">${name}</text>
          <text x="${x + COL_W - PADDING}" y="${y + 28}" fill="${color}" text-anchor="end">${pts}</text>
        `;
        y += ROW_H;
      }

      y += GAP;
    }

    return out;
  };

  const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#0A0A14"/>
  <text x="30" y="50" fill="#FFD700" font-size="32">LFN Leaderboard</text>

  <rect x="${COL_W}" y="0" width="${DIVIDER_W}" height="${H}" fill="#222"/>

  ${render(col1, 0, 0)}
  ${render(col2, COL_W + DIVIDER_W, col2Start)}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

// ============================================================
// DISCORD
// ============================================================
async function sendOrUpdate() {
  if (!_client || !_guild) return;

  if (!_leaderboardChannel) {
    _leaderboardChannel = await _guild.channels.fetch(TIER_LEADERBOARD_CHANNEL_ID).catch(() => null);
    if (!_leaderboardChannel) return;
  }

  let players;
  try {
    players = await fetchTierPlayers();
  } catch (e) {
    console.error(e);
    return;
  }

  let img;
  try {
    img = await generateLeaderboardImage(players);
  } catch (e) {
    console.error(e);
    return;
  }

  const attachment = new AttachmentBuilder(img, { name: 'leaderboard.png' });

  const payload = {
    content: `🏆 Classement — ${SITE_BASE_URL}`,
    files: [attachment]
  };

  if (_leaderboardMessageId) {
    try {
      const msg = await _leaderboardChannel.messages.fetch(_leaderboardMessageId);
      await msg.edit(payload);
      return;
    } catch {
      _leaderboardMessageId = null;
    }
  }

  const msg = await _leaderboardChannel.send(payload);
  _leaderboardMessageId = msg.id;
}

// ============================================================
// INIT
// ============================================================
function initTierLeaderboard(client, guild, siteBaseUrl) {
  _client = client;
  _guild = guild;

  if (siteBaseUrl) {
    SITE_BASE_URL = siteBaseUrl.replace(/\/+$/, '');
  }

  sendOrUpdate();

  if (_intervalRef) clearInterval(_intervalRef);
  _intervalRef = setInterval(sendOrUpdate, TIER_LEADERBOARD_UPDATE_INTERVAL_MS);

  console.log('[TierLeaderboard] OK');
}

module.exports = { initTierLeaderboard };
