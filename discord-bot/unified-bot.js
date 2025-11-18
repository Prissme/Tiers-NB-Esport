'use strict';

require('../ensure-fetch');

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  Partials,
  PermissionsBitField,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

const LOG_PREFIX = '[UnifiedBot]';
const TEAM_SIZE = 3;
const MATCH_SIZE = TEAM_SIZE * 2;
const DEFAULT_ELO = 1000;
const ELO_DIVISOR = 400;
const TIER_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MIN_VOTES_TO_RESOLVE = Math.max(
  1,
  Number.parseInt(process.env.MIN_VOTES_TO_RESOLVE || '5', 10)
);
const MAP_CHOICES_COUNT = 1;
const DODGE_VOTES_REQUIRED = 5;
const DODGE_ELO_PENALTY = 30;
const ROOM_TIER_ORDER = ['E', 'D', 'C', 'B', 'A', 'S'];
const BEST_OF_VALUES = [1, 3, 5];
const DEFAULT_MATCH_BEST_OF = normalizeBestOfInput(process.env.DEFAULT_MATCH_BEST_OF) || 1;
const MAX_QUEUE_ELO_DIFFERENCE = 175;

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const MATCH_CHANNEL_ID = process.env.MATCH_CHANNEL_ID || '1434509931360419890';
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || '1237166689188053023';
const PING_ROLE_ID = process.env.PING_ROLE_ID || '1437211411096010862';

const ROLE_TIER_S = process.env.ROLE_TIER_S;
const ROLE_TIER_A = process.env.ROLE_TIER_A;
const ROLE_TIER_B = process.env.ROLE_TIER_B;
const ROLE_TIER_C = process.env.ROLE_TIER_C;
const ROLE_TIER_D = process.env.ROLE_TIER_D;
const ROLE_TIER_E = process.env.ROLE_TIER_E;

const TIER_DISTRIBUTION = [
  { tier: 'S', ratio: 0.005, minCount: 1 },
  { tier: 'A', ratio: 0.02, minCount: 1 },
  { tier: 'B', ratio: 0.04, minCount: 1 },
  { tier: 'C', ratio: 0.1, minCount: 1 },
  { tier: 'D', ratio: 0.28, minCount: 1 },
  { tier: 'E', ratio: 0.555, minCount: 1 }
];

const UNRANKED_ELO_THRESHOLD = 1226;

const TIER_EMOJIS = {
  S: '<:tiers:1382755986120638505>',
  A: '<:tiera:1382755988494352555>',
  B: '<:tierb:1382755990352695456>',
  C: '<:tierc:1382755992126881932>',
  D: '<:tierd:1382755995524141106>',
  E: '<:tiere:1382755993695555626>'
};

const BRONZE_EMOJI = '<:Bronze:1439605520729116702>';
const SILVER_EMOJI = '<:Silver:1439995612069101681>';
const WISHED_EMOJI = '<:Wished:1439415315720175636>';

const WISHED_RANK_BRACKETS = [
  { min: 1200, label: 'Silver 5' },
  { min: 1175, label: 'Silver 4' },
  { min: 1150, label: 'Silver 3' },
  { min: 1125, label: 'Silver 2' },
  { min: 1100, label: 'Silver 1' },
  { min: 1080, label: 'Bronze 5' },
  { min: 1060, label: 'Bronze 4' },
  { min: 1040, label: 'Bronze 3' },
  { min: 1020, label: 'Bronze 2' },
  { min: 1000, label: 'Bronze 1' },
  { min: 980, label: 'Wished 5' },
  { min: 960, label: 'Wished 4' },
  { min: 940, label: 'Wished 3' },
  { min: 920, label: 'Wished 2' },
  { min: 900, label: 'Wished 1' },
  { min: -Infinity, label: 'Wished 0' }
];

function computeTierBoundaries(totalPlayers) {
  if (!totalPlayers || totalPlayers <= 0) {
    return [];
  }

  let remaining = totalPlayers;
  const boundaries = [];

  for (let index = 0; index < TIER_DISTRIBUTION.length; index += 1) {
    const distribution = TIER_DISTRIBUTION[index];
    const isLastTier = index === TIER_DISTRIBUTION.length - 1;

    let count;
    if (isLastTier) {
      count = remaining;
    } else {
      const futureMin = TIER_DISTRIBUTION.slice(index + 1).reduce(
        (sum, entry) => sum + (entry.minCount || 0),
        0
      );

      count = Math.floor(totalPlayers * distribution.ratio);
      if (count < distribution.minCount) {
        count = distribution.minCount;
      }

      const maxAllowed = remaining - futureMin;
      if (count > maxAllowed) {
        count = Math.max(distribution.minCount || 0, maxAllowed);
      }
    }

    remaining -= count;
    boundaries.push({ tier: distribution.tier, endRank: totalPlayers - remaining });

    if (remaining <= 0) {
      break;
    }
  }

  return boundaries;
}

function getTierByRank(rank, boundaries) {
  if (!Array.isArray(boundaries) || boundaries.length === 0) {
    return null;
  }

  for (const boundary of boundaries) {
    if (rank <= boundary.endRank) {
      return boundary.tier;
    }
  }

  return null;
}

function getVotesRequired(state = null) {
  const participantCount = state?.participants?.size;
  if (!participantCount || Number.isNaN(participantCount)) {
    return MIN_VOTES_TO_RESOLVE;
  }

  return Math.max(1, Math.min(participantCount, MIN_VOTES_TO_RESOLVE));
}

const MAP_ROTATION = [
  { mode: 'Razzia de gemmes', map: 'Mine hard-rock', emoji: '<:GemGrab:1436473738765008976>' },
  { mode: 'Razzia de gemmes', map: 'Tunnel de mine', emoji: '<:GemGrab:1436473738765008976>' },
  { mode: 'Razzia de gemmes', map: 'Bruissements', emoji: '<:GemGrab:1436473738765008976>' },
  { mode: 'Brawlball', map: 'Tir au buts', emoji: '<:Brawlball:1436473735573143562>' },
  { mode: 'Brawlball', map: 'Super plage', emoji: '<:Brawlball:1436473735573143562>' },
  { mode: 'Brawlball', map: 'Triple Dribble', emoji: '<:Brawlball:1436473735573143562>' },
  { mode: 'Hors-jeu', map: 'Rocher de la belle', emoji: '<:KnockOut:1436473703083937914>' },
  { mode: 'Hors-jeu', map: "Ravin du bras d'or", emoji: '<:KnockOut:1436473703083937914>' },
  { mode: 'Hors-jeu', map: 'À découvert', emoji: '<:KnockOut:1436473703083937914>' },
  { mode: 'Braquage', map: "C'est chaud patate", emoji: '<:Heist:1436473730812481546>' },
  { mode: 'Braquage', map: 'Arrêt au stand', emoji: '<:Heist:1436473730812481546>' },
  { mode: 'Braquage', map: 'Zone sécurisée', emoji: '<:Heist:1436473730812481546>' },
  { mode: 'Zone réservée', map: 'Duel de scarabées', emoji: '<:HotZone:1436473698491175137>' },
  { mode: 'Zone réservée', map: 'Cercle de feu', emoji: '<:HotZone:1436473698491175137>' },
  { mode: 'Zone réservée', map: 'Stratégies parallèles', emoji: '<:HotZone:1436473698491175137>' },
  { mode: 'Prime', map: 'Cachette secrète', emoji: '<:Bounty:1436473727519948962>' },
  { mode: 'Prime', map: 'Étoile filante', emoji: '<:Bounty:1436473727519948962>' },
  { mode: 'Prime', map: 'Mille-feuille', emoji: '<:Bounty:1436473727519948962>' }
];

if (!DISCORD_BOT_TOKEN) {
  throw new Error('DISCORD_BOT_TOKEN is not set.');
}

if (!DISCORD_GUILD_ID) {
  throw new Error('DISCORD_GUILD_ID is not set.');
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Supabase configuration is incomplete. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

function createSupabaseClient() {
  return supabase;
}

async function verifySupabaseConnection() {
  try {
    log('Testing Supabase connectivity...');
    const { error } = await supabase.from('players').select('id').limit(1);
    if (error) {
      throw error;
    }
    log('Supabase connection verified.');
  } catch (err) {
    errorLog('Supabase connection check failed:', err);
    throw err;
  }
}

const tierRoleMap = {
  S: ROLE_TIER_S,
  A: ROLE_TIER_A,
  B: ROLE_TIER_B,
  C: ROLE_TIER_C,
  D: ROLE_TIER_D,
  E: ROLE_TIER_E
};

function getMemberTier(member) {
  const roleCache = member?.roles?.cache;
  if (!roleCache) {
    return null;
  }

  for (let index = ROOM_TIER_ORDER.length - 1; index >= 0; index -= 1) {
    const tier = ROOM_TIER_ORDER[index];
    const roleId = tierRoleMap[tier];
    if (roleId && roleCache.has(roleId)) {
      return tier;
    }
  }

  return null;
}

const missingRoles = Object.entries(tierRoleMap)
  .filter(([, roleId]) => !roleId)
  .map(([tier]) => tier);

if (missingRoles.length) {
  console.warn(`${LOG_PREFIX} Missing role IDs for tiers: ${missingRoles.join(', ')}.`);
}

let client = null;
let guild = null;
let matchChannel = null;
let logChannel = null;
let tierSyncInterval = null;
let botStarted = false;

const QUEUE_COUNT = 2;
const matchQueues = Array.from({ length: QUEUE_COUNT }, () => []);
const queueEntries = new Map();
const activeMatches = new Map();
const pendingRoomForms = new Map();
const customRooms = new Map();

const LANGUAGE_FR = 'fr';
const LANGUAGE_EN = 'en';
const DEFAULT_LANGUAGE = LANGUAGE_FR;

let currentLanguage =
  process.env.DEFAULT_BOT_LANGUAGE && process.env.DEFAULT_BOT_LANGUAGE.toLowerCase() === LANGUAGE_EN
    ? LANGUAGE_EN
    : DEFAULT_LANGUAGE;

function formatTemplate(template, variables = {}) {
  if (typeof template !== 'string') {
    return template ?? '';
  }

  return template.replace(/\{(\w+)\}/g, (_, key) => (variables[key] ?? `{${key}}`));
}

function localizeText(template, variables = {}) {
  if (template == null) {
    return '';
  }

  if (typeof template === 'string') {
    return formatTemplate(template, variables);
  }

  const selected =
    currentLanguage === LANGUAGE_EN
      ? template.en ?? template.fr ?? ''
      : template.fr ?? template.en ?? '';

  return formatTemplate(selected, variables);
}

function findRoomByMember(userId) {
  for (const room of customRooms.values()) {
    if (room.members?.has(userId)) {
      return room;
    }
  }
  return null;
}

function findActiveMatchByParticipant(userId) {
  for (const matchState of activeMatches.values()) {
    if (!matchState.resolved && matchState.participants?.has(userId)) {
      return matchState;
    }
  }

  return null;
}

function log(...args) {
  console.log(LOG_PREFIX, ...args);
}

function warn(...args) {
  console.warn(LOG_PREFIX, ...args);
}

function errorLog(...args) {
  console.error(LOG_PREFIX, ...args);
}

function pickRandomMaps(count) {
  const available = MAP_ROTATION.slice();
  const selections = [];

  for (let i = available.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  for (let i = 0; i < Math.min(count, available.length); i += 1) {
    selections.push(available[i]);
  }

  return selections;
}

function normalizeRating(value) {
  return typeof value === 'number' ? value : DEFAULT_ELO;
}

function getWishedRankByElo(rating) {
  const normalized = normalizeRating(rating);

  if (normalized >= UNRANKED_ELO_THRESHOLD) {
    return null;
  }

  for (const bracket of WISHED_RANK_BRACKETS) {
    if (normalized >= bracket.min) {
      return bracket.label;
    }
  }

  return WISHED_RANK_BRACKETS[WISHED_RANK_BRACKETS.length - 1].label;
}

function getTierLabelByRank(rank, totalPlayers) {
  if (!rank || !totalPlayers) {
    return null;
  }

  const boundaries = computeTierBoundaries(totalPlayers);
  return getTierByRank(rank, boundaries);
}

function formatTierEmoji(tier) {
  if (!tier) {
    return null;
  }

  return TIER_EMOJIS[tier] || tier;
}

function formatWishedRankLabel(label) {
  if (!label) {
    return null;
  }

  const match = label.match(/(\d+)/);
  if (!match) {
    return label;
  }

  const value = Number.parseInt(match[1], 10);
  const romanNumerals = ['0', 'I', 'II', 'III', 'IV', 'V'];
  const numeral = romanNumerals[value] || String(value);

  const lowerLabel = label.toLowerCase();
  const emoji = lowerLabel.startsWith('silver')
    ? SILVER_EMOJI
    : lowerLabel.startsWith('bronze')
      ? BRONZE_EMOJI
      : WISHED_EMOJI;

  return `${emoji} ${numeral}`;
}

async function getSiteRankingInfo(targetDiscordId) {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('discord_id, mmr, solo_elo')
      .eq('active', true)
      .not('discord_id', 'is', null);

    if (error) {
      throw error;
    }

    const targetIdText = targetDiscordId?.toString();

    const rankedPlayers = (data || [])
      .map((entry) => {
        const soloElo = normalizeRating(entry.solo_elo);
        const mmr = normalizeRating(entry.mmr);

        return {
          discord_id: entry.discord_id,
          weightedScore: calculateWeightedScore(soloElo, mmr)
        };
      })
      .sort((a, b) => b.weightedScore - a.weightedScore);

    const totalPlayers = rankedPlayers.length;
    const playerIndex = rankedPlayers.findIndex((entry) => entry.discord_id?.toString() === targetIdText);
    const rank = playerIndex === -1 ? null : playerIndex + 1;
    const tier = rank ? getTierByRank(rank, computeTierBoundaries(totalPlayers)) : null;

    return { rank, tier, totalPlayers };
  } catch (err) {
    warn('Unable to compute site ranking info:', err.message);
    return { rank: null, tier: null, totalPlayers: null };
  }
}

function normalizeTierInput(value) {
  if (!value) {
    return null;
  }

  const cleaned = value.toString().trim().toUpperCase();
  return ROOM_TIER_ORDER.includes(cleaned) ? cleaned : null;
}

function normalizeBestOfInput(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'number' && BEST_OF_VALUES.includes(value)) {
    return value;
  }

  const text = value.toString().trim().toUpperCase();
  if (!text) {
    return null;
  }

  const numeric = parseInt(text, 10);
  if (!Number.isNaN(numeric) && BEST_OF_VALUES.includes(numeric)) {
    return numeric;
  }

  if (text.startsWith('BO')) {
    const suffix = parseInt(text.slice(2), 10);
    if (!Number.isNaN(suffix) && BEST_OF_VALUES.includes(suffix)) {
      return suffix;
    }
  }

  return null;
}

