'use strict';

// ============================================================
// tier-leaderboard.js (PROD STABLE)
// ============================================================

const { AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');

// ================= CONFIG =================
const TIER_LEADERBOARD_CHANNEL_ID = '1505250882231468102';
const UPDATE_INTERVAL = 5 * 60 * 1000;

// ⚠️ IMPORTANT : URL backend (DOIT être publique)
const SITE_BASE_URL =
  process.env.SITE_BASE_URL || 'http://localhost:3000';

// ================= DESIGN =================
const TIER_ORDER = ['Tier S', 'Tier A', 'Tier B', 'Tier C', 'Tier D', 'Tier E'];

const TIER_COLORS = {
  'Tier S': '#FFD700',
  'Tier A': '#FF4500',
  'Tier B': '#FF8C00',
  'Tier C': '#9932CC',
  'Tier D': '#4169E1',
  'Tier E': '#2E8B57',
};

// ================= STATE =================
let clientRef = null;
let guildRef = null;
let channelRef = null;
let messageId = null;
let interval = null;

// ============================================================
// FETCH SAFE (retry + timeout)
// ============================================================
async function fetchTierPlayers() {
  const url = `${SITE_BASE_URL}/api/site/player-standings`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(7000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (!Array.isArray(data?.players)) {
        throw new Error('Invalid API format');
      }

      return data.players
        .filter(p => Number(p?.points || 0) > 0)
        .sort((a, b) => Number(b.points) - Number(a.points));

    } catch (err) {
      console.warn(`[TierLeaderboard] fetch retry ${attempt}/3 failed:`, err.message);

      if (attempt === 3) {
        throw new Error('Failed to fetch tier players after 3 attempts');
      }
    }
  }
}

// ============================================================
// UTILS
// ============================================================
function escape(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ============================================================
// IMAGE GENERATION
// ============================================================
async function generateImage(players) {
  const W = 1920;
  const HEADER = 100;
  const ROW = 45;
  const TIER_H = 40;
  const GAP = 8;
  const PAD = 30;

  const COL_W = W / 2;

  const byTier = {};
  for (const t of TIER_ORDER) byTier[t] = [];

  for (const p of players) {
    const t = p.tier || 'Tier E';
    if (byTier[t]) byTier[t].push(p);
  }

  const active = TIER_ORDER.filter(t => byTier[t].length);

  if (!active.length) throw new Error('No players');

  let col1 = [], col2 = [];
  let r1 = 0, r2 = 0;

  for (const t of active) {
    const size = byTier[t].length + 1;
    if (r1 <= r2) {
      col1.push(t);
      r1 += size;
    } else {
      col2.push(t);
      r2 += size;
    }
  }

  const H = HEADER + (Math.max(r1, r2) * ROW) + 300;

  const render = (tiers, x, startRank) => {
    let y = HEADER + PAD;
    let rank = startRank;
    let out = '';

    for (const t of tiers) {
      const list = byTier[t];
      const color = TIER_COLORS[t];

      out += `
        <rect x="${x}" y="${y}" width="${COL_W}" height="${TIER_H}" fill="#1A1A2E"/>
        <rect x="${x}" y="${y}" width="6" height="${TIER_H}" fill="${color}"/>
        <text x="${x + PAD}" y="${y + 26}" fill="${color}" font-size="18">
          ${escape(t)} (${list.length})
        </text>
      `;

      y += TIER_H + GAP;

      for (const p of list) {
        rank++;

        out += `
          <rect x="${x}" y="${y}" width="${COL_W}" height="${ROW}" fill="#0F172A"/>
          <text x="${x + PAD}" y="${y + 28}" fill="#FFD700">#${rank}</text>
          <text x="${x + 80}" y="${y + 28}" fill="#fff">${escape(truncate(p.name, 20))}</text>
          <text x="${x + COL_W - PAD}" y="${y + 28}" fill="${color}" text-anchor="end">
            ${Math.round(p.points)} pts
          </text>
        `;

        y += ROW;
      }

      y += GAP;
    }

    return out;
  };

  const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0A0A14"/>

  <text x="30" y="60" fill="#FFD700" font-size="28">
    LFN Tier Leaderboard
  </text>

  <text x="30" y="85" fill="#aaa" font-size="14">
    Auto-updated every 5 min
  </text>

  ${render(col1, 0, 0)}
  ${render(col2, COL_W, col1.reduce((s, t) => s + byTier[t].length, 0))}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

// ============================================================
// DISCORD UPDATE
// ============================================================
async function updateLeaderboard() {
  if (!clientRef || !guildRef) return;

  if (!channelRef) {
    channelRef = await guildRef.channels.fetch(TIER_LEADERBOARD_CHANNEL_ID).catch(() => null);
    if (!channelRef) return;
  }

  let players;
  try {
    players = await fetchTierPlayers();
  } catch (err) {
    console.error('[TierLeaderboard] fetch failed:', err.message);
    return;
  }

  let image;
  try {
    image = await generateImage(players);
  } catch (err) {
    console.error('[TierLeaderboard] image error:', err.message);
    return;
  }

  const file = new AttachmentBuilder(image, {
    name: 'tier-leaderboard.png',
  });

  const payload = {
    content: `🏆 LFN Tier Leaderboard — ${SITE_BASE_URL}`,
    files: [file],
  };

  // update existing message
  if (messageId) {
    try {
      const msg = await channelRef.messages.fetch(messageId);
      await msg.edit(payload);
      return;
    } catch {
      messageId = null;
    }
  }

  const sent = await channelRef.send(payload);
  messageId = sent.id;
}

// ============================================================
// INIT
// ============================================================
function initTierLeaderboard(client, guild, siteBaseUrl) {
  clientRef = client;
  guildRef = guild;

  if (siteBaseUrl) {
    process.env.SITE_BASE_URL = siteBaseUrl.replace(/\/+$/, '');
  }

  updateLeaderboard();

  if (interval) clearInterval(interval);

  interval = setInterval(updateLeaderboard, UPDATE_INTERVAL);

  console.log('[TierLeaderboard] initialized');
}

module.exports = { initTierLeaderboard };
