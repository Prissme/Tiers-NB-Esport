'use strict';

const { AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');

// ============================================================
// CONFIG
// ============================================================

const TIER_LEADERBOARD_CHANNEL_ID = '1505250882231468102';
const UPDATE_INTERVAL = 5 * 60 * 1000;

// ============================================================
// SUPABASE (DIRECT DB ACCESS)
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// STATE
// ============================================================

let clientRef = null;
let guildRef = null;
let channelRef = null;
let messageId = null;
let intervalRef = null;

// ============================================================
// FETCH DB DIRECT (FAST)
// ============================================================

async function fetchTierPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('id,name,tier,points,teamTag,countryCode')
    .gt('points', 0);

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  if (!Array.isArray(data)) return [];

  return data.sort((a, b) => (b.points || 0) - (a.points || 0));
}

// ============================================================
// UTILS
// ============================================================

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function trunc(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ============================================================
// IMAGE GENERATION (OPTIMIZED)
// ============================================================

async function generateLeaderboardImage(players) {
  const W = 1920;
  const HEADER_H = 100;
  const ROW_H = 45;
  const PAD = 30;
  const COL_W = W / 2;

  const TIERS = ['Tier S', 'Tier A', 'Tier B', 'Tier C', 'Tier D', 'Tier E'];

  const COLORS = {
    'Tier S': '#FFD700',
    'Tier A': '#FF4500',
    'Tier B': '#FF8C00',
    'Tier C': '#9932CC',
    'Tier D': '#4169E1',
    'Tier E': '#2E8B57',
  };

  const byTier = {};
  for (const t of TIERS) byTier[t] = [];

  for (const p of players) {
    const t = p.tier || 'Tier E';
    if (byTier[t]) byTier[t].push(p);
  }

  const active = TIERS.filter(t => byTier[t].length);

  let col1 = [];
  let col2 = [];
  let r1 = 0;
  let r2 = 0;

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

  const H = HEADER_H + Math.max(r1, r2) * ROW_H + 200;

  const render = (tiers, x, startRank) => {
    let y = HEADER_H + PAD;
    let rank = startRank;
    let out = '';

    for (const t of tiers) {
      const list = byTier[t];
      const color = COLORS[t];

      out += `
        <rect x="${x}" y="${y}" width="${COL_W}" height="40" fill="#1A1A2E"/>
        <text x="${x + PAD}" y="${y + 26}" fill="${color}" font-size="18">
          ${esc(t)} (${list.length})
        </text>
      `;

      y += 55;

      for (const p of list) {
        rank++;

        out += `
          <rect x="${x}" y="${y}" width="${COL_W}" height="${ROW_H}" fill="#0F172A"/>
          <text x="${x + PAD}" y="${y + 28}" fill="#FFD700">#${rank}</text>
          <text x="${x + 80}" y="${y + 28}" fill="#fff">
            ${esc(trunc(p.name, 22))}
          </text>
          <text x="${x + COL_W - PAD}" y="${y + 28}" fill="${color}" text-anchor="end">
            ${Math.round(p.points)} pts
          </text>
        `;

        y += ROW_H;
      }

      y += 10;
    }

    return out;
  };

  const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0A0A14"/>

  <text x="30" y="50" fill="#FFD700" font-size="28">
    LFN Tier Leaderboard
  </text>

  <text x="30" y="80" fill="#aaa" font-size="14">
    auto refresh 5min
  </text>

  ${render(col1, 0, 0)}
  ${render(col2, COL_W, col1.reduce((a, t) => a + byTier[t].length, 0))}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

// ============================================================
// DISCORD UPDATE (FAST + SAFE)
// ============================================================

async function updateLeaderboard() {
  if (!clientRef || !guildRef) return;

  try {
    if (!channelRef) {
      channelRef = await guildRef.channels.fetch(TIER_LEADERBOARD_CHANNEL_ID);
    }

    const players = await fetchTierPlayers();

    const image = await generateLeaderboardImage(players);

    const file = new AttachmentBuilder(image, {
      name: 'tier.png',
    });

    const payload = {
      content: `🏆 Tier Leaderboard — live`,
      files: [file],
    };

    if (messageId) {
      try {
        const msg = await channelRef.messages.fetch(messageId);
        await msg.edit(payload);
        console.log('[TierLeaderboard] updated');
        return;
      } catch {
        messageId = null;
      }
    }

    const sent = await channelRef.send(payload);
    messageId = sent.id;

    console.log('[TierLeaderboard] posted');
  } catch (err) {
    console.error('[TierLeaderboard] ERROR:', err.message);
  }
}

// ============================================================
// INIT
// ============================================================

function initTierLeaderboard(client, guild) {
  clientRef = client;
  guildRef = guild;

  updateLeaderboard();

  if (intervalRef) clearInterval(intervalRef);

  intervalRef = setInterval(updateLeaderboard, UPDATE_INTERVAL);

  console.log('[TierLeaderboard] initialized (DB DIRECT MODE)');
}

module.exports = { initTierLeaderboard };