function getKFactorForBestOf() {
  return 30;
}

function isValidTierRange(minTier, maxTier) {
  const minIndex = ROOM_TIER_ORDER.indexOf(minTier);
  const maxIndex = ROOM_TIER_ORDER.indexOf(maxTier);

  return minIndex !== -1 && maxIndex !== -1 && minIndex <= maxIndex;
}

function isTierWithinRange(playerTier, minTier, maxTier) {
  if (!playerTier || !minTier || !maxTier) {
    return false;
  }

  const playerIndex = ROOM_TIER_ORDER.indexOf(playerTier);
  const minIndex = ROOM_TIER_ORDER.indexOf(minTier);
  const maxIndex = ROOM_TIER_ORDER.indexOf(maxTier);

  if (playerIndex === -1 || minIndex === -1 || maxIndex === -1) {
    return false;
  }

  return playerIndex >= minIndex && playerIndex <= maxIndex;
}

function calculateWeightedScore(soloElo, mmr) {
  const safeSoloElo = normalizeRating(soloElo);
  const safeMmr = normalizeRating(mmr);
  return Math.round(safeSoloElo * 0.3 + safeMmr * 0.7);
}

function describeStreak(winStreak, loseStreak, { short = false } = {}) {
  const wins = Number.isFinite(winStreak) ? winStreak : 0;
  const losses = Number.isFinite(loseStreak) ? loseStreak : 0;

  if (wins > 0) {
    const label = short
      ? localizeText({ fr: '🔥 x{count}', en: '🔥 x{count}' }, { count: wins })
      : localizeText(
          { fr: '🔥 {count} victoire(s) consécutive(s)', en: '🔥 {count} win(s) in a row' },
          { count: wins }
        );
    return { label, type: 'win' };
  }

  if (losses > 0) {
    const label = short
      ? localizeText({ fr: '💀 x{count}', en: '💀 x{count}' }, { count: losses })
      : localizeText(
          { fr: '💀 {count} défaite(s) consécutive(s)', en: '💀 {count} loss(es) in a row' },
          { count: losses }
        );
    return { label, type: 'lose' };
  }

  const neutralLabel = localizeText({ fr: 'Série neutre', en: 'Neutral streak' });
  return { label: neutralLabel, type: 'neutral' };
}

function formatPlayerList(team) {
  if (!team.length) {
    return '—';
  }

  return team
    .map(
      (player, index) =>
        `${index + 1}. <@${player.discordId}> (${Math.round(normalizeRating(player.soloElo))} Elo)`
    )
    .join('\n');
}

function calculateAverageElo(team) {
  if (!team.length) {
    return DEFAULT_ELO;
  }

  const total = team.reduce((sum, player) => sum + normalizeRating(player.soloElo), 0);
  return total / team.length;
}

function findPlayerInTeams(teams, discordId) {
  return teams.blue.find((player) => player.discordId === discordId) ||
    teams.red.find((player) => player.discordId === discordId) ||
    null;
}

function formatDodgeVoteLines(state) {
  const { dodgeVotes, teams } = state;

  if (!dodgeVotes) {
    return [];
  }

  const entries = Array.isArray(dodgeVotes)
    ? dodgeVotes
    : dodgeVotes instanceof Map
      ? [...dodgeVotes.entries()]
      : Object.entries(dodgeVotes);

  const lines = [];

  for (const [targetId, voters] of entries) {
    const voteCount = voters instanceof Set ? voters.size : Array.isArray(voters) ? voters.length : 0;
    if (!voteCount) {
      continue;
    }

    const player = findPlayerInTeams(teams, targetId);
    const playerLabel = player?.displayName || `<@${targetId}>`;

    lines.push(
      localizeText({ fr: '{name} : {count} vote(s)', en: '{name}: {count} vote(s)' }, {
        name: playerLabel,
        count: voteCount
      })
    );
  }

  return lines;
}

function buildDodgeSelectMenu(state) {
  const options = [...state.teams.blue, ...state.teams.red].map((player) => ({
    label: player.displayName || `<@${player.discordId}>`,
    value: player.discordId,
    description: localizeText({ fr: '{elo} Elo', en: '{elo} Elo' }, {
      elo: Math.round(normalizeRating(player.soloElo))
    })
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId(`match:dodge-select:${state.matchId}`)
    .setPlaceholder(localizeText({ fr: 'Qui a dodge ?', en: 'Who dodged?' }))
    .addOptions(options.slice(0, 25));

  return new ActionRowBuilder().addComponents(select);
}

async function applyDodgePenalty(targetPlayer) {
  if (!targetPlayer?.playerId) {
    return { success: false, reason: 'missing-profile' };
  }

  const currentRating = normalizeRating(targetPlayer.soloElo);
  const newRating = Math.max(0, currentRating - DODGE_ELO_PENALTY);

  const { error } = await supabase
    .from('players')
    .update({ solo_elo: newRating })
    .eq('id', targetPlayer.playerId);

  if (error) {
    throw new Error(`Unable to apply dodge penalty to ${targetPlayer.playerId}: ${error.message}`);
  }

  targetPlayer.soloElo = newRating;

  await sendLogMessage(
    localizeText(
      {
        fr: '🚫 {name} perd {penalty} Elo (5 votes dodge).',
        en: '🚫 {name} loses {penalty} Elo (5 dodge votes).'
      },
      { name: targetPlayer.displayName || `<@${targetPlayer.discordId}>`, penalty: DODGE_ELO_PENALTY }
    )
  );

  return { success: true, newRating };
}

async function refreshMatchMessage(matchState, client) {
  const channel = await client.channels.fetch(matchState.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return;
  }

  const message = await channel.messages.fetch(matchState.messageId).catch(() => null);
  if (!message) {
    return;
  }

  await message.edit({ embeds: [buildMatchEmbed(matchState)], components: [buildResultButtons(false)] });
}

function buildPrivateMatchEmbed(state) {
  const { requestedBy, primaryMap, mapChoices = [], teams, createdAt } = state;
  const title = primaryMap
    ? `${primaryMap.emoji} ${primaryMap.mode} — ${primaryMap.map}`
    : localizeText({ fr: 'Partie privée', en: 'Private match' });

  const embed = new EmbedBuilder()
    .setTitle(
      localizeText({ fr: 'Partie privée — {title}', en: 'Private match — {title}' }, { title })
    )
    .setDescription(
      localizeText({ fr: 'Proposée par <@{userId}>', en: 'Created by <@{userId}>' }, { userId: requestedBy })
    )
    .addFields(
      {
        name: localizeText({ fr: 'Équipe Bleue', en: 'Blue team' }),
        value: formatPlayerList(teams.blue),
        inline: true
      },
      {
        name: localizeText({ fr: 'Équipe Rouge', en: 'Red team' }),
        value: formatPlayerList(teams.red),
        inline: true
      }
    )
    .setTimestamp(createdAt || new Date())
    .setColor(0x9b59b6)
    .setFooter({
      text: localizeText({
        fr: 'Match amical — aucun résultat enregistré',
        en: 'Friendly match — no result recorded'
      })
    });

  if (mapChoices.length) {
    const mapLines = mapChoices
      .map((choice, index) => `${index + 1}. ${choice.emoji} ${choice.mode} — ${choice.map}`)
      .join('\n');
    embed.addFields({
      name: localizeText({ fr: 'Maps proposées', en: 'Suggested maps' }),
      value: mapLines
    });
  }

  const blueAvg = calculateAverageElo(teams.blue);
  const redAvg = calculateAverageElo(teams.red);
  const diff = Math.abs(blueAvg - redAvg);

  embed.addFields({
    name: localizeText({ fr: 'Équilibre Elo', en: 'Elo balance' }),
    value: [
      localizeText({ fr: 'Bleus : {value}', en: 'Blue: {value}' }, { value: Math.round(blueAvg) }),
      localizeText({ fr: 'Rouges : {value}', en: 'Red: {value}' }, { value: Math.round(redAvg) }),
      localizeText({ fr: 'Écart : {value}', en: 'Difference: {value}' }, { value: Math.round(diff) })
    ].join('\n')
  });

  return embed;
}

function buildMatchEmbed(state, resultSummary = null) {
  const { primaryMap, mapChoices = [], teams, createdAt, votes } = state;
  const votesRequired = getVotesRequired(state);
  const title = primaryMap
    ? `${primaryMap.emoji} ${primaryMap.mode} — ${primaryMap.map}`
    : localizeText({ fr: 'Match en attente', en: 'Match pending' });

  const embed = new EmbedBuilder()
    .setTitle(title)
    .addFields(
      {
        name: localizeText({ fr: 'Équipe Bleue', en: 'Blue team' }),
        value: formatPlayerList(teams.blue),
        inline: true
      },
      {
        name: localizeText({ fr: 'Équipe Rouge', en: 'Red team' }),
        value: formatPlayerList(teams.red),
        inline: true
      }
    )
    .setTimestamp(createdAt || new Date())
    .setColor(resultSummary ? resultSummary.color : 0xffc300);

  if (mapChoices.length) {
    const mapLines = mapChoices
      .map((choice, index) => `${index + 1}. ${choice.emoji} ${choice.mode} — ${choice.map}`)
      .join('\n');
    embed.addFields({
      name: localizeText({ fr: 'Maps proposées', en: 'Suggested maps' }),
      value: mapLines
    });
  }

  const bestOf = state.bestOf || DEFAULT_MATCH_BEST_OF;
  const kFactor = state.kFactor || getKFactorForBestOf(bestOf);
  if (bestOf) {
    embed.addFields({
      name: localizeText({ fr: 'Format', en: 'Format' }),
      value: localizeText(
        { fr: 'Bo{bestOf} — Facteur K {kFactor}', en: 'Bo{bestOf} — K-factor {kFactor}' },
        { bestOf, kFactor }
      ),
      inline: true
    });
  }

  const dodgeVoteEntries = formatDodgeVoteLines(state);
  if (dodgeVoteEntries.length) {
    embed.addFields({
      name: localizeText({ fr: 'Votes dodge', en: 'Dodge votes' }),
      value: dodgeVoteEntries.join('\n')
    });
  }

  if (resultSummary) {
    embed.addFields({
      name: localizeText({ fr: 'Résultat', en: 'Result' }),
      value: resultSummary.text
    });
  } else {
    if (votes) {
      const voteLines = [
        localizeText({ fr: '🔵 Victoire Bleue : {count}', en: '🔵 Blue victory: {count}' }, { count: votes.blue.size }),
        localizeText({ fr: '🔴 Victoire Rouge : {count}', en: '🔴 Red victory: {count}' }, { count: votes.red.size }),
        localizeText({ fr: '⚪ Match annulé : {count}', en: '⚪ Match cancelled: {count}' }, {
          count: votes.cancel.size
        })
      ].join('\n');
      embed.addFields({ name: localizeText({ fr: 'Votes', en: 'Votes' }), value: voteLines });
    }

    embed.setFooter({
      text: localizeText(
        {
          fr: 'Votez pour le résultat avec les boutons ci-dessous. ({count} votes nécessaires)',
          en: 'Vote for the result using the buttons below. ({count} votes required)'
        },
        { count: votesRequired }
      )
    });
  }

  return embed;
}

function buildResultButtons(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('match:blue')
      .setLabel(localizeText({ fr: 'Victoire Bleue', en: 'Blue victory' }))
      .setEmoji('🔵')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('match:red')
      .setLabel(localizeText({ fr: 'Victoire Rouge', en: 'Red victory' }))
      .setEmoji('🔴')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('match:dodge')
      .setLabel(localizeText({ fr: 'Vote dodge', en: 'Vote dodge' }))
      .setEmoji('⚠️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('match:cancel')
      .setLabel(localizeText({ fr: 'Match annulé', en: 'Match cancelled' }))
      .setEmoji('⚪')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled)
  );
}

function calculateExpectedScore(rating, opponentRating) {
  return 1 / (1 + Math.pow(10, (opponentRating - rating) / ELO_DIVISOR));
}

async function fetchPlayerByDiscordId(discordId) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase error while fetching player ${discordId}: ${error.message}`);
  }

  return data || null;
}

async function getOrCreatePlayer(discordId, displayName) {
  const existing = await fetchPlayerByDiscordId(discordId);
  if (existing) {
    const mmr = normalizeRating(existing.mmr);
    const soloElo = normalizeRating(existing.solo_elo);

    if (displayName && displayName !== existing.name) {
      const { error: updateError } = await supabase
        .from('players')
        .update({ name: displayName })
        .eq('id', existing.id);

      if (updateError) {
        warn(`Unable to sync display name for player ${discordId}:`, updateError.message);
      }
    }

    return { ...existing, mmr, solo_elo: soloElo };
  }

  const insertPayload = {
    discord_id: discordId,
    name: displayName || null,
    mmr: DEFAULT_ELO,
    solo_elo: DEFAULT_ELO,
    wins: 0,
    losses: 0,
    games_played: 0,
    win_streak: 0,
    lose_streak: 0,
    active: true
  };

  const { data: inserted, error } = await supabase
    .from('players')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to create player ${discordId}: ${error.message}`);
  }

  log(`Created new player entry for ${discordId}.`);
  return inserted;
}

