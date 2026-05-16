'use strict';

// ============================================================
// tier-leaderboard.js (STABLE DB VERSION)
// Génère un classement Tier LFN en image PNG via SVG + Sharp
// SOURCE: Supabase direct (lfn_player_tier_points)
// ============================================================

const { AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

// --- CONFIG ---
const TIER_LEADERBOARD_CHANNEL_ID = '1505250882231468102';
const UPDATE_INTERVAL_MS = 5 * 60 * 1000;

let SITE_BASE_URL = process.env.SITE_BASE_URL || 'https://lfn-esports.fr';

// --- SUPABASE ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- TIER CONFIG ---
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
let client = null;
let guild = null;
let channel = null;
let messageId = null;
let interval = null;

// ============================================================
// FETCH DATA (DB DIRECT - FIXED)
// ============================================================
async function fetchTierPlayers() {
  const { data, error } = await supabase
    .from('lfn_player_tier_points')
    .select('player_id, points, tier, season_id')
    .eq('season_id', 1)
    .gt('points', 0)
    .order('points', { ascending: false });

  if (error) throw new Error(`Supabase error: ${error.message}`);
  return data || [];
}

// ============================================================
// FETCH PLAYER PROFILES (NAMES)
// ============================================================
async function fetchProfiles(playerIds) {
  if (!playerIds.length) return {};

  const { data, error } = await supabase
    .from('lfn_player_profiles')
    .select('id, name, countryCode, teamTag, teamName')
    .in('id', playerIds);

  if (error) return {};

  const map = {};
  for (const p of data || []) {
    map[p.id] = p;
  }
  return map;
}

// ============================================================
// UTIL
// ============================================================
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const trunc = (s, n) =>
  s && s.length > n ? s.slice(0, n - 1) + '…' : s;

// ============================================================
// SVG GENERATION
// ============================================================
async function generateImage(players) {
  const W = 1920;
  const HEADER_H = 100;
  const ROW_H = 45;
  const TIER_H = 40;
  const GAP = 8;
  const PADDING = 30;
  const DIVIDER = 4;
  const COL_W = Math.floor((W - DIVIDER) / 2);

  const byTier = {};
  for (const t of TIER_ORDER) byTier[t] = [];

  for (const p of players) {
    const tier = p.tier || 'Tier E';
    if (!byTier[tier]) byTier[tier] = [];
    byTier[tier].push(p);
  }

  const activeTiers = TIER_ORDER.filter(t => byTier[t]?.length);

  let col1 = [], col2 = [];
  let r1 = 0, r2 = 0;

  for (const t of activeTiers) {
    const count = byTier[t].length + 1;
    if (r1 <= r2) {
      col1.push(t);
      r1 += count;
    } else {
      col2.push(t);
      r2 += count;
    }
  }

  const H = HEADER_H + 1000;

  function renderColumn(tiers, offsetX, rankStart) {
    let y = HEADER_H + PADDING;
    let rank = rankStart;
    let out = [];

    for (const tier of tiers) {
      const color = TIER_COLORS[tier];

      const list = byTier[tier];

      out.push(`
        <rect x="${offsetX}" y="${y}" width="${COL_W}" height="${TIER_H}" fill="#1A1A2E"/>
        <text x="${offsetX + 20}" y="${y + 25}" fill="${color}" font-size="18" font-weight="bold">
          ${tier} — ${list.length}
        </text>
      `);

      y += TIER_H + GAP;

      for (const p of list) {
        rank++;

        const bg = rank % 2 ? '#0F172A' : '#16213E';

        out.push(`
          <rect x="${offsetX}" y="${y}" width="${COL_W}" height="${ROW_H}" fill="${bg}"/>

          <text x="${offsetX + 20}" y="${y + 28}" fill="white">
            #${rank} ${esc(p.name)}
          </text>

          <text x="${offsetX + COL_W - 120}" y="${y + 28}" fill="${color}" text-anchor="end">
            ${p.points} pts
          </text>
        `);

        y += ROW_H;
      }

      y += GAP;
    }

    return out.join('');
  }

  return sharp(Buffer.from(`
    <svg width="${W}" height="${H}">
      <rect width="100%" height="100%" fill="#0A0A14"/>

      <rect width="${W}" height="${HEADER_H}" fill="#1A1A2E"/>
      <text x="30" y="50" fill="#FFD700" font-size="28">LFN Tier Leaderboard</text>

      ${renderColumn(col1, 0, 0)}
      ${renderColumn(col2, COL_W + DIVIDER, 0)}
    </svg>
  `))
    .png()
    .toBuffer();
}

// ============================================================
// MAIN UPDATE
// ============================================================
async function update() {
  try {
    const raw = await fetchTierPlayers();

    const profiles = await fetchProfiles(raw.map(r => r.player_id));

    const players = raw.map(r => {
      const p = profiles[r.player_id] || {};
      return {
        name: p.name || 'Unknown',
        points: r.points,
        tier: r.tier,
        countryCode: p.countryCode,
        teamTag: p.teamTag,
        teamName: p.teamName
      };
    });

    const img = await generateImage(players);

    const attachment = new AttachmentBuilder(img, {
      name: 'tier-leaderboard.png'
    });

    const payload = {
      content: `🏆 LFN Tier Leaderboard • ${new Date().toLocaleString('fr-FR')}`,
      files: [attachment]
    };

    if (!channel) {
      channel = await guild.channels.fetch(TIER_LEADERBOARD_CHANNEL_ID);
    }

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
    console.error('[TierLeaderboard] ERROR:', err.message);
  }
}

// ============================================================
// INIT
// ============================================================
function initTierLeaderboard(discordClient, discordGuild, baseUrl) {
  client = discordClient;
  guild = discordGuild;
  if (baseUrl) SITE_BASE_URL = baseUrl;

  update();

  if (interval) clearInterval(interval);
  interval = setInterval(update, UPDATE_INTERVAL_MS);

  console.log('[TierLeaderboard] initialized (DB DIRECT + stable)');
}

module.exports = { initTierLeaderboard };
