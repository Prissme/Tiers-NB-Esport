'use strict';

const { AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');

// ============================================================
// CONFIG
// ============================================================

let SITE_BASE_URL = process.env.SITE_BASE_URL || 'http://localhost:3000';

const CHANNEL_ID = '1505250882231468102';
const UPDATE_INTERVAL = 5 * 60 * 1000;

// fallback tiers (safe)
const TIER_ORDER = ['Tier S', 'Tier A', 'Tier B', 'Tier C', 'Tier D', 'Tier E'];

const TIER_COLORS = {
  'Tier S': '#FFD700',
  'Tier A': '#FF4500',
  'Tier B': '#FF8C00',
  'Tier C': '#9932CC',
  'Tier D': '#4169E1',
  'Tier E': '#2E8B57',
};

// ============================================================
// STATE
// ============================================================

let client = null;
let guild = null;
let channel = null;
let messageId = null;
let interval = null;

// ============================================================
// FETCH SAFE AVEC RETRY + TIMEOUT
// ============================================================

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function safeFetch(url, retries = 3) {
  let lastErr;

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      lastErr = err;
      console.warn(`[TierLeaderboard] fetch attempt ${i + 1}/${retries} failed:`, err.message);
      await sleep(800 * (i + 1)); // backoff progressif
    }
  }

  throw new Error(`Failed fetch after ${retries} retries: ${lastErr?.message}`);
}

// ============================================================
// SOURCE UNIQUE (IMPORTANT)
// ============================================================
// on utilise EXACTEMENT la même API que ton front Next.js
// => évite Supabase schema mismatch (ton bug actuel)

async function fetchPlayers() {
  const url = `${SITE_BASE_URL}/api/site/player-standings`;

  const data = await safeFetch(url, 3);

  if (!Array.isArray(data?.players)) {
    throw new Error('Invalid players format');
  }

  return data.players
    .filter(p => Number(p?.points || 0) > 0)
    .sort((a, b) => Number(b.points) - Number(a.points));
}

// ============================================================
// SVG GENERATOR
// ============================================================

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function trunc(str, n = 18) {
  str = String(str ?? '');
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

async function generateImage(players) {
  const W = 1920;
  const HEADER_H = 90;
  const ROW_H = 42;
  const TIER_H = 38;
  const GAP = 8;
  const PADDING = 28;
  const DIVIDER = 4;

  const COL_W = Math.floor((W - DIVIDER) / 2);

  const byTier = Object.fromEntries(TIER_ORDER.map(t => [t, []]));

  for (const p of players) {
    const tier = p.tier || 'Tier E';
    if (byTier[tier]) byTier[tier].push(p);
  }

  const active = TIER_ORDER.filter(t => byTier[t].length);

  let col1 = [], col2 = [];
  let r1 = 0, r2 = 0;

  for (const t of active) {
    const cost = byTier[t].length + 1;
    if (r1 <= r2) {
      col1.push(t);
      r1 += cost;
    } else {
      col2.push(t);
      r2 += cost;
    }
  }

  const H = HEADER_H + Math.max(r1, r2) * ROW_H + 400;

  function render(tiers, offset, startRank) {
    let y = HEADER_H + PADDING;
    let rank = startRank;
    const out = [];

    for (const t of tiers) {
      const list = byTier[t];
      const color = TIER_COLORS[t];

      out.push(`
        <rect x="${offset}" y="${y}" width="${COL_W}" height="${TIER_H}" fill="#111827" rx="6"/>
        <rect x="${offset}" y="${y}" width="5" height="${TIER_H}" fill="${color}" rx="3"/>
        <text x="${offset + 16}" y="${y + 26}" fill="${color}" font-size="16" font-weight="bold">
          ${esc(t)} (${list.length})
        </text>
      `);

      y += TIER_H + GAP;

      for (const p of list) {
        rank++;

        const bg = rank % 2 ? '#0B1220' : '#0F172A';

        out.push(`
          <rect x="${offset}" y="${y}" width="${COL_W}" height="${ROW_H}" fill="${bg}" rx="4"/>
          <text x="${offset + 14}" y="${y + 26}" fill="#fff" font-size="14">
            #${rank} ${trunc(esc(p.name))}
          </text>
          <text x="${offset + COL_W - 14}" y="${y + 26}" fill="${color}" font-size="14" text-anchor="end">
            ${Math.round(p.points)} pts
          </text>
        `);

        y += ROW_H;
      }

      y += GAP;
    }

    return out.join('');
  }

  const updated = new Date().toLocaleString('fr-FR');

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="100%" height="100%" fill="#050816"/>

    <rect width="100%" height="${HEADER_H}" fill="#0B1220"/>
    <text x="24" y="50" fill="#FFD700" font-size="26" font-weight="bold">
      LFN Tier Leaderboard
    </text>
    <text x="24" y="75" fill="#9CA3AF" font-size="14">
      ${players.length} joueurs • ${updated}
    </text>

    <rect x="${COL_W}" y="${HEADER_H}" width="${DIVIDER}" height="${H}" fill="#1F2937"/>

    ${render(col1, 0, 0)}
    ${render(col2, COL_W + DIVIDER, col1.reduce((a, t) => a + byTier[t].length, 0))}
  </svg>`;

  return sharp(Buffer.from(svg))
    .png()
    .toBuffer();
}

// ============================================================
// DISCORD UPDATE
// ============================================================

async function update() {
  if (!client || !guild) return;

  try {
    if (!channel) {
      channel = await guild.channels.fetch(CHANNEL_ID);
    }

    const players = await fetchPlayers();
    const img = await generateImage(players);

    const file = new AttachmentBuilder(img, { name: 'tier.png' });

    const payload = {
      content: `🏆 Tier Leaderboard • ${new Date().toLocaleString('fr-FR')}`,
      files: [file],
    };

    if (messageId) {
      try {
        const msg = await channel.messages.fetch(messageId);
        await msg.edit(payload);
        return;
      } catch {
        messageId = null;
      }
    }

    const sent = await channel.send(payload);
    messageId = sent.id;

  } catch (err) {
    console.error('[TierLeaderboard] update failed:', err.message);
  }
}

// ============================================================
// INIT
// ============================================================

function initTierLeaderboard(c, g, baseUrl) {
  client = c;
  guild = g;

  if (baseUrl) SITE_BASE_URL = baseUrl.replace(/\/+$/, '');

  update().catch(console.error);

  if (interval) clearInterval(interval);
  interval = setInterval(() => update().catch(console.error), UPDATE_INTERVAL);

  console.log('[TierLeaderboard] initialized (stable mode)');
}

module.exports = { initTierLeaderboard };