function buildQueueEntry(member, playerRecord) {
  const wins = typeof playerRecord.wins === 'number' ? playerRecord.wins : 0;
  const losses = typeof playerRecord.losses === 'number' ? playerRecord.losses : 0;
  const games = typeof playerRecord.games_played === 'number' ? playerRecord.games_played : wins + losses;
  const winStreak = typeof playerRecord.win_streak === 'number' ? playerRecord.win_streak : 0;
  const loseStreak = typeof playerRecord.lose_streak === 'number' ? playerRecord.lose_streak : 0;

  return {
    discordId: member.id,
    displayName: member.displayName || member.user.username,
    playerId: playerRecord.id,
    mmr: normalizeRating(playerRecord.mmr),
    soloElo: normalizeRating(playerRecord.solo_elo),
    wins,
    losses,
    games,
    winStreak,
    loseStreak,
    joinedAt: new Date()
  };
}

function computeQueueEloRange(entries) {
  if (!entries?.length) {
    return { min: null, max: null, diff: 0 };
  }

  let min = Infinity;
  let max = -Infinity;

  for (const entry of entries) {
    const elo = normalizeRating(entry.soloElo);
    if (elo < min) {
      min = elo;
    }
    if (elo > max) {
      max = elo;
    }
  }

  return { min, max, diff: max - min };
}

function computeQueueAverageElo(entries) {
  if (!entries?.length) {
    return null;
  }

  const total = entries.reduce((sum, entry) => sum + normalizeRating(entry.soloElo), 0);
  return total / entries.length;
}

function formatQueueStatus() {
  const hasEntries = matchQueues.some((queue) => queue.length);

  if (!hasEntries) {
    return localizeText({
      fr: 'Les files sont vides. Utilisez `!join` pour participer.',
      en: 'Queues are empty. Use `!join` to participate.'
    });
  }

  const sections = matchQueues.map((queue, index) => {
    if (!queue.length) {
      return localizeText(
        { fr: 'File {id} vide.', en: 'Queue {id} is empty.' },
        { id: index + 1 }
      );
    }

    const lines = queue.map((entry, playerIndex) => {
      const rank = playerIndex + 1;
      return formatTemplate('{rank}. {name} ({elo} Elo)', {
        rank,
        name: entry.displayName,
        elo: Math.round(normalizeRating(entry.soloElo))
      });
    });

    return [
      localizeText(
        { fr: 'File {id} ({count}/{size}) :', en: 'Queue {id} ({count}/{size}):' },
        { id: index + 1, count: queue.length, size: MATCH_SIZE }
      ),
      ...lines
    ].join('\n');
  });

  return sections.join('\n\n');
}

function shufflePlayers(players) {
  const shuffled = [...players];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function assignRandomTeams(players) {
  const shuffled = shufflePlayers(players);

  return {
    blue: shuffled.slice(0, TEAM_SIZE),
    red: shuffled.slice(TEAM_SIZE, TEAM_SIZE * 2)
  };
}

async function sendLogMessage(content) {
  if (!logChannel || !logChannel.isTextBased()) {
    return;
  }

  try {
    await logChannel.send(content);
  } catch (err) {
    warn('Unable to send log message:', err.message);
  }
}

async function handleCreateRoomCommand(message) {
  const leaderId = message.author.id;

  for (const [requestId, entry] of pendingRoomForms.entries()) {
    if (entry.leaderId === leaderId) {
      pendingRoomForms.delete(requestId);
    }
  }

  const requestId = `${Date.now()}-${leaderId}`;
  pendingRoomForms.set(requestId, { leaderId, channelId: message.channel.id, createdAt: Date.now() });

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`room:open:${requestId}`)
      .setLabel(localizeText({ fr: 'Remplir le formulaire', en: 'Fill out the form' }))
      .setStyle(ButtonStyle.Primary)
  );

  await message.reply({
    content: localizeText({
      fr: 'Cliquez sur le bouton pour renseigner le code de la room et les tiers autorisés. Seul le créateur peut remplir ce formulaire.',
      en: 'Click the button to provide the room code and allowed tiers. Only the creator can submit this form.'
    }),
    components: [actionRow]
  });
}

async function handleRoomJoinRequest(message, leaderUser) {
  const room = customRooms.get(leaderUser.id);

  if (!room) {
    await message.reply({
      content: localizeText({
        fr: 'Aucune room active trouvée pour <@{leaderId}>.',
        en: 'No active room found for <@{leaderId}>.'
      }, { leaderId: leaderUser.id })
    });
    return;
  }

  if (!room.members) {
    room.members = new Set([room.leaderId]);
  }

  if (room.members.has(message.author.id)) {
    await message.reply({
      content: localizeText({
        fr: 'Vous êtes déjà inscrit dans cette room.',
        en: 'You are already registered in this room.'
      })
    });
    return;
  }

  const guildContext = message.guild || guild;
  const member =
    message.member ||
    (guildContext ? await guildContext.members.fetch(message.author.id).catch(() => null) : null);

  if (!member) {
    await message.reply({
      content: localizeText({
        fr: 'Impossible de vérifier votre tier. Réessayez dans un instant.',
        en: 'Unable to verify your tier. Please try again shortly.'
      })
    });
    return;
  }

  const playerTier = getMemberTier(member);
  if (!playerTier) {
    await message.reply({
      content: localizeText({
        fr: '❌ Aucun rôle de tier détecté. Synchronisez vos rôles (`!tiers`) pour rejoindre cette room.',
        en: '❌ No tier role detected. Sync your roles (`!tiers`) to join this room.'
      })
    });
    return;
  }

  const roomBestOf = room.bestOf || DEFAULT_MATCH_BEST_OF;
  const roomKFactor = room.kFactor || getKFactorForBestOf(roomBestOf);
  room.bestOf = roomBestOf;
  room.kFactor = roomKFactor;

  if (!isTierWithinRange(playerTier, room.minTier, room.maxTier)) {
    await message.reply({
      content: localizeText(
        {
          fr: '❌ Cette room accepte uniquement les joueurs entre {minTier} et {maxTier}. Ton tier actuel : {currentTier}.',
          en: '❌ This room only accepts players between {minTier} and {maxTier}. Your current tier: {currentTier}.'
        },
        { minTier: room.minTier, maxTier: room.maxTier, currentTier: playerTier }
      )
    });
    return;
  }

  room.members.add(message.author.id);

  await message.reply({
    content: localizeText(
      {
        fr: '✅ <@{memberId}> a rejoint la room de <@{leaderId}>.\nCode de la room : `{code}`\nTiers autorisés : {minTier} → {maxTier}\nFormat : Bo{bestOf} — Facteur K {kFactor}',
        en: '✅ <@{memberId}> joined <@{leaderId}>\'s room.\nRoom code: `{code}`\nAllowed tiers: {minTier} → {maxTier}\nFormat: Bo{bestOf} — K-factor {kFactor}'
      },
      {
        memberId: message.author.id,
        leaderId: leaderUser.id,
        code: room.code,
        minTier: room.minTier,
        maxTier: room.maxTier,
        bestOf: roomBestOf,
        kFactor: roomKFactor
      }
    )
  });
}

async function handleRoomInfoCommand(message) {
  const room = findRoomByMember(message.author.id);

  if (!room) {
    await message.reply({
      content: localizeText({
        fr: "Vous n'êtes inscrit dans aucune room personnalisée.",
        en: 'You are not in any custom room.'
      })
    });
    return;
  }

  const members = [...room.members].map((id) => `<@${id}>`).join(', ');
  const bestOf = room.bestOf || DEFAULT_MATCH_BEST_OF;
  const kFactor = room.kFactor || getKFactorForBestOf(bestOf);
  room.bestOf = bestOf;
  room.kFactor = kFactor;
  const embed = new EmbedBuilder()
    .setTitle(localizeText({ fr: 'Room personnalisée', en: 'Custom room' }))
    .setDescription(
      localizeText({ fr: 'Créée par <@{leaderId}>', en: 'Created by <@{leaderId}>' }, { leaderId: room.leaderId })
    )
    .addFields(
      {
        name: localizeText({ fr: 'Code', en: 'Code' }),
        value: `\`${room.code}\``,
        inline: true
      },
      {
        name: localizeText({ fr: 'Tiers', en: 'Tiers' }),
        value: `${room.minTier} → ${room.maxTier}`,
        inline: true
      },
      {
        name: localizeText({ fr: 'Format', en: 'Format' }),
        value: localizeText(
          { fr: 'Bo{bestOf} — Facteur K {kFactor}', en: 'Bo{bestOf} — K-factor {kFactor}' },
          { bestOf, kFactor }
        ),
        inline: true
      },
      {
        name: localizeText({ fr: 'Membres', en: 'Members' }),
        value: members || localizeText({ fr: '—', en: '—' })
      }
    )
    .setColor(0x2ecc71)
    .setTimestamp(room.createdAt);

  await message.reply({ embeds: [embed] });
}

async function handleRoomLeaveCommand(message) {
  const room = findRoomByMember(message.author.id);

  if (!room) {
    await message.reply({
      content: localizeText({
        fr: "Vous n'êtes inscrit dans aucune room personnalisée.",
        en: 'You are not in any custom room.'
      })
    });
    return;
  }

  if (room.leaderId === message.author.id) {
    customRooms.delete(room.leaderId);
    await message.reply({
      content: localizeText({
        fr: 'Vous avez fermé votre room personnalisée.',
        en: 'You closed your custom room.'
      })
    });
    return;
  }

  room.members?.delete(message.author.id);
  await message.reply({
    content: localizeText(
      { fr: 'Vous avez quitté la room de <@{leaderId}>.', en: 'You left <@{leaderId}>\'s room.' },
      { leaderId: room.leaderId }
    )
  });
}

async function handleJoinCommand(message, args) {
  const mentionedUser = message.mentions.users.first();

  if (mentionedUser) {
    await handleRoomJoinRequest(message, mentionedUser);
    return;
  }

  const member = message.member || (guild ? await guild.members.fetch(message.author.id).catch(() => null) : null);

  if (!member) {
    await message.reply({
      content: localizeText({
        fr: 'Impossible de récupérer votre profil Discord.',
        en: 'Unable to retrieve your Discord profile.'
      })
    });
    return;
  }

  const activeMatch = findActiveMatchByParticipant(member.id);

  if (activeMatch) {
    await message.reply({
      content: localizeText({
        fr: 'Vous êtes déjà inscrit dans un match en attente. Attendez sa validation avant de rejoindre la file.',
        en: 'You are already part of a pending match. Wait for it to be validated before joining the queue.'
      })
    });
    return;
  }

  if (queueEntries.has(member.id)) {
    await message.reply({
      content: localizeText({
        fr: "Vous êtes déjà dans la file d'attente.",
        en: 'You are already in the queue.'
      })
    });
    return;
  }

  let playerRecord;
  try {
    playerRecord = await getOrCreatePlayer(member.id, member.displayName || member.user.username);
  } catch (err) {
    errorLog('Failed to join queue:', err);
    await message.reply({
      content: localizeText({
        fr: "Erreur lors de l'accès à la base de données. Réessayez plus tard.",
        en: 'Database error. Please try again later.'
      })
    });
    return;
  }

  const entry = buildQueueEntry(member, playerRecord);
  const requestedQueueIndex = args.length ? Number.parseInt(args[0], 10) - 1 : null;

  if (requestedQueueIndex != null && (Number.isNaN(requestedQueueIndex) || requestedQueueIndex < 0 || requestedQueueIndex >= QUEUE_COUNT)) {
    await message.reply({
      content: localizeText({
        fr: `Numéro de file invalide. Choisissez entre 1 et ${QUEUE_COUNT}.`,
        en: `Invalid queue number. Choose between 1 and ${QUEUE_COUNT}.`
      })
    });
    return;
  }

  const entryElo = normalizeRating(entry.soloElo);
  let targetQueueIndex = requestedQueueIndex;

  if (targetQueueIndex == null) {
    let bestIndex = 0;
    let bestDiff = Infinity;

    matchQueues.forEach((queue, index) => {
      const average = computeQueueAverageElo(queue);
      const diff = average == null ? Infinity : Math.abs(average - entryElo);

      if (diff < bestDiff || (diff === bestDiff && queue.length < matchQueues[bestIndex].length)) {
        bestIndex = index;
        bestDiff = diff;
      }
    });

    targetQueueIndex = bestDiff === Infinity ? 0 : bestIndex;
  }

  const targetQueue = matchQueues[targetQueueIndex];
  const eloRange = computeQueueEloRange([...targetQueue, entry]);

  if (eloRange.diff >= MAX_QUEUE_ELO_DIFFERENCE) {
    await message.reply({ content: 'Skill issue' });
    return;
  }

  targetQueue.push(entry);
  queueEntries.set(member.id, { entry, queueIndex: targetQueueIndex });

  await message.reply({
    content: localizeText(
      {
        fr: '✅ {name} a rejoint la file {queue}.\n{status}',
        en: '✅ {name} joined queue {queue}.\n{status}'
      },
      { name: entry.displayName, queue: targetQueueIndex + 1, status: formatQueueStatus() }
    )
  });

  if (targetQueue.length >= MATCH_SIZE) {
    const participants = targetQueue.splice(0, MATCH_SIZE);
    participants.forEach((player) => queueEntries.delete(player.discordId));

    try {
      await startMatch(participants, message.channel);
    } catch (err) {
      errorLog('Failed to start match:', err);
      await message.channel.send(
        localizeText({
          fr: '❌ Impossible de créer la partie. La file est réinitialisée.',
          en: '❌ Unable to create the match. The queue has been restored.'
        })
      );
      participants.forEach((player) => {
        targetQueue.push(player);
        queueEntries.set(player.discordId, { entry: player, queueIndex: targetQueueIndex });
      });
    }
  }
}

async function handleLeaveCommand(message) {
  const memberId = message.author.id;
  const queueEntry = queueEntries.get(memberId);

  if (!queueEntry) {
    await message.reply({
      content: localizeText({
        fr: "Vous n'êtes pas dans la file.",
        en: 'You are not in the queue.'
      })
    });
    return;
  }

  const { entry, queueIndex } = queueEntry;
  const queue = matchQueues[queueIndex];
  const index = queue.findIndex((player) => player.discordId === memberId);
  if (index !== -1) {
    queue.splice(index, 1);
  }

  queueEntries.delete(memberId);
  await message.reply({
    content: localizeText(
      {
        fr: '🚪 {name} a quitté la file {queue}.\n{status}',
        en: '🚪 {name} left queue {queue}.\n{status}'
      },
      { name: entry.displayName, queue: queueIndex + 1, status: formatQueueStatus() }
    )
  });
}

async function handleQueueCommand(message) {
  await message.reply({ content: formatQueueStatus() });
}

async function handleEloCommand(message) {
  const mention = message.mentions.users.first();
  const targetId = mention ? mention.id : message.author.id;
  const targetUser = mention || message.author;

  const siteRanking = await getSiteRankingInfo(targetId);

  let player;
  try {
    player = await fetchPlayerByDiscordId(targetId);
  } catch (err) {
    errorLog('Failed to fetch player elo:', err);
    await message.reply({
      content: localizeText({
        fr: 'Erreur lors de la récupération du classement.',
        en: 'Error while fetching rankings.'
      })
    });
    return;
  }

  if (!player) {
    await message.reply({
      content: localizeText({
        fr: 'Aucun profil Elo trouvé pour ce joueur.',
        en: 'No Elo profile found for this player.'
      })
    });
    return;
  }

  const wins = typeof player.wins === 'number' ? player.wins : 0;
  const losses = typeof player.losses === 'number' ? player.losses : 0;
  const winStreak = typeof player.win_streak === 'number' ? player.win_streak : 0;
  const loseStreak = typeof player.lose_streak === 'number' ? player.lose_streak : 0;
  const streakInfo = describeStreak(winStreak, loseStreak);
  const soloElo = normalizeRating(player.solo_elo);
  const mmr = normalizeRating(player.mmr);
  const { tier: siteTier, rank: siteRank } = siteRanking;
  const tierEmoji = formatTierEmoji(siteTier);
  const tierLabel = siteTier
    ? localizeText(
        { fr: '{emoji} — #{rank} sur le site', en: '{emoji} — #{rank} on the site' },
        {
          emoji: tierEmoji || siteTier,
          rank: siteRank || '?'
        }
      )
    : localizeText({ fr: 'Sans tier', en: 'No tier' });
  const wishedRankLabel =
    formatWishedRankLabel(getWishedRankByElo(soloElo)) ||
    localizeText({ fr: 'Non classé', en: 'Unranked' });

  const embed = new EmbedBuilder()
    .setTitle(
      localizeText({
        fr: 'Profil Elo — {name}',
        en: 'Elo profile — {name}'
      }, { name: player.name || localizeText({ fr: `Joueur ${targetId}`, en: `Player ${targetId}` }) })
    )
    .addFields(
      { name: 'Elo', value: `${Math.round(soloElo)}`, inline: true },
      { name: 'MMR', value: `${Math.round(mmr)}`, inline: true },
      {
        name: localizeText({ fr: 'Série en cours', en: 'Current streak' }),
        value: streakInfo.label,
        inline: true
      },
      {
        name: localizeText({ fr: 'Tier', en: 'Tier' }),
        value: tierLabel,
        inline: true
      },
      {
        name: localizeText({ fr: 'Rang', en: 'Rank' }),
        value: wishedRankLabel,
        inline: true
      }
    )
    .setColor(0x5865f2)
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .setTimestamp(new Date());

  await message.reply({ embeds: [embed] });
}

async function handleLeaderboardCommand(message, args) {
  const supabaseClient = createSupabaseClient();
  if (!supabaseClient) {
    await message.reply({
      content: localizeText({
        fr: 'Configuration Supabase manquante.',
        en: 'Supabase configuration is missing.'
      })
    });
    return;
  }

  let limit = 10;
  if (args[0]) {
    const parsed = parseInt(args[0], 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 25);
    }
  }

  try {
    const { data: allPlayers, error } = await supabaseClient
      .from('players')
      .select('discord_id, name, solo_elo, wins, losses, win_streak, lose_streak, games_played')
      .eq('active', true)
      .order('solo_elo', { ascending: false });

    if (error) throw error;

    if (!allPlayers || allPlayers.length === 0) {
      await message.reply({
        content: localizeText({
          fr: 'Aucun joueur classé pour le moment.',
          en: 'No ranked players yet.'
        })
      });
      return;
    }

    const topPlayers = allPlayers.slice(0, limit);

    const lines = [
      localizeText({
        fr: '**🏆 Classement ELO — Top {count}**\n',
        en: '**🏆 Elo leaderboard — Top {count}**\n'
      }, { count: topPlayers.length })
    ];

    topPlayers.forEach((player, index) => {
      const rank = index + 1;
      const soloElo = normalizeRating(player.solo_elo);
      const winStreak = typeof player.win_streak === 'number' ? player.win_streak : 0;
      const loseStreak = typeof player.lose_streak === 'number' ? player.lose_streak : 0;
      const streakInfo = describeStreak(winStreak, loseStreak, { short: true });
      const wishedRank = formatWishedRankLabel(getWishedRankByElo(soloElo));
      const displayName = wishedRank ? `${wishedRank} **${player.name}**` : `**${player.name}**`;

      lines.push(
        localizeText(
          {
            fr: '{rank}. {name} — {elo} Elo — {streak}',
            en: '{rank}. {name} — {elo} Elo — {streak}'
          },
          {
            rank,
            name: displayName,
            elo: Math.round(soloElo),
            streak: streakInfo.label
          }
        )
      );
    });

    await message.reply({ content: lines.join('\n') });
  } catch (error) {
    errorLog('Failed to fetch leaderboard:', error);
    await message.reply({
      content: localizeText({
        fr: 'Erreur lors de la récupération du classement.',
        en: 'Failed to retrieve leaderboard.'
      })
    });
  }
}

async function handleMapsCommand(message) {
  const frenchLines = [
    '🗺️ **Rotation des maps disponibles**',
    '',
    '<:GemGrab:1436473738765008976> **Razzia de gemmes** : Mine hard-rock, Tunnel de mine, Bruissements',
    '<:Brawlball:1436473735573143562> **Brawlball** : Tir au buts, Super plage, Triple Dribble',
    "<:KnockOut:1436473703083937914> **Hors-jeu** : Rocher de la belle, Ravin du bras d'or, À découvert",
    "<:Heist:1436473730812481546> **Braquage** : C'est chaud patate, Arrêt au stand, Zone sécurisée",
    '<:HotZone:1436473698491175137> **Zone réservée** : Duel de scarabées, Cercle de feu, Stratégies parallèles',
    '<:Bounty:1436473727519948962> **Prime** : Cachette secrète, Étoile filante, Mille-feuille'
  ];

  const englishLines = [
    '🗺️ **Available map rotation**',
    '',
    '<:GemGrab:1436473738765008976> **Gem Grab**: Hard Rock Mine, Minecart Madness, Crystal Arcade',
    '<:Brawlball:1436473735573143562> **Brawl Ball**: Super Stadium, Sneaky Fields, Triple Dribble',
    "<:KnockOut:1436473703083937914> **Knockout**: Belle's Rock, Goldarm Gulch, Out in the Open",
    '<:Heist:1436473730812481546> **Heist**: Hot Potato, Pit Stop, Safe Zone',
    '<:HotZone:1436473698491175137> **Hot Zone**: Dueling Beetles, Ring of Fire, Parallel Plays',
    '<:Bounty:1436473727519948962> **Bounty**: Snake Prairie, Shooting Star, Layer Cake'
  ];

  const lines = currentLanguage === LANGUAGE_EN ? englishLines : frenchLines;

  await message.reply({ content: lines.join('\n') });
}

async function handlePrivatePartyCommand(message) {
  const targetGuild = message.guild || guild;

  if (!targetGuild) {
    await message.reply({
      content: localizeText({
        fr: 'Impossible de récupérer les informations du serveur.',
        en: 'Unable to fetch server information.'
      })
    });
    return;
  }

  const mentionedUsers = Array.from(message.mentions.users.values()).filter((user) => !user.bot);
  const uniqueIds = new Set(mentionedUsers.map((user) => user.id));

  if (uniqueIds.size < MATCH_SIZE && !uniqueIds.has(message.author.id)) {
    uniqueIds.add(message.author.id);
  }

  const participantIds = Array.from(uniqueIds);

  if (participantIds.length !== MATCH_SIZE) {
    const needed = MATCH_SIZE - participantIds.length;
    if (participantIds.length < MATCH_SIZE) {
      await message.reply({
        content:
          needed === MATCH_SIZE
            ? localizeText({
                fr: 'Mentionnez 5 joueurs supplémentaires pour générer une partie privée (6 joueurs au total).',
                en: 'Mention 5 more players to generate a private match (6 players total).'
              })
            : localizeText(
                {
                  fr: 'Il manque {count} joueur(s) pour générer une partie privée aléatoire.',
                  en: '{count} player(s) are missing to create a random private match.'
                },
                { count: needed }
              )
      });
    } else {
      await message.reply({
        content: localizeText({
          fr: 'Trop de joueurs mentionnés. Veuillez en sélectionner exactement 6 pour lancer la partie privée.',
          en: 'Too many players mentioned. Please select exactly 6 to create the private match.'
        })
      });
    }
    return;
  }

  try {
    const participants = await Promise.all(
      participantIds.map(async (id) => {
        const member = await targetGuild.members.fetch(id).catch(() => null);
        const profile = await fetchPlayerByDiscordId(id).catch((err) => {
          throw new Error(`Supabase error for ${id}: ${err.message}`);
        });

        const wins = typeof profile?.wins === 'number' ? profile.wins : 0;
        const losses = typeof profile?.losses === 'number' ? profile.losses : 0;
        const games = typeof profile?.games_played === 'number' ? profile.games_played : wins + losses;

        return {
          discordId: id,
          displayName:
            member?.displayName ||
            member?.user?.username ||
            profile?.name ||
            localizeText({ fr: `Joueur ${id}`, en: `Player ${id}` }),
          playerId: profile?.id || null,
          mmr: normalizeRating(profile?.mmr),
          soloElo: normalizeRating(profile?.solo_elo),
          wins,
          losses,
          games,
          joinedAt: new Date()
        };
      })
    );

    const teams = assignRandomTeams(participants);
    const mapChoices = pickRandomMaps(MAP_CHOICES_COUNT);

    const embed = buildPrivateMatchEmbed({
      requestedBy: message.author.id,
      primaryMap: mapChoices[0] || null,
      mapChoices,
      teams,
      createdAt: new Date()
    });

    const mentions = participantIds.map((id) => `<@${id}>`).join(' ');
    const content = [
      localizeText({ fr: '🎉 Partie privée générée !', en: '🎉 Private match ready!' }),
      localizeText({ fr: 'Participants : {mentions}', en: 'Participants: {mentions}' }, { mentions })
    ].join('\n');

    await message.reply({ content, embeds: [embed] });
  } catch (err) {
    errorLog('Failed to create private party match:', err);
    await message.reply({
      content: localizeText({
        fr: 'Impossible de générer la partie privée pour le moment. Réessayez plus tard.',
        en: 'Unable to create the private match right now. Please try again later.'
      })
    });
  }
}

async function handlePingCommand(message) {
  if (PING_ROLE_ID) {
    await message.channel.send({ content: `<@&${PING_ROLE_ID}>` });
  } else {
    await message.reply({
      content: localizeText({
        fr: 'Aucun rôle de ping configuré.',
        en: 'No ping role configured.'
      })
    });
  }
}

async function handleTierSyncCommand(message) {
  const hasPermission = message.member?.permissions?.has(PermissionsBitField.Flags.ManageGuild);

  if (!hasPermission) {
    await message.reply({
      content: localizeText({
        fr: "❌ Vous n'avez pas la permission d'exécuter cette commande.",
        en: "❌ You don't have permission to run this command."
      })
    });
    return;
  }

  const response = await message.reply({
    content: localizeText({
      fr: '🔄 Synchronisation des tiers en cours…',
      en: '🔄 Synchronizing tiers…'
    })
  });

  try {
    await syncTiersWithRoles();
    await response.edit(
      localizeText({ fr: '✅ Synchronisation des tiers terminée.', en: '✅ Tier synchronization complete.' })
    );
  } catch (err) {
    errorLog('Manual tier sync failed:', err);
    await response.edit(
      localizeText({
        fr: "❌ Impossible de synchroniser les tiers. Consultez les logs pour plus d'informations.",
        en: '❌ Unable to sync tiers. Check the logs for details.'
      })
    );
  }
}

async function handleEnglishCommand(message, args) {
  const option = (args[0] || '').toLowerCase();

  if (['off', 'fr', 'french'].includes(option)) {
    currentLanguage = LANGUAGE_FR;
    await message.reply({
      content: localizeText({
        fr: '✅ Le bot parle à nouveau français.',
        en: '✅ The bot is back to French.'
      })
    });
    return;
  }

  if (['status', 'etat', 'état'].includes(option)) {
    await message.reply({
      content: localizeText(
        {
          fr: 'Langue actuelle : {language}.',
          en: 'Current language: {language}.'
        },
        {
          language:
            currentLanguage === LANGUAGE_EN
              ? localizeText({ fr: 'anglais', en: 'English' })
              : localizeText({ fr: 'français', en: 'French' })
        }
      )
    });
    return;
  }

  currentLanguage = LANGUAGE_EN;
  await message.reply({
    content: localizeText({
      fr: '✅ Le bot parle désormais anglais. Utilisez `!english off` pour revenir en français.',
      en: '✅ The bot will now respond in English. Use `!english off` to switch back to French.'
    })
  });
}

async function handleHelpCommand(message) {
  const commands =
    currentLanguage === LANGUAGE_EN
      ? [
          '`!join [queueNumber|@leader]` — Join the closest Elo queue, pick a queue (1 or 2), or join a mentioned leader\'s room',
          '`!leave` — Leave the queue',
          '`!room` — View the custom room you joined',
          '`!roomleave` — Leave your custom room',
          '`!queue` — Show players waiting in the queue',
          '`!file` — Show players waiting in the queue (FR alias)',
          '`!elo [@player]` — Display Elo stats',
          '`!lb [count]` — Show the leaderboard (example: !lb 25)',
          '`!maps` — Show the current map rotation',
          '`!ping` — Mention the match notification role',
          '`!tiers` — Manually sync tier roles',
          '`!english [off]` — Switch the bot language to English or back to French',
          '`!help` — Display this help'
        ]
      : [
          '`!join [numéro_de_file|@chef]` — Rejoindre la file la plus proche de ton Elo, choisir la file 1 ou 2, ou rejoindre la room du joueur mentionné',
          '`!leave` — Quitter la file d\'attente',
          '`!room` — Voir la room personnalisée que tu as rejointe',
          '`!roomleave` — Quitter ta room personnalisée',
          '`!queue` — Voir les joueurs en attente',
          '`!file` — Voir les joueurs en attente',
          '`!elo [@joueur]` — Afficher le classement Elo',
          '`!lb [nombre]` — Afficher le top classement (ex: !lb 25)',
          '`!maps` — Afficher la rotation des maps',
          '`!ping` — Mentionner le rôle de notification des matchs',
          '`!tiers` — Synchroniser manuellement les rôles de tier',
          '`!english [off]` — Traduire le bot en anglais ou revenir en français',
          '`!help` — Afficher cette aide'
        ];

  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(localizeText({ fr: 'Commandes du bot', en: 'Bot commands' }))
        .setDescription(commands.join('\n'))
        .setColor(0x00b894)
    ]
  });
}

async function createLobbyRoleForMatch(guildContext, matchId, participantIds) {
  if (!guildContext?.roles) {
    return null;
  }

  try {
    const role = await guildContext.roles.create({
      name: localizeText({ fr: `Match #${matchId}`, en: `Match #${matchId}` }),
      mentionable: true,
      reason: `Lobby role for match #${matchId}`
    });

    for (const discordId of participantIds) {
      const member = await guildContext.members.fetch(discordId).catch(() => null);
      if (member) {
        await member.roles.add(role, 'Match lobby role');
      }
    }

    return role;
  } catch (err) {
    warn('Unable to create or assign lobby role:', err.message);
    return null;
  }
}

async function addMembersToThread(thread, participantIds) {
  if (!thread?.members) {
    return;
  }

  for (const discordId of participantIds) {
    await thread.members.add(discordId).catch(() => null);
  }
}

async function createMatchThread(channel, matchId, lobbyRole, participantIds) {
  if (!channel?.threads?.create) {
    return null;
  }

  const threadName = localizeText({ fr: `Match #${matchId}`, en: `Match #${matchId}` });
  try {
    const thread = await channel.threads.create({
      name: threadName,
      autoArchiveDuration: 1440,
      invitable: false,
      type: ChannelType.PrivateThread,
      reason: `Discussion for match #${matchId}`
    });

    await addMembersToThread(thread, participantIds);

    await thread.send({
      content: lobbyRole
        ? localizeText(
            {
              fr: `<@&${lobbyRole.id}> Voici le fil pour votre match. Seuls les joueurs ajoutés peuvent parler ici.`,
              en: `<@&${lobbyRole.id}> Here is your match thread. Only added players can chat here.`
            }
          )
        : localizeText({
            fr: 'Voici le fil pour votre match. Seuls les joueurs ajoutés peuvent parler ici.',
            en: 'Here is your match thread. Only added players can chat here.'
          })
    });

    return thread;
  } catch (err) {
    warn('Unable to create match thread:', err.message);
    return null;
  }
}

async function cleanupMatchResources(state) {
  if (!state) {
    return;
  }

  const guildContext = guild;

  if (!guildContext) {
    warn('Cannot clean up match resources: guild not resolved yet.');
    return;
  }

  if (state.threadId) {
    let thread = guildContext.channels?.cache?.get(state.threadId) || null;

    if (!thread) {
      thread = await guildContext.channels.fetch(state.threadId).catch(() => null);
    }

    if (thread?.isThread?.()) {
      await thread.delete('Match resolved — removing private thread').catch((err) => {
        warn('Unable to delete match thread:', err?.message || err);
      });
    }
  }

  if (state.lobbyRoleId) {
    const role = guildContext.roles?.cache?.get(state.lobbyRoleId) ||
      (await guildContext.roles.fetch(state.lobbyRoleId).catch(() => null));

    if (role) {
      await role.delete('Match resolved — removing temporary lobby role').catch((err) => {
        warn('Unable to delete lobby role:', err?.message || err);
      });
    }
  }
}

async function startMatch(participants, fallbackChannel) {
  const mapChoices = pickRandomMaps(MAP_CHOICES_COUNT);
  const primaryMap = mapChoices[0];
  const teams = assignRandomTeams(participants);
  const bestOf = DEFAULT_MATCH_BEST_OF;
  const kFactor = getKFactorForBestOf(bestOf);

  const guildContext = fallbackChannel?.guild || guild;

  const matchPayload = {
    map_mode: primaryMap?.mode || null,
    map_name: primaryMap?.map || null,
    map_emoji: primaryMap?.emoji || null,
    team1_ids: teams.blue.map((player) => player.discordId),
    team2_ids: teams.red.map((player) => player.discordId),
    status: 'pending',
    winner: null,
    best_of: bestOf,
    k_factor: kFactor
  };

  const participantIds = participants.map((player) => player.discordId);

  const hasMissingColumnError = (error, column) => {
    const errorMessage = (error?.message || '').toLowerCase();
    const errorDetails = (error?.details || '').toLowerCase();
    return errorMessage.includes(column) || errorDetails.includes(column);
  };

  const fallbackStrategies = [
    {
      column: 'best_of',
      logMessage: 'Database schema is missing best_of column. Falling back without storing the format.',
      apply: (currentPayload) => {
        const nextPayload = { ...currentPayload };
        delete nextPayload.best_of;
        return nextPayload;
      }
    },
    {
      column: 'k_factor',
      logMessage: 'Database schema is missing k_factor column. Falling back without storing the K factor.',
      apply: (currentPayload) => {
        const nextPayload = { ...currentPayload };
        delete nextPayload.k_factor;
        return nextPayload;
      }
    },
    {
      column: 'map_emoji',
      logMessage:
        'Database schema is missing map_emoji column. Falling back to match insertion without map emoji.',
      apply: (currentPayload) => {
        const nextPayload = { ...currentPayload };
        delete nextPayload.map_emoji;
        return nextPayload;
      }
    },
    {
      column: 'map_mode',
      logMessage:
        'Database schema is missing map_mode column. Falling back to match insertion without map mode.',
      apply: (currentPayload) => {
        const nextPayload = { ...currentPayload };
        delete nextPayload.map_mode;
        if (matchPayload.map_mode && matchPayload.map_name) {
          nextPayload.map_name = `${matchPayload.map_mode} — ${matchPayload.map_name}`;
        }
        return nextPayload;
      }
    },
    {
      column: 'map_name',
      logMessage:
        'Database schema is missing map_name column. Falling back to match insertion using legacy map column.',
      apply: (currentPayload) => {
        const nextPayload = { ...currentPayload };
        const combinedName =
          currentPayload.map_name ||
          (matchPayload.map_mode && matchPayload.map_name
            ? `${matchPayload.map_mode} — ${matchPayload.map_name}`
            : matchPayload.map_name || matchPayload.map_mode);
        if (combinedName) {
          nextPayload.map = combinedName;
        }
        delete nextPayload.map_name;
        return nextPayload;
      }
    },
    {
      column: 'map',
      logMessage:
        'Database schema is missing map column. Falling back to match insertion without map information.',
      apply: (currentPayload) => {
        const nextPayload = { ...currentPayload };
        delete nextPayload.map;
        return nextPayload;
      }
    }
  ];

  let insertedMatch = null;
  let matchError = null;
  let payloadToInsert = { ...matchPayload };

  const appliedFallbacks = new Set();

  for (let attempt = 0; attempt <= fallbackStrategies.length; attempt += 1) {
    ({ data: insertedMatch, error: matchError } = await supabase
      .from('matches')
      .insert(payloadToInsert)
      .select()
      .single());

    if (!matchError) {
      break;
    }

    const fallback = fallbackStrategies.find(
      (strategy) =>
        !appliedFallbacks.has(strategy.column) &&
        hasMissingColumnError(matchError, strategy.column)
    );

    if (!fallback) {
      break;
    }

    warn(fallback.logMessage);
    payloadToInsert = fallback.apply(payloadToInsert);
    appliedFallbacks.add(fallback.column);
  }

  if (matchError) {
    throw new Error(`Unable to create match record: ${matchError.message}`);
  }

  const lobbyRole = await createLobbyRoleForMatch(guildContext, insertedMatch.id, participantIds);

  const channel = matchChannel && matchChannel.isTextBased() ? matchChannel : fallbackChannel;
  if (!channel || !channel.isTextBased()) {
    throw new Error('No valid text channel available to announce the match.');
  }

  const mentions = participants.map((player) => `<@${player.discordId}>`).join(' ');
  const contentParts = [
    localizeText({ fr: '🎮 **Match prêt !**', en: '🎮 **Match ready!**' }),
    mentions
  ];
  if (PING_ROLE_ID) {
    contentParts.push(`<@&${PING_ROLE_ID}>`);
  }

  const state = {
    matchId: insertedMatch.id,
    mapChoices,
    primaryMap,
    teams,
    bestOf,
    kFactor,
    createdAt: new Date(insertedMatch?.created_at || Date.now()),
    participants: new Set(participants.map((player) => player.discordId)),
    channelId: channel.id,
    messageId: null,
    threadId: null,
    lobbyRoleId: lobbyRole?.id || null,
    resolved: false,
    dodgeVotes: new Map(),
    penalizedDodges: new Set(),
    votes: {
      blue: new Set(),
      red: new Set(),
      cancel: new Set()
    }
  };

  const messagePayload = {
    content: contentParts.filter(Boolean).join(' '),
    embeds: [buildMatchEmbed(state)],
    components: [buildResultButtons(false)]
  };

  const sentMessage = await channel.send(messagePayload);
  state.messageId = sentMessage.id;
  const matchThread = await createMatchThread(channel, state.matchId, lobbyRole, participantIds);
  if (matchThread) {
    state.threadId = matchThread.id;
  }
  activeMatches.set(state.matchId, state);

  await sendLogMessage(
    [
      localizeText(
        {
          fr: '🆚 Nouveau match (#{id}) — {maps}',
          en: '🆚 New match (#{id}) — {maps}'
        },
        {
          id: state.matchId,
          maps: mapChoices.map((choice) => `${choice.emoji} ${choice.mode} (${choice.map})`).join(' | ')
        }
      ),
      localizeText({ fr: 'Bleus : {players}', en: 'Blue: {players}' }, {
        players: teams.blue.map((p) => p.displayName).join(', ')
      }),
      localizeText({ fr: 'Rouges : {players}', en: 'Red: {players}' }, {
        players: teams.red.map((p) => p.displayName).join(', ')
      })
    ].join('\n')
  );
}

async function updateMatchRecord(matchId, payload) {
  const { error: updateError } = await supabase
    .from('matches')
    .update(payload)
    .eq('id', matchId);

  if (updateError) {
    throw new Error(`Unable to update match #${matchId}: ${updateError.message}`);
  }
}

async function applyMatchOutcome(state, outcome, userId) {
  if (state.resolved) {
    return null;
  }

  const winner =
    outcome === 'blue'
      ? localizeText({ fr: 'Bleue', en: 'Blue' })
      : outcome === 'red'
        ? localizeText({ fr: 'Rouge', en: 'Red' })
        : null;
  const summary = {
    outcome,
    color:
      outcome === 'blue' ? 0x3498db : outcome === 'red' ? 0xe74c3c : 0x95a5a6,
    text: ''
  };

  if (outcome === 'cancel') {
    await updateMatchRecord(state.matchId, {
      status: 'cancelled',
      winner: null,
      completed_at: new Date().toISOString()
    });

    summary.text = localizeText({
      fr: 'Match annulé par <@{userId}>. Aucun changement de score Elo.',
      en: 'Match cancelled by <@{userId}>. No Elo changes applied.'
    }, { userId });
    return summary;
  }

  const blueAvg =
    state.teams.blue.reduce((sum, player) => sum + normalizeRating(player.soloElo), 0) / TEAM_SIZE;
  const redAvg =
    state.teams.red.reduce((sum, player) => sum + normalizeRating(player.soloElo), 0) / TEAM_SIZE;

  const blueScore = outcome === 'blue' ? 1 : 0;
  const redScore = outcome === 'red' ? 1 : 0;
  const matchBestOf = state.bestOf || DEFAULT_MATCH_BEST_OF;
  const matchKFactor = state.kFactor || getKFactorForBestOf(matchBestOf);

  const updates = [];
  const changes = [];

  for (const player of state.teams.blue) {
    const currentRating = normalizeRating(player.soloElo);
    const expected = calculateExpectedScore(currentRating, redAvg);
    const newRating = Math.max(0, Math.round(currentRating + matchKFactor * (blueScore - expected)));
    const wins = player.wins + (blueScore === 1 ? 1 : 0);
    const losses = player.losses + (blueScore === 1 ? 0 : 1);
    const games = player.games + 1;
    const winStreak = blueScore === 1 ? (player.winStreak || 0) + 1 : 0;
    const loseStreak = blueScore === 1 ? 0 : (player.loseStreak || 0) + 1;

    updates.push({
      id: player.playerId,
      solo_elo: newRating,
      wins,
      losses,
      games_played: games,
      win_streak: winStreak,
      lose_streak: loseStreak
    });
    changes.push({
      player,
      oldRating: currentRating,
      newRating,
      delta: newRating - currentRating
    });

    player.soloElo = newRating;
    player.wins = wins;
    player.losses = losses;
    player.games = games;
    player.winStreak = winStreak;
    player.loseStreak = loseStreak;
  }

  for (const player of state.teams.red) {
    const currentRating = normalizeRating(player.soloElo);
    const expected = calculateExpectedScore(currentRating, blueAvg);
    const newRating = Math.max(0, Math.round(currentRating + matchKFactor * (redScore - expected)));
    const wins = player.wins + (redScore === 1 ? 1 : 0);
    const losses = player.losses + (redScore === 1 ? 0 : 1);
    const games = player.games + 1;
    const winStreak = redScore === 1 ? (player.winStreak || 0) + 1 : 0;
    const loseStreak = redScore === 1 ? 0 : (player.loseStreak || 0) + 1;

    updates.push({
      id: player.playerId,
      solo_elo: newRating,
      wins,
      losses,
      games_played: games,
      win_streak: winStreak,
      lose_streak: loseStreak
    });
    changes.push({
      player,
      oldRating: currentRating,
      newRating,
      delta: newRating - currentRating
    });

    player.soloElo = newRating;
    player.wins = wins;
    player.losses = losses;
    player.games = games;
    player.winStreak = winStreak;
    player.loseStreak = loseStreak;
  }

  for (const update of updates) {
    const { error: playerError } = await supabase
      .from('players')
        .update({
          solo_elo: update.solo_elo,
          wins: update.wins,
          losses: update.losses,
          games_played: update.games_played,
          win_streak: update.win_streak,
          lose_streak: update.lose_streak
        })
      .eq('id', update.id);

    if (playerError) {
      throw new Error(`Unable to update player ${update.id}: ${playerError.message}`);
    }
  }

  await updateMatchRecord(state.matchId, {
    status: 'completed',
    winner: outcome,
    completed_at: new Date().toISOString()
  });

  const winnerLine = localizeText(
    {
      fr: 'Victoire {winner} (déclarée par <@{userId}>).',
      en: '{winner} win reported by <@{userId}>.'
    },
    {
      winner,
      userId
    }
  );
  const changeLines = changes
    .map((change) => {
      const symbol = change.delta > 0 ? '+' : '';
      return `• ${change.player.displayName}: ${change.oldRating} → ${change.newRating} (${symbol}${change.delta})`;
    })
    .join('\n');

  summary.text = `${winnerLine}\n${changeLines}`;
  return summary;
}

async function handleInteraction(interaction) {
  if (interaction.isButton()) {
    const [prefix, action, requestId] = interaction.customId.split(':');

    if (prefix === 'room' && action === 'open') {
      const pending = pendingRoomForms.get(requestId);

      if (!pending) {
        await interaction.reply({
          content: localizeText({
            fr: 'Ce formulaire a expiré ou est introuvable. Demandez à rouvrir une nouvelle demande.',
            en: 'This form expired or no longer exists. Please ask for a new request to be opened.'
          }),
          ephemeral: true
        });
        return;
      }

      if (pending.leaderId !== interaction.user.id) {
        await interaction.reply({
          content: localizeText({
            fr: 'Seul le créateur de la room peut remplir ce formulaire.',
            en: 'Only the room creator can complete this form.'
          }),
          ephemeral: true
        });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId(`room:submit:${requestId}`)
        .setTitle(localizeText({ fr: 'Créer une room personnalisée', en: 'Create a custom room' }));

      const codeInput = new TextInputBuilder()
        .setCustomId('roomCode')
        .setLabel(localizeText({ fr: 'Code de la room', en: 'Room code' }))
        .setPlaceholder(localizeText({ fr: 'Exemple : ABCD', en: 'Example: ABCD' }))
        .setMaxLength(20)
        .setRequired(true)
        .setStyle(TextInputStyle.Short);

      const minTierInput = new TextInputBuilder()
        .setCustomId('minTier')
        .setLabel(localizeText({ fr: 'Tier minimum (S/A/B/C/D/E)', en: 'Minimum tier (S/A/B/C/D/E)' }))
        .setMaxLength(1)
        .setRequired(true)
        .setStyle(TextInputStyle.Short);

      const maxTierInput = new TextInputBuilder()
        .setCustomId('maxTier')
        .setLabel(localizeText({ fr: 'Tier maximum (S/A/B/C/D/E)', en: 'Maximum tier (S/A/B/C/D/E)' }))
        .setMaxLength(1)
        .setRequired(true)
        .setStyle(TextInputStyle.Short);

      const bestOfInput = new TextInputBuilder()
        .setCustomId('bestOf')
        .setLabel(localizeText({ fr: 'Format (bo1/bo3/bo5)', en: 'Format (bo1/bo3/bo5)' }))
        .setPlaceholder(localizeText({ fr: 'Exemple : bo3', en: 'Example: bo3' }))
        .setMaxLength(3)
        .setRequired(true)
        .setStyle(TextInputStyle.Short);

      modal.addComponents(
        new ActionRowBuilder().addComponents(codeInput),
        new ActionRowBuilder().addComponents(minTierInput),
        new ActionRowBuilder().addComponents(maxTierInput),
        new ActionRowBuilder().addComponents(bestOfInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (prefix !== 'match') {
      return;
    }

    const outcome = action;
    const matchState = [...activeMatches.values()].find((state) => state.messageId === interaction.message.id);
    if (!matchState) {
      await interaction.reply({
        content: localizeText({
          fr: 'Match introuvable ou déjà traité.',
          en: 'Match not found or already handled.'
        }),
        ephemeral: true
      });
      return;
    }

    if (matchState.resolved) {
      await interaction.reply({
        content: localizeText({
          fr: 'Ce match a déjà été terminé.',
          en: 'This match has already been completed.'
        }),
        ephemeral: true
      });
      return;
    }

    const member = interaction.member;
    const isParticipant = matchState.participants.has(interaction.user.id);
    const isModerator = member?.permissions?.has(PermissionsBitField.Flags.ManageGuild);

    if (!isParticipant && !isModerator) {
      await interaction.reply({
        content: localizeText({
          fr: 'Seuls les joueurs du match peuvent voter.',
          en: 'Only match participants can vote.'
        }),
        ephemeral: true
      });
      return;
    }

    const isModeratorOverride = isModerator && !isParticipant;

    try {
      if (outcome === 'dodge') {
        await interaction.reply({
          content: localizeText({
            fr: 'Sélectionnez le joueur qui a dodge le match.',
            en: 'Select the player who dodged the match.'
          }),
          components: [buildDodgeSelectMenu(matchState)],
          ephemeral: true
        });
        return;
      }

      if (!['blue', 'red', 'cancel'].includes(outcome)) {
        await interaction.reply({
          content: localizeText({
            fr: 'Option de vote invalide.',
            en: 'Invalid vote option.'
          }),
          ephemeral: true
        });
        return;
      }

      if (!matchState.votes) {
        matchState.votes = {
          blue: new Set(),
          red: new Set(),
          cancel: new Set()
        };
      }

      const votes = matchState.votes;
      const allVoteSets = [votes.blue, votes.red, votes.cancel];

      for (const voteSet of allVoteSets) {
        voteSet.delete(interaction.user.id);
      }

      votes[outcome].add(interaction.user.id);

      const voteCounts = {
        blue: votes.blue.size,
        red: votes.red.size,
        cancel: votes.cancel.size
      };

      const votesRequired = getVotesRequired(matchState);
      const hasReachedThreshold = voteCounts[outcome] >= votesRequired;
      const shouldResolve = isModeratorOverride || hasReachedThreshold;

      if (!shouldResolve) {
        await interaction.update({
          embeds: [buildMatchEmbed(matchState)],
          components: [buildResultButtons(false)]
        });

        await interaction.followUp({
          content: localizeText(
            {
              fr: 'Votre vote pour {choice} a été pris en compte. ({count}/{needed})',
              en: 'Your vote for {choice} has been recorded. ({count}/{needed})'
            },
            {
              choice:
                outcome === 'blue'
                  ? localizeText({ fr: 'la victoire bleue', en: 'a blue win' })
                  : outcome === 'red'
                    ? localizeText({ fr: 'la victoire rouge', en: 'a red win' })
                    : localizeText({ fr: "l'annulation", en: 'cancelling the match' }),
              count: voteCounts[outcome],
              needed: votesRequired
            }
          ),
          ephemeral: true
        });
        return;
      }

      await interaction.deferUpdate();

      const summary = await applyMatchOutcome(matchState, outcome, interaction.user.id);
      if (!summary) {
        await interaction.followUp({
          content: localizeText({
            fr: 'Le résultat a déjà été enregistré.',
            en: 'The result has already been recorded.'
          }),
          ephemeral: true
        });
        return;
      }

      matchState.resolved = true;
      activeMatches.delete(matchState.matchId);

      await interaction.editReply({
        embeds: [buildMatchEmbed(matchState, summary)],
        components: [buildResultButtons(true)]
      });

      await cleanupMatchResources(matchState);

      const mapLabel = matchState.primaryMap
        ? `${matchState.primaryMap.emoji} ${matchState.primaryMap.mode}`
        : localizeText({ fr: 'Map inconnue', en: 'Unknown map' });
      await sendLogMessage(
        [`✅ Match #${matchState.matchId} terminé (${mapLabel})`, summary.text].join('\n')
      );
    } catch (err) {
      errorLog('Failed to process match result:', err);
      const errorResponse = {
        content: localizeText({
          fr: "Erreur lors de l'enregistrement du résultat.",
          en: 'Error while saving the result.'
        }),
        ephemeral: true
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(errorResponse);
      } else {
        await interaction.reply(errorResponse);
      }
    }

    return;
  }

  if (interaction.isStringSelectMenu()) {
    const [prefix, action, matchId] = interaction.customId.split(':');

    if (prefix !== 'match' || action !== 'dodge-select') {
      return;
    }

    const matchState = activeMatches.get(Number.parseInt(matchId, 10));

    if (!matchState) {
      await interaction.reply({
        content: localizeText({ fr: 'Match introuvable ou expiré.', en: 'Match not found or expired.' }),
        ephemeral: true
      });
      return;
    }

    if (matchState.resolved) {
      await interaction.reply({
        content: localizeText({ fr: 'Le match est déjà validé.', en: 'The match is already resolved.' }),
        ephemeral: true
      });
      return;
    }

    const member = interaction.member;
    const isParticipant = matchState.participants.has(interaction.user.id);
    const isModerator = member?.permissions?.has(PermissionsBitField.Flags.ManageGuild);

    if (!isParticipant && !isModerator) {
      await interaction.reply({
        content: localizeText({
          fr: 'Seuls les joueurs du match peuvent voter.',
          en: 'Only match participants can vote.'
        }),
        ephemeral: true
      });
      return;
    }

    const targetId = interaction.values?.[0];
    if (!targetId) {
      await interaction.reply({
        content: localizeText({ fr: 'Sélection invalide.', en: 'Invalid selection.' }),
        ephemeral: true
      });
      return;
    }

    if (!matchState.participants.has(targetId)) {
      await interaction.reply({
        content: localizeText({ fr: 'Ce joueur ne fait pas partie du match.', en: 'This player is not in the match.' }),
        ephemeral: true
      });
      return;
    }

    let previousTarget = null;
    for (const [candidateId, voteSet] of matchState.dodgeVotes.entries()) {
      if (voteSet.has(interaction.user.id)) {
        previousTarget = candidateId;

        if (candidateId !== targetId) {
          voteSet.delete(interaction.user.id);
        }
      }
    }

    const voterSet = matchState.dodgeVotes.get(targetId) || new Set();

    if (previousTarget === targetId && voterSet.has(interaction.user.id)) {
      await interaction.reply({
        content: localizeText({
          fr: 'Vous avez déjà voté pour ce joueur.',
          en: 'You have already voted for this player.'
        }),
        ephemeral: true
      });
      return;
    }

    voterSet.add(interaction.user.id);
    matchState.dodgeVotes.set(targetId, voterSet);

    const voteCount = voterSet.size;
    const player = findPlayerInTeams(matchState.teams, targetId);
    const remaining = Math.max(0, DODGE_VOTES_REQUIRED - voteCount);
    let penaltyMessage = '';

    if (voteCount >= DODGE_VOTES_REQUIRED && !matchState.penalizedDodges.has(targetId)) {
      try {
        const result = await applyDodgePenalty(player);
        matchState.penalizedDodges.add(targetId);

        if (result.success) {
          penaltyMessage = localizeText(
            {
              fr: '{name} perd {penalty} Elo pour dodge.',
              en: '{name} loses {penalty} Elo for dodging.'
            },
            {
              name: player?.displayName || `<@${targetId}>`,
              penalty: DODGE_ELO_PENALTY
            }
          );
        } else {
          penaltyMessage = localizeText({
            fr: 'Impossible de pénaliser ce joueur (profil manquant).',
            en: 'Unable to penalize this player (missing profile).'
          });
        }
      } catch (err) {
        errorLog('Failed to apply dodge penalty:', err);
        penaltyMessage = localizeText({
          fr: 'Erreur lors de l\'application de la pénalité.',
          en: 'Error while applying the penalty.'
        });
      }
    }

    await refreshMatchMessage(matchState, interaction.client);

    const voteLine = localizeText(
      {
        fr: 'Vote enregistré contre {name}. ({count}/{needed} votes)',
        en: 'Vote recorded against {name}. ({count}/{needed} votes)'
      },
      {
        name: player?.displayName || `<@${targetId}>`,
        count: voteCount,
        needed: DODGE_VOTES_REQUIRED
      }
    );

    const followupLines = [voteLine];
    if (penaltyMessage) {
      followupLines.push(penaltyMessage);
    } else if (remaining > 0) {
      followupLines.push(
        localizeText(
          { fr: '{remaining} vote(s) restants.', en: '{remaining} vote(s) remaining.' },
          { remaining }
        )
      );
    }

    await interaction.reply({ content: followupLines.join('\n'), ephemeral: true });
    return;
  }

  if (interaction.isModalSubmit()) {
    const [prefix, action, requestId] = interaction.customId.split(':');

    if (prefix !== 'room' || action !== 'submit') {
      return;
    }

    const pending = pendingRoomForms.get(requestId);

    if (!pending) {
      await interaction.reply({
        content: localizeText({
          fr: 'Formulaire introuvable. Demandez au staff de créer une nouvelle room.',
          en: 'Form not found. Please ask the staff to open a new room form.'
        }),
        ephemeral: true
      });
      return;
    }

    if (pending.leaderId !== interaction.user.id) {
      await interaction.reply({
        content: localizeText({
          fr: 'Seul le créateur de la room peut valider ce formulaire.',
          en: 'Only the room creator can submit this form.'
        }),
        ephemeral: true
      });
      return;
    }

    const rawCode = interaction.fields.getTextInputValue('roomCode') || '';
    const rawMinTier = interaction.fields.getTextInputValue('minTier') || '';
    const rawMaxTier = interaction.fields.getTextInputValue('maxTier') || '';
    const rawBestOf = interaction.fields.getTextInputValue('bestOf') || '';

    const roomCode = rawCode.trim().toUpperCase();
    const minTier = normalizeTierInput(rawMinTier);
    const maxTier = normalizeTierInput(rawMaxTier);
    const bestOf = normalizeBestOfInput(rawBestOf);

    if (!roomCode) {
      pendingRoomForms.delete(requestId);
      await interaction.reply({
        content: localizeText({
          fr: 'Le code de room ne peut pas être vide.',
          en: 'The room code cannot be empty.'
        }),
        ephemeral: true
      });
      return;
    }

    if (!minTier || !maxTier) {
      pendingRoomForms.delete(requestId);
      await interaction.reply({
        content: localizeText({
          fr: 'Les tiers doivent être parmi S, A, B, C, D ou E.',
          en: 'Tiers must be one of S, A, B, C, D, or E.'
        }),
        ephemeral: true
      });
      return;
    }

    if (!isValidTierRange(minTier, maxTier)) {
      pendingRoomForms.delete(requestId);
      await interaction.reply({
        content: localizeText({
          fr: 'Le tier minimum doit être inférieur ou égal au tier maximum.',
          en: 'The minimum tier must be lower than or equal to the maximum tier.'
        }),
        ephemeral: true
      });
      return;
    }

    if (!bestOf) {
      pendingRoomForms.delete(requestId);
      await interaction.reply({
        content: localizeText({
          fr: 'Le format doit être bo1, bo3 ou bo5.',
          en: 'The format must be bo1, bo3, or bo5.'
        }),
        ephemeral: true
      });
      return;
    }

    pendingRoomForms.delete(requestId);

    const roomState = {
      leaderId: pending.leaderId,
      code: roomCode,
      minTier,
      maxTier,
      bestOf,
      kFactor: getKFactorForBestOf(bestOf),
      channelId: pending.channelId,
      messageId: null,
      createdAt: new Date(),
      members: new Set([pending.leaderId])
    };

    customRooms.set(pending.leaderId, roomState);

    const embed = new EmbedBuilder()
      .setTitle(localizeText({ fr: 'Room personnalisée', en: 'Custom room' }))
      .setDescription(
        localizeText({ fr: 'Créée par <@{leaderId}>', en: 'Created by <@{leaderId}>' }, { leaderId: pending.leaderId })
      )
      .addFields(
        { name: localizeText({ fr: 'Code de la room', en: 'Room code' }), value: `\`${roomCode}\``, inline: true },
        { name: localizeText({ fr: 'Tier minimum', en: 'Minimum tier' }), value: minTier, inline: true },
        { name: localizeText({ fr: 'Tier maximum', en: 'Maximum tier' }), value: maxTier, inline: true },
        {
          name: localizeText({ fr: 'Format', en: 'Format' }),
          value: localizeText(
            { fr: 'Bo{bestOf} — Facteur K {kFactor}', en: 'Bo{bestOf} — K-factor {kFactor}' },
            { bestOf, kFactor: roomState.kFactor }
          ),
          inline: true
        },
        {
          name: localizeText({ fr: 'Comment rejoindre ?', en: 'How to join?' }),
          value: localizeText(
            {
              fr: 'Utilisez `!join <@{leaderId}>` pour recevoir le code directement.',
              en: 'Use `!join <@{leaderId}>` to receive the code directly.'
            },
            { leaderId: pending.leaderId }
          )
        }
      )
      .setColor(0x2ecc71)
      .setTimestamp(roomState.createdAt);

    await interaction.reply({
      content: localizeText({
        fr: '✅ Room créée avec succès !',
        en: '✅ Room created successfully!'
      }),
      embeds: [embed]
    });

    const replyMessage = await interaction.fetchReply().catch(() => null);
    if (replyMessage) {
      roomState.messageId = replyMessage.id;
    }
  }
}

async function syncTiersWithRoles() {
  if (!guild) {
    warn('Cannot sync tiers: guild not resolved yet.');
    return;
  }

  let players;
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, discord_id, name, mmr, solo_elo, active')
      .order('mmr', { ascending: false });

    if (error) {
      throw error;
    }

    players = (data || [])
      .filter((player) => player.discord_id)
      .map((player) => {
        const soloElo = normalizeRating(player.solo_elo);
        const mmr = normalizeRating(player.mmr);
        return {
          ...player,
          solo_elo: soloElo,
          mmr,
          weightedScore: calculateWeightedScore(soloElo, mmr)
        };
      });
  } catch (err) {
    errorLog('Failed to fetch players for tier sync:', err);
    return;
  }

  if (!players.length) {
    warn('No players found for tier synchronization.');
    return;
  }

  const activePlayers = players.filter((player) => player.active !== false);
  const rankedPlayers = (activePlayers.length ? activePlayers : players)
    .slice()
    .sort((a, b) => b.weightedScore - a.weightedScore);
  const totalPlayers = rankedPlayers.length;

  const counts = TIER_DISTRIBUTION.map((distribution) =>
    Math.max(distribution.minCount || 0, Math.round(totalPlayers * distribution.ratio))
  );

  let totalAssigned = counts.reduce((sum, value) => sum + value, 0);

  if (totalAssigned > totalPlayers) {
    let index = counts.length - 1;
    let safety = counts.length * 10;

    while (totalAssigned > totalPlayers && safety > 0) {
      const minAllowed = TIER_DISTRIBUTION[index].minCount || 0;
      if (counts[index] > minAllowed) {
        counts[index] -= 1;
        totalAssigned -= 1;
      }

      index = (index - 1 + counts.length) % counts.length;
      safety -= 1;
    }

    if (totalAssigned > totalPlayers) {
      const difference = totalAssigned - totalPlayers;
      counts[counts.length - 1] = Math.max(0, counts[counts.length - 1] - difference);
      totalAssigned = counts.reduce((sum, value) => sum + value, 0);
    }
  }

  if (totalAssigned < totalPlayers) {
    let index = 0;
    while (totalAssigned < totalPlayers) {
      counts[index] += 1;
      totalAssigned += 1;
      index = (index + 1) % counts.length;
    }
  }

  const assignments = new Map();
  let cursor = 0;

  for (let i = 0; i < TIER_DISTRIBUTION.length; i += 1) {
    const { tier } = TIER_DISTRIBUTION[i];
    const count = counts[i] ?? 0;

    for (let j = 0; j < count && cursor < rankedPlayers.length; j += 1) {
      const player = rankedPlayers[cursor];
      assignments.set(player.discord_id, tier);
      cursor += 1;
    }
  }

  for (const player of rankedPlayers) {
    const tier = assignments.get(player.discord_id) || 'E';
    const roleId = tierRoleMap[tier];

    if (!roleId) {
      continue;
    }

    let member;
    try {
      member = await guild.members.fetch(player.discord_id);
    } catch (err) {
      continue;
    }

    if (!member) {
      continue;
    }

    const rolesToRemove = Object.values(tierRoleMap)
      .filter(Boolean)
      .filter((id) => id !== roleId && member.roles.cache.has(id));

    try {
      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId, 'Tier synchronization');
      }
    } catch (err) {
      warn(`Unable to add tier role ${tier} to ${member.id}:`, err.message);
    }

    for (const removeId of rolesToRemove) {
      try {
        await member.roles.remove(removeId, 'Tier synchronization');
      } catch (err) {
        warn(`Unable to remove tier role ${removeId} from ${member.id}:`, err.message);
      }
    }

    if (player.name !== member.displayName) {
      const { error: updateError } = await supabase
        .from('players')
        .update({ name: member.displayName })
        .eq('id', player.id);

      if (updateError) {
        warn(`Unable to sync display name for ${member.id}:`, updateError.message);
      }
    }
  }

  log('Tier synchronization complete.');
}

async function onReady(readyClient) {
  log(`Connected to Discord as ${readyClient.user.tag}.`);

  try {
    guild = await readyClient.guilds.fetch(DISCORD_GUILD_ID);
  } catch (err) {
    errorLog('Unable to fetch guild:', err);
    return;
  }

  try {
    matchChannel = await readyClient.channels.fetch(MATCH_CHANNEL_ID);
    if (!matchChannel?.isTextBased()) {
      warn(`Configured match channel ${MATCH_CHANNEL_ID} is not text-based.`);
      matchChannel = null;
    }
  } catch (err) {
    warn(`Unable to fetch match channel ${MATCH_CHANNEL_ID}:`, err.message);
    matchChannel = null;
  }

  try {
    logChannel = await readyClient.channels.fetch(LOG_CHANNEL_ID);
    if (!logChannel?.isTextBased()) {
      warn(`Configured log channel ${LOG_CHANNEL_ID} is not text-based.`);
      logChannel = null;
    }
  } catch (err) {
    warn(`Unable to fetch log channel ${LOG_CHANNEL_ID}:`, err.message);
    logChannel = null;
  }

  await syncTiersWithRoles();

  tierSyncInterval = setInterval(() => {
    syncTiersWithRoles().catch((err) => errorLog('Tier sync failed:', err));
  }, TIER_SYNC_INTERVAL_MS);
}

async function handleMessage(message) {
  if (message.author.bot) {
    return;
  }

  if (!message.guild || message.guild.id !== DISCORD_GUILD_ID) {
    return;
  }

  const content = message.content.trim();
  if (!content.startsWith('!')) {
    return;
  }

  const [commandName, ...args] = content.slice(1).split(/\s+/);
  const command = commandName.toLowerCase();

  try {
    switch (command) {
      case 'join':
        await handleJoinCommand(message, args);
        break;
      case 'leave':
        await handleLeaveCommand(message, args);
        break;
      case 'room':
      case 'roominfo':
        await handleRoomInfoCommand(message);
        break;
      case 'roomleave':
        await handleRoomLeaveCommand(message);
        break;
      case 'queue':
      case 'file':
        await handleQueueCommand(message, args);
        break;
      case 'elo':
        await handleEloCommand(message, args);
        break;
      case 'lb':
      case 'leaderboard':
        await handleLeaderboardCommand(message, args);
        break;
      case 'maps':
        await handleMapsCommand(message, args);
        break;
      case 'ping':
        await handlePingCommand(message, args);
        break;
      case 'tiers':
        await handleTierSyncCommand(message, args);
        break;
      case 'english':
        await handleEnglishCommand(message, args);
        break;
      case 'help':
        await handleHelpCommand(message, args);
        break;
      default:
        break;
    }
  } catch (err) {
    errorLog(`Command ${command} failed:`, err);
    await message.reply({
      content: localizeText({
        fr: "❌ Erreur lors de l'exécution de la commande.",
        en: '❌ Error while executing the command.'
      })
    });
  }
}

async function startUnifiedBot() {
  if (botStarted) {
    warn('startUnifiedBot() called but the client is already running.');
    return client;
  }

  botStarted = true;

  try {
    await verifySupabaseConnection();
  } catch (err) {
    botStarted = false;
    throw err;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.User]
  });

  client.once(Events.ClientReady, onReady);
  client.on(Events.MessageCreate, handleMessage);
  client.on(Events.InteractionCreate, handleInteraction);
  client.on(Events.Error, (err) => errorLog('Discord client error:', err));
  client.on(Events.Warn, (msg) => warn('Discord warning:', msg));

  try {
    await client.login(DISCORD_BOT_TOKEN);
    log('Discord login successful.');
  } catch (err) {
    botStarted = false;
    errorLog('Failed to login to Discord:', err);
    throw err;
  }

  return client;
}

module.exports = { startUnifiedBot };
