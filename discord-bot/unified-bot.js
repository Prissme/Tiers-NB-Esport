'use strict';

require('../ensure-fetch');
const {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
  ModalBuilder,
  Partials,
  PermissionsBitField,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const predictions = require('./predictions');
const draft = require('./draft');
const { createPerformanceStores } = require('./performance-store');
const fs = require('fs/promises');
const path = require('path');

const LOG_PREFIX = '[UnifiedBot]';
const DRAFT_RESULTS_PATH = path.join(__dirname, 'data', 'draft-results.json');
const TEAM_SIZE = 3;
const MATCH_SIZE = TEAM_SIZE * 2;
const DEFAULT_ELO = 1000;
const ELO_DIVISOR = 400;
const TIER_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const WORST_PLAYER_ROLE_SYNC_INTERVAL_MS = 10 * 60 * 1000;
const MIN_VOTES_TO_RESOLVE = Math.max(
  1,
  Number.parseInt(process.env.MIN_VOTES_TO_RESOLVE || '4', 10)
);
const MAP_CHOICES_COUNT = 3;
const DODGE_VOTES_REQUIRED = 4;
const DODGE_ELO_PENALTY = 30;
const DODGE_QUEUE_LOCK_MS = 60 * 60 * 1000;
const ROOM_TIER_ORDER = ['E', 'D', 'C', 'B', 'A', 'S'];
const BEST_OF_VALUES = [3];
const DEFAULT_MATCH_BEST_OF = normalizeBestOfInput(process.env.DEFAULT_MATCH_BEST_OF) || 3;
const MAX_QUEUE_ELO_DIFFERENCE = 175;
const MAX_MATCHMAKING_MAJOR_RANK_GAP = 3;
const PL_QUEUE_CHANNEL_ID = '1442580781527732334';
const PL_MATCH_TIMEOUT_MS = 60 * 60 * 1000;
const SIMPLE_LOBBY_CHANNEL_ID = process.env.SIMPLE_LOBBY_CHANNEL_ID;
const SIMPLE_LOBBY_SIZE = Number.parseInt(process.env.SIMPLE_LOBBY_SIZE || '6', 10);
const SIMPLE_LOBBY_TEAM_SIZE = Number.parseInt(process.env.SIMPLE_LOBBY_TEAM_SIZE || '3', 10);
const PRISSCUP_ANNOUNCE_CHANNEL_ID = '1440767483438170264';
const PRISSCUP_EVENT_URL = 'https://discord.gg/aeqGMNvTm?event=1442798624588435517';
const PRISSCUP_EVENT_NAME = 'PrissCup 3v3';
const RANK_UP_CHANNEL_ID = '1236724293631611022';
const PRISSCUP_TEAM_BADGES = ['🟦', '🟪', '🟥', '🟧', '🟨', '🟩', '🟦‍🔥', '🟫', '⬛'];

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const SITE_BASE_URL = (process.env.SITE_BASE_URL || 'https://www.lfn-esports.fr').replace(/\/+$/, '');
const TROPHY_EMOJI = '<a:trophy:1393336054567665897>';

const MATCH_CHANNEL_ID = process.env.MATCH_CHANNEL_ID || '1434509931360419890';
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || '1237166689188053023';
const PING_ROLE_ID = process.env.PING_ROLE_ID || '1437211411096010862';
const UNKNOWN_PING_ROLE_NAME = process.env.UNKNOWN_PING_ROLE_NAME || 'inconnu';
const WORST_PLAYER_ROLE_NAME = process.env.WORST_PLAYER_ROLE_NAME || 'PIRE JOUEUR PL';
const PL_ADMIN_ROLE_ID = process.env.PL_ADMIN_ROLE_ID || '1470549482432102511';
const SECONDARY_PL_ADMIN_ROLE_ID = '1472652444331671593';
const PL_PLAYER_ROLE_ID = '1469030334510137398';

const ROLE_TIER_S = process.env.ROLE_TIER_S;
const ROLE_TIER_A = process.env.ROLE_TIER_A;
const ROLE_TIER_B = process.env.ROLE_TIER_B;
const ROLE_TIER_C = process.env.ROLE_TIER_C;
const ROLE_TIER_D = process.env.ROLE_TIER_D;
const ROLE_TIER_E = process.env.ROLE_TIER_E;

const ELO_RANK_ROLE_IDS = {
  wished: '1471941253582032967',
  bronze: '1471941528330178770',
  argent: '1471942802362466445',
  or: '1471941661465776292',
  diamant: '1471942853851615243',
  mythique: '1471942959741145088',
  legendaire: '1471943001801621504',
  master: '1471943041815154911',
  grandmaster: '1471943169343094887',
  verdoyant: '1471943202067058859'
};

const TIER_DISTRIBUTION = [
  { tier: 'S', ratio: 0.005, minCount: 1 },
  { tier: 'A', ratio: 0.02, minCount: 1 },
  { tier: 'B', ratio: 0.04, minCount: 1 },
  { tier: 'C', ratio: 0.1, minCount: 1 },
  { tier: 'D', ratio: 0.28, minCount: 1 },
  { tier: 'E', ratio: 0.555, minCount: 1 }
];

const TIER_EMOJIS = {
  S: '<:TierS:1482724565657321594>',
  A: '<:TierA:1482724563874877592>',
  B: '<:TierB:1482724560993259651>',
  C: '<:TierC:1482724558015299706>',
  D: '<:TierD:1482724568387817484>',
  E: '<:TierE:1482723920309260439>'
};

const PUBLIC_TIER_ROLE_LOOKUP = [
  { roleId: '1482720508813512814', tier: 'Tier S', emoji: '<:TierS:1482724565657321594>' },
  { roleId: '1482720488529727498', tier: 'Tier A', emoji: '<:TierA:1482724563874877592>' },
  { roleId: '1482720438751723621', tier: 'Tier B', emoji: '<:TierB:1482724560993259651>' },
  { roleId: '1482720402428924047', tier: 'Tier C', emoji: '<:TierC:1482724558015299706>' },
  { roleId: '1482720374713094164', tier: 'Tier D', emoji: '<:TierD:1482724568387817484>' },
  { roleId: '1482720488529727498', tier: 'Tier E', emoji: '<:TierE:1482723920309260439>' }
];

const PUBLIC_TIER_COLORS = {
  'Tier S': 0xf1c40f,
  'Tier A': 0xe74c3c,
  'Tier B': 0xe67e22,
  'Tier C': 0x9b59b6,
  'Tier D': 0x3498db,
  'Tier E': 0x2ecc71
};

const BRONZE_EMOJI = '<:Bronze:1439605520729116702>';
const SILVER_EMOJI = '<:Silver:1439995612069101681>';
const GOLD_EMOJI = '<:GoldPL:1468675832334520350>';
const DIAMOND_EMOJI = '<:DiamondPL:1468679124536000603>';
const MYTHIC_EMOJI = '<:MythicPL:1468678611153457357>';
const LEGENDARY_EMOJI = '<:LegendaryPL:1469005421749731368>';
const MASTER_EMOJI = '<:MastersPL:1469005501642833941>';
const GRANDMASTER_EMOJI = '<:GrandMastersPL:1469006144352555093>';
const VERDOYANT_EMOJI = '<:VerdoyantPL:1469007377234919454>';
const WISHED_EMOJI = '<:Wished:1439415315720175636>';

const VOLATILITY_MULTIPLIERS = [
  { min: 2700, multiplier: 2.5 },
  { min: 2400, multiplier: 2.2 },
  { min: 2250, multiplier: 2.0 },
  { min: 2100, multiplier: 1.8 },
  { min: 1950, multiplier: 1.7 },
  { min: 1850, multiplier: 1.6 },
  { min: 1750, multiplier: 1.5 },
  { min: 1675, multiplier: 1.4 },
  { min: 1600, multiplier: 1.3 },
  { min: 1525, multiplier: 1.2 },
  { min: -Infinity, multiplier: 1.0 }
];
const MAX_STREAK_K_BONUS = 20;
const MAX_WINSTREAK_ELO_BONUS = 10;
const RANK_THRESHOLDS = [2400, 2100, 1800, 1500, 1200];

const ELO_RANKS = [
  { min: 2700, name: 'Verdoyant', numeral: null, emoji: VERDOYANT_EMOJI },
  { min: 2400, name: 'Grand Master', numeral: 'III', emoji: GRANDMASTER_EMOJI },
  { min: 2250, name: 'Grand Master', numeral: 'II', emoji: GRANDMASTER_EMOJI },
  { min: 2100, name: 'Grand Master', numeral: 'I', emoji: GRANDMASTER_EMOJI },
  { min: 1950, name: 'Master', numeral: 'III', emoji: MASTER_EMOJI },
  { min: 1850, name: 'Master', numeral: 'II', emoji: MASTER_EMOJI },
  { min: 1750, name: 'Master', numeral: 'I', emoji: MASTER_EMOJI },
  { min: 1675, name: 'Légendaire', numeral: 'III', emoji: LEGENDARY_EMOJI },
  { min: 1600, name: 'Légendaire', numeral: 'II', emoji: LEGENDARY_EMOJI },
  { min: 1525, name: 'Légendaire', numeral: 'I', emoji: LEGENDARY_EMOJI },
  { min: 1450, name: 'Mythique', numeral: 'III', emoji: MYTHIC_EMOJI },
  { min: 1400, name: 'Mythique', numeral: 'II', emoji: MYTHIC_EMOJI },
  { min: 1350, name: 'Mythique', numeral: 'I', emoji: MYTHIC_EMOJI },
  { min: 1300, name: 'Diamant', numeral: 'III', emoji: DIAMOND_EMOJI },
  { min: 1260, name: 'Diamant', numeral: 'II', emoji: DIAMOND_EMOJI },
  { min: 1220, name: 'Diamant', numeral: 'I', emoji: DIAMOND_EMOJI },
  { min: 1180, name: 'Gold', numeral: 'III', emoji: GOLD_EMOJI },
  { min: 1150, name: 'Gold', numeral: 'II', emoji: GOLD_EMOJI },
  { min: 1120, name: 'Gold', numeral: 'I', emoji: GOLD_EMOJI },
  { min: 1090, name: 'Silver', numeral: 'III', emoji: SILVER_EMOJI },
  { min: 1070, name: 'Silver', numeral: 'II', emoji: SILVER_EMOJI },
  { min: 1050, name: 'Silver', numeral: 'I', emoji: SILVER_EMOJI },
  { min: 1030, name: 'Bronze', numeral: 'III', emoji: BRONZE_EMOJI },
  { min: 1020, name: 'Bronze', numeral: 'II', emoji: BRONZE_EMOJI },
  { min: 1000, name: 'Bronze', numeral: 'I', emoji: BRONZE_EMOJI },
  { min: -Infinity, name: 'Wished', numeral: null, emoji: WISHED_EMOJI }
];

const ELO_MAJOR_RANK_ORDER = {
  Wished: 0,
  Bronze: 1,
  Silver: 2,
  Gold: 3,
  Diamant: 4,
  Mythique: 5,
  'Légendaire': 6,
  Master: 7,
  'Grand Master': 8,
  Verdoyant: 9
};

const PRISSCUP_RULES_EN = `📘 PRISS Cup – Rulebook (3v3 – 8 teams)

🎮 Format
- 8 teams
- BO1 → BO3 → BO5
- No remakes
- Disconnect = round lost
- 10 minutes late = disqualification (DQ)

🗺️ Maps

ROUND 1 – BO1
- Hard-Rock Mine (*Gem Grab*)

SEMI-FINALS – BO3
1. Dueling Beetles (*Hot Zone*)
2. Belle’s Rock (*Knockout*)
3. Hot Potato (*Heist*)

FINALS – BO5
1. Shooting Star (*Bounty*)
2. Triple Dribble (*Brawl Ball*)
3. Crystal Arcade (*Gem Grab*)
4. Kaboom Canyon (*Heist*)
5. Ring of Fire (*Hot Zone*)

🏟️ Organization
- Channel: #match-codes
- Teams post their room code
- Match starts when both teams are ready`;

const TEAMS = {
  'Team 1': ['PlayerA', 'PlayerB', 'PlayerC'],
  'Team 2': ['PlayerD', 'PlayerE', 'PlayerF']
};

const queueStatusMessages = new Map();
const prisscupData = {
  messageIdByGuild: {}
};
const draftSessions = new Map();
const simpleLobbyQueues = new Map();

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

function isSimpleLobbyChannel(message) {
  return Boolean(SIMPLE_LOBBY_CHANNEL_ID && message.channelId === SIMPLE_LOBBY_CHANNEL_ID);
}

function isSimpleLobbyEnabled() {
  return Boolean(SIMPLE_LOBBY_CHANNEL_ID || !PL_QUEUE_CHANNEL_ID);
}

function shouldUseSimpleLobby(message) {
  if (!message?.guild || message.guild.id !== DISCORD_GUILD_ID) {
    return false;
  }

  if (isSimpleLobbyChannel(message)) {
    return true;
  }

  if (SIMPLE_LOBBY_CHANNEL_ID) {
    return false;
  }

  return !PL_QUEUE_CHANNEL_ID;
}

function getSimpleLobbyTeamSize() {
  if (SIMPLE_LOBBY_TEAM_SIZE * 2 === SIMPLE_LOBBY_SIZE) {
    return SIMPLE_LOBBY_TEAM_SIZE;
  }

  return Math.floor(SIMPLE_LOBBY_SIZE / 2);
}

function getSimpleLobbyQueue(guildId) {
  if (!guildId) {
    return [];
  }

  if (!simpleLobbyQueues.has(guildId)) {
    simpleLobbyQueues.set(guildId, []);
  }

  return simpleLobbyQueues.get(guildId);
}

function shufflePlayers(players) {
  const shuffled = [...players];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
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
const performanceStores = createPerformanceStores({
  supabase,
  logger: {
    info: (...args) => log(...args),
    warn: (...args) => warn(...args),
    error: (...args) => errorLog(...args)
  }
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
let plQueueChannel = null;
let tierSyncInterval = null;
let worstPlayerRoleInterval = null;
let botStarted = false;
let supportsShieldColumns = true;
let commandUsageCounter = 0;

const QUEUE_CONFIGS = [{ maxEloDifference: null }];
const QUEUE_COUNT = QUEUE_CONFIGS.length;
const matchQueues = Array.from({ length: QUEUE_COUNT }, () => []);
const queueEntries = new Map();
const activeMatches = new Map();
const pendingRoomForms = new Map();
const customRooms = new Map();
const pendingPrisscupTeams = new Map();
const dodgeQueueLocks = new Map();
const plJoinBanLocks = new Map();
const plQueueJoinLocks = new Set();
const matchResolutionLocks = new Set();

// ===== PL Queue System START =====
const DEFAULT_PL_DATA = {
  queueMessageIdByGuild: {}
};

let plData = { ...DEFAULT_PL_DATA };

// === RUNTIME PL QUEUE (Supabase) ===
const plQueueCache = new Map();
const plSecondaryQueueCache = new Map();
// Table runtime_pl_queue expected columns:
// guild_id (text), user_id (text), joined_at (timestamptz)

// === RUNTIME ACTIVE MATCHES (Supabase) ===
const runtimeActiveMatchesCache = new Map();
const plMatchTimers = new Map();
// Table runtime_active_matches expected columns:
// message_id (text, PK), guild_id (text), players (jsonb), is_pl (boolean), status (text), created_at (timestamptz), timeout_at (timestamptz)

async function ensurePLQueueChannel(guildContext) {
  if (plQueueChannel && plQueueChannel.id === PL_QUEUE_CHANNEL_ID) {
    return plQueueChannel;
  }

  if (!guildContext?.channels?.fetch) {
    return plQueueChannel;
  }

  try {
    const fetched = await guildContext.channels.fetch(PL_QUEUE_CHANNEL_ID);
    if (fetched?.isTextBased()) {
      plQueueChannel = fetched;
    }
  } catch (err) {
    warn('Unable to fetch PL queue channel dynamically:', err?.message || err);
  }

  return plQueueChannel;
}

function getPLQueue(guildId) {
  if (!plQueueCache.has(guildId)) {
    plQueueCache.set(guildId, []);
  }
  return plQueueCache.get(guildId);
}

function getSecondaryPLQueue(guildId) {
  if (!plSecondaryQueueCache.has(guildId)) {
    plSecondaryQueueCache.set(guildId, []);
  }
  return plSecondaryQueueCache.get(guildId);
}

function getPLQueueByIndex(guildId, queueIndex = 1) {
  return queueIndex === 2 ? getSecondaryPLQueue(guildId) : getPLQueue(guildId);
}

async function ensureRuntimePlQueueLoaded(guildId) {
  if (!guildId) {
    return [];
  }

  if (!plQueueCache.has(guildId)) {
    await loadRuntimePlQueue(guildId);
  }

  return getPLQueue(guildId);
}

function isInPLQueue(guildId, userId) {
  const primaryQueue = getPLQueue(guildId);
  const secondaryQueue = getSecondaryPLQueue(guildId);
  return primaryQueue.includes(userId) || secondaryQueue.includes(userId);
}

function addToSecondaryPlQueue(guildId, userId) {
  const queue = getSecondaryPLQueue(guildId);
  if (queue.includes(userId)) {
    return { added: false, reason: 'already' };
  }

  queue.push(userId);
  plSecondaryQueueCache.set(guildId, queue);
  return { added: true, queueIndex: 2 };
}

function removeFromSecondaryPlQueue(guildId, userId) {
  const queue = getSecondaryPLQueue(guildId);
  const index = queue.indexOf(userId);

  if (index === -1) {
    return { removed: false };
  }

  queue.splice(index, 1);
  plSecondaryQueueCache.set(guildId, queue);
  return { removed: true, queueIndex: 2 };
}

async function loadRuntimePlQueue(guildId) {
  const { data, error } = await supabase
    .from('runtime_pl_queue')
    .select('user_id')
    .eq('guild_id', guildId)
    .order('joined_at', { ascending: true });

  if (error) {
    warn('Unable to load runtime PL queue:', error.message);
    plQueueCache.set(guildId, getPLQueue(guildId));
    return getPLQueue(guildId);
  }

  const queue = (data || []).map((row) => row.user_id);
  plQueueCache.set(guildId, queue);
  return queue;
}

async function addToRuntimePlQueue(guildId, userId) {
  const queue = getPLQueue(guildId);
  if (queue.includes(userId)) {
    return { added: false, reason: 'already' };
  }

  const { error } = await supabase
    .from('runtime_pl_queue')
    .insert({ guild_id: guildId, user_id: userId, joined_at: new Date().toISOString() });

  if (error) {
    errorLog('Unable to add player to runtime PL queue:', error.message);
    return { added: false, reason: 'error' };
  }

  queue.push(userId);
  plQueueCache.set(guildId, queue);
  return { added: true };
}

async function removeFromRuntimePlQueue(guildId, userId) {
  const queue = getPLQueue(guildId);
  const index = queue.indexOf(userId);

  if (index === -1) {
    return { removed: false };
  }

  const { error } = await supabase
    .from('runtime_pl_queue')
    .delete()
    .eq('guild_id', guildId)
    .eq('user_id', userId);

  if (error) {
    errorLog('Unable to remove player from runtime PL queue:', error.message);
    return { removed: false, reason: 'error' };
  }

  queue.splice(index, 1);
  plQueueCache.set(guildId, queue);
  return { removed: true };
}

async function removePlayersFromRuntimePlQueue(guildId, userIds = []) {
  const queue = getPLQueue(guildId);
  const remaining = queue.filter((id) => !userIds.includes(id));

  const { error } = await supabase
    .from('runtime_pl_queue')
    .delete()
    .eq('guild_id', guildId)
    .in('user_id', userIds);

  if (error) {
    errorLog('Unable to bulk remove players from runtime PL queue:', error.message);
  }

  plQueueCache.set(guildId, remaining);
  return remaining;
}

async function clearRuntimePlQueue(guildId) {
  await ensureRuntimePlQueueLoaded(guildId);
  const { error } = await supabase.from('runtime_pl_queue').delete().eq('guild_id', guildId);
  if (error) {
    errorLog('Unable to clear runtime PL queue:', error.message);
    return false;
  }

  plQueueCache.set(guildId, []);
  plSecondaryQueueCache.set(guildId, []);
  return true;
}

async function requeueRuntimePlPlayers(guildId, userIds = []) {
  const queue = getPLQueue(guildId);
  const toInsert = userIds.filter((id) => !queue.includes(id));

  if (!toInsert.length) {
    return queue;
  }

  const rows = toInsert.map((id) => ({
    guild_id: guildId,
    user_id: id,
    joined_at: new Date().toISOString()
  }));

  const { error } = await supabase.from('runtime_pl_queue').insert(rows);

  if (error) {
    errorLog('Unable to requeue runtime PL players:', error.message);
    return queue;
  }

  const updated = [...queue, ...toInsert];
  plQueueCache.set(guildId, updated);
  return updated;
}

async function getRuntimeMatchRecord(messageId) {
  if (runtimeActiveMatchesCache.has(messageId)) {
    return runtimeActiveMatchesCache.get(messageId);
  }

  const { data, error } = await supabase
    .from('runtime_active_matches')
    .select('*')
    .eq('message_id', messageId)
    .single();

  if (error) {
    warn('Unable to fetch runtime match record:', error.message);
    return null;
  }

  runtimeActiveMatchesCache.set(messageId, data);
  return data;
}

async function saveRuntimeActiveMatch(record) {
  const payload = {
    message_id: record.message_id,
    guild_id: record.guild_id,
    players: record.players,
    is_pl: record.is_pl,
    status: record.status || 'pending',
    created_at: record.created_at || new Date().toISOString(),
    timeout_at: record.timeout_at || null
  };

  const { error } = await supabase.from('runtime_active_matches').upsert(payload);

  if (error) {
    errorLog('Unable to persist runtime active match:', error.message);
    return null;
  }

  runtimeActiveMatchesCache.set(record.message_id, payload);
  return payload;
}

async function updateRuntimeActiveMatchStatus(messageId, status, extras = {}) {
  const { error } = await supabase
    .from('runtime_active_matches')
    .update({ status, ...extras })
    .eq('message_id', messageId);

  if (error) {
    warn('Unable to update runtime active match status:', error.message);
    return null;
  }

  if (status === 'resolved' || status === 'timeout') {
    runtimeActiveMatchesCache.delete(messageId);
  } else {
    const cached = runtimeActiveMatchesCache.get(messageId) || {};
    runtimeActiveMatchesCache.set(messageId, { ...cached, status, ...extras });
  }

  return true;
}

async function loadPendingRuntimeMatches(guildId) {
  if (!guildId) {
    return [];
  }

  const { data, error } = await supabase
    .from('runtime_active_matches')
    .select('*')
    .eq('guild_id', guildId)
    .eq('status', 'pending');

  if (error) {
    warn('Unable to load pending runtime matches:', error.message);
    return [];
  }

  (data || []).forEach((record) => {
    runtimeActiveMatchesCache.set(record.message_id, record);
  });

  return data || [];
}

async function formatPLQueueDetails(queue) {
  let rankingByDiscordId = new Map();
  let totalPlayers = null;
  let playersByDiscordId = new Map();

  try {
    const rankingInfo = await getSiteRankingMap();
    rankingByDiscordId = rankingInfo.rankingByDiscordId;
    totalPlayers = rankingInfo.totalPlayers;
  } catch (err) {
    warn('Unable to load PL rankings:', err?.message || err);
  }

  if (queue.length) {
    try {
      playersByDiscordId = await performanceStores.playerStore.getPlayersByDiscordIds(queue.map((id) => id.toString()));
    } catch (err) {
      warn('Unable to load player profiles for PL queue:', err?.message || err);
    }
  }

  const formatLine = (id, index, language) => {
    const profile = playersByDiscordId.get(id?.toString());
    const eloRankInfo = getEloRankByRating(profile?.solo_elo);
    const eloRankLabel = formatEloRankLabel(eloRankInfo) || (language === LANGUAGE_EN ? 'Unranked' : 'Non classé');
    const rankInfo = rankingByDiscordId.get(id?.toString());
    const rankLabel = rankInfo
      ? language === LANGUAGE_EN
        ? `Rank #${rankInfo.rank}${totalPlayers ? `/${totalPlayers}` : ''}`
        : `Rang #${rankInfo.rank}${totalPlayers ? `/${totalPlayers}` : ''}`
      : language === LANGUAGE_EN
        ? 'Unranked'
        : 'Non classé';

    return `${index + 1}. <@${id}> — ${eloRankLabel} • ${rankLabel}`;
  };

  const buildList = (language) => {
    if (!queue.length) {
      return language === LANGUAGE_EN ? 'No players in queue.' : 'Aucun joueur en file.';
    }

    return queue.map((id, index) => formatLine(id, index, language)).join('\n');
  };

  return {
    fr: buildList(LANGUAGE_FR),
    en: buildList(LANGUAGE_EN)
  };
}

async function sendOrUpdateQueueMessage(guildContext, channel) {
  if (!guildContext) {
    return null;
  }

  const targetChannel = channel?.isTextBased() ? channel : await ensurePLQueueChannel(guildContext);
  if (!targetChannel?.isTextBased()) {
    return null;
  }

  const primaryQueue = getPLQueueByIndex(guildContext.id, 1);
  const secondaryQueue = getPLQueueByIndex(guildContext.id, 2);
  const primaryDetails = await formatPLQueueDetails(primaryQueue);
  const secondaryDetails = await formatPLQueueDetails(secondaryQueue);

  const descriptionFr = [
    `🔁 File 1 (principale) : **${primaryQueue.length}/${MATCH_SIZE}** joueurs`,
    primaryDetails.fr,
    '',
    `⚡ File 2 (fallback) : **${secondaryQueue.length}/${MATCH_SIZE}** joueurs`,
    secondaryDetails.fr,
    '',
    'ℹ️ `!join 2` pour rejoindre la file fallback.'
  ].join('\n');

  const embed = new EmbedBuilder()
    .setTitle('Power League')
    .setDescription(descriptionFr)
    .setColor(0x3498db)
    .setTimestamp(new Date());

  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('pl_queue_join')
        .setLabel('Rejoindre la file / Join queue')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('pl_queue_leave')
        .setLabel('Quitter la file / Leave queue')
        .setStyle(ButtonStyle.Secondary)
    )
  ];

  const storedMessageId = plData.queueMessageIdByGuild[guildContext.id];
  let queueMessage = null;

  if (storedMessageId) {
    try {
      queueMessage = await targetChannel.messages.fetch(storedMessageId);
      await queueMessage.edit({ embeds: [embed], components });
    } catch (err) {
      warn('Unable to edit existing PL queue message, creating a new one:', err?.message || err);
      queueMessage = null;
    }
  }

    if (!queueMessage) {
      const botId = client?.user?.id;

    if (botId) {
      try {
        const recentMessages = await targetChannel.messages.fetch({ limit: 50 });
        const staleMessages = recentMessages.filter(
          (message) =>
            message.author.id === botId &&
            message.embeds?.[0]?.title === embed.data.title &&
            message.id !== storedMessageId
        );

        await Promise.all(Array.from(staleMessages.values()).map((message) => message.delete().catch(() => null)));
      } catch (err) {
        warn('Unable to clean up old PL queue messages:', err?.message || err);
      }
    }

      queueMessage = await targetChannel.send({ embeds: [embed], components });
      plData.queueMessageIdByGuild[guildContext.id] = queueMessage.id;
    }

  return queueMessage;
}

async function getMajorRankLevelForUserInGuild(guildContext, userId) {
  let profile = await fetchPlayerByDiscordId(userId).catch(() => null);

  if (!profile && guildContext) {
    const member = await guildContext.members.fetch(userId).catch(() => null);
    if (member) {
      profile = await getOrCreatePlayer(userId, member.displayName || member.user.username).catch(() => null);
    }
  }

  return getEloMajorRankLevel(profile?.solo_elo);
}

function buildRankGapErrorEmbed() {
  return new EmbedBuilder().setColor(0xef4444).setDescription('Écart de rang trop élevé');
}

async function addWhiteCheckmarkReaction(message) {
  if (!message?.react) {
    return;
  }

  await message.react('✅').catch(() => null);
}

function buildPLJoinReplyContent(joinResult) {
  if (joinResult.blockedByDodgeLock) {
    return `Tu as 4 votes dodge: -30 Elo et verrouillage 1h. Réessaie dans ${formatDurationMinutes(joinResult.lockRemainingMs)}. (4 dodge votes: -30 Elo and 1h lock. Try again in ${formatDurationMinutes(joinResult.lockRemainingMs)}.)`;
  }

  if (joinResult.blockedByPendingMatch) {
    return 'Tu es déjà dans un match en attente. Attends sa validation avant de rejoindre la file. (You are already in a pending match. Wait for validation before joining the queue.)';
  }

  if (joinResult.blockedByPLBan) {
    return `🚫 Tu es banni de !join pendant encore ${formatDurationMinutes(joinResult.banRemainingMs)}. (You are banned from !join for ${formatDurationMinutes(joinResult.banRemainingMs)}.)`;
  }

  if (joinResult.reason === 'pending') {
    return 'Demande déjà en cours, attends 1-2 secondes avant de recliquer. (A request is already in progress, wait 1-2 seconds before trying again.)';
  }

  if (joinResult.fallbackToQueue2) {
    return '⚡ Écart de rang sur la file 1: tu as été ajouté automatiquement en file 2. (Rank gap in queue 1: you were automatically moved to queue 2.)';
  }

  if (joinResult.added) {
    return joinResult.queueIndex === 2
      ? '✅ Tu as rejoint la file 2. (You joined queue 2.)'
      : '✅ Tu as rejoint la file PL. (You joined the PL queue.)';
  }

  return 'Tu es déjà dans une file PL. (You are already in a PL queue.)';
}

async function addPlayerToPLQueue(userId, guildContext, options = {}) {
  const queueIndex = options.queueIndex === 2 ? 2 : 1;
  const lockKey = `${guildContext.id}:${userId}:q${queueIndex}`;
  if (plQueueJoinLocks.has(lockKey)) {
    return { added: false, reason: 'pending', queueIndex };
  }

  plQueueJoinLocks.add(lockKey);

  try {
    await ensureRuntimePlQueueLoaded(guildContext.id);
    await loadPendingRuntimeMatches(guildContext.id);

    const lockRemainingMs = getQueueLockRemainingMs(userId);
    if (lockRemainingMs > 0) {
      return { added: false, blockedByDodgeLock: true, lockRemainingMs, queueIndex };
    }

    const banRemainingMs = getPLBanRemainingMs(userId);
    if (banRemainingMs > 0) {
      return { added: false, blockedByPLBan: true, banRemainingMs, queueIndex };
    }

    if (getPendingMatchForUser(userId)) {
      return { added: false, blockedByPendingMatch: true, queueIndex };
    }

    if (isInPLQueue(guildContext.id, userId)) {
      return { added: false, reason: 'already', queueIndex };
    }

    if (queueIndex === 1) {
      const queueIds = getPLQueue(guildContext.id);
      if (queueIds.length) {
        const allIds = [...queueIds, userId];
        const levels = await Promise.all(allIds.map((id) => getMajorRankLevelForUserInGuild(guildContext, id)));
        const minLevel = Math.min(...levels);
        const maxLevel = Math.max(...levels);

        if (maxLevel - minLevel > MAX_MATCHMAKING_MAJOR_RANK_GAP) {
          const fallbackResult = await addPlayerToPLQueue(userId, guildContext, { queueIndex: 2 });
          return {
            ...fallbackResult,
            fallbackToQueue2: Boolean(fallbackResult.added),
            blockedByRankGap: !fallbackResult.added
          };
        }
      }

      const result = await addToRuntimePlQueue(guildContext.id, userId);
      await sendOrUpdateQueueMessage(guildContext, plQueueChannel);
      return { ...result, queueIndex: 1 };
    }

    const result = addToSecondaryPlQueue(guildContext.id, userId);
    await sendOrUpdateQueueMessage(guildContext, plQueueChannel);
    return { ...result, queueIndex: 2 };
  } finally {
    plQueueJoinLocks.delete(lockKey);
  }
}

async function removePlayerFromPLQueue(userId, guildContext, options = {}) {
  const requestedQueueIndex = options.queueIndex === 2 ? 2 : options.queueIndex === 1 ? 1 : null;

  await ensureRuntimePlQueueLoaded(guildContext.id);

  let result = { removed: false };
  if (requestedQueueIndex == null || requestedQueueIndex === 1) {
    result = await removeFromRuntimePlQueue(guildContext.id, userId);
    if (result.removed) {
      result.queueIndex = 1;
    }
  }

  if (!result.removed && (requestedQueueIndex == null || requestedQueueIndex === 2)) {
    const secondaryResult = removeFromSecondaryPlQueue(guildContext.id, userId);
    if (secondaryResult.removed) {
      result = secondaryResult;
    }
  }

  await sendOrUpdateQueueMessage(guildContext, plQueueChannel);
  return result;
}

function schedulePLTimeout(messageId, remainingMs) {
  if (plMatchTimers.has(messageId)) {
    clearTimeout(plMatchTimers.get(messageId));
  }

  const timer = setTimeout(() => {
    handlePLMatchTimeout(messageId).catch((err) => errorLog('PL timeout failed:', err));
  }, remainingMs);

  plMatchTimers.set(messageId, timer);
}

async function handlePLMatchTimeout(messageId) {
  const matchInfo = await getRuntimeMatchRecord(messageId);
  if (!matchInfo || matchInfo.status !== 'pending' || !matchInfo.is_pl) {
    return;
  }

  if (plMatchTimers.has(messageId)) {
    clearTimeout(plMatchTimers.get(messageId));
    plMatchTimers.delete(messageId);
  }

  const guildContext = guild && guild.id === matchInfo.guild_id ? guild : null;
  let channel = matchChannel?.isTextBased()
    ? matchChannel
    : plQueueChannel?.guild?.id === matchInfo.guild_id
      ? plQueueChannel
      : null;
  if (!channel && guildContext) {
    channel = await ensurePLQueueChannel(guildContext);
  }

  const matchState = [...activeMatches.values()].find((state) => state.messageId === messageId);
  const runtimeState =
    !matchState && matchInfo?.players
      ? {
          threadId: matchInfo.players.threadId || null,
          lobbyRoleId: matchInfo.players.lobbyRoleId || null
        }
      : null;

  if (channel?.isTextBased()) {
    await channel.send({
      content:
        '⏰ Match annulé (1 heure écoulée, aucun résultat). Joueurs retirés du match.\n⏰ Match cancelled (1 hour passed, no result). Players removed from the match.'
    });
  }

  if (matchState?.matchId) {
    await updateMatchRecord(matchState.matchId, {
      status: 'cancelled',
      winner: null,
      completed_at: new Date().toISOString()
    }).catch((err) => warn('Unable to cancel timed out match record:', err?.message || err));
  }

  if (matchState) {
    await cleanupMatchResources(matchState);
  } else if (runtimeState?.threadId || runtimeState?.lobbyRoleId) {
    await cleanupMatchResources(runtimeState);
  }

  await updateRuntimeActiveMatchStatus(messageId, 'timeout');
  for (const [id, state] of activeMatches.entries()) {
    if (state.messageId === messageId) {
      activeMatches.delete(id);
    }
  }
  await sendOrUpdateQueueMessage(guildContext || guild, plQueueChannel);
  await processPLQueue();
}

async function handlePLMatchResolved(messageId) {
  if (plMatchTimers.has(messageId)) {
    clearTimeout(plMatchTimers.get(messageId));
    plMatchTimers.delete(messageId);
  }

  await updateRuntimeActiveMatchStatus(messageId, 'resolved');
  for (const [id, state] of activeMatches.entries()) {
    if (state.messageId === messageId) {
      activeMatches.delete(id);
    }
  }
}

async function buildParticipantsForPLQueue(participantsIds = []) {
  if (!guild || !participantsIds.length) {
    return [];
  }

  const participants = [];
  const membersById = await performanceStores.memberStore.fetchMembers(guild, participantsIds);

  const missingMemberIds = participantsIds.filter((id) => !membersById.get(id));
  for (const missingId of missingMemberIds) {
    warn(`Unable to fetch member ${missingId} for PL match.`);
  }

  const members = participantsIds
    .map((id) => membersById.get(id))
    .filter(Boolean);

  const playerProfilesById = await performanceStores.playerStore.getPlayersByDiscordIds(
    members.map((member) => member.id)
  );

  for (const member of members) {
    const cachedProfile = playerProfilesById.get(member.id);

    let profile = cachedProfile;
    if (!profile) {
      try {
        profile = await getOrCreatePlayer(member.id, member.displayName || member.user.username);
      } catch (err) {
        warn('Unable to create missing player record for PL queue:', err?.message || err);
        continue;
      }
    }

    if (!profile) {
      continue;
    }

    if ((member.displayName || member.user.username) !== profile.name) {
      profile = await getOrCreatePlayer(member.id, member.displayName || member.user.username);
    }

    participants.push(buildQueueEntry(member, profile));
  }

  return participants;
}

async function processSinglePLQueue(queueIndex, sourceLabel = 'main') {
  const queue = getPLQueueByIndex(guild.id, queueIndex);

  while (queue.length >= MATCH_SIZE) {
    const participantsIds = queue.splice(0, MATCH_SIZE);
    const participants = await buildParticipantsForPLQueue(participantsIds);

    if (participants.length < MATCH_SIZE) {
      if (queueIndex === 1) {
        await requeueRuntimePlPlayers(guild.id, participantsIds);
      } else {
        queue.unshift(...participantsIds);
      }
      await sendOrUpdateQueueMessage(guild, plQueueChannel);
      break;
    }

    try {
      if (queueIndex === 1) {
        await removePlayersFromRuntimePlQueue(guild.id, participantsIds);
      }

      const state = await startMatch(participants, matchChannel || plQueueChannel, true);
      if (state?.messageId) {
        const timeoutAt = state.timeoutAt || new Date(Date.now() + PL_MATCH_TIMEOUT_MS).toISOString();
        const timeoutDelay = Math.max(1, new Date(timeoutAt).getTime() - Date.now());
        await saveRuntimeActiveMatch({
          message_id: state.messageId,
          guild_id: guild.id,
          players: {
            ids: participantsIds,
            queueIndex,
            sourceLabel,
            matchId: state.matchId,
            threadId: state.threadId,
            lobbyRoleId: state.lobbyRoleId,
            channelId: state.channelId
          },
          is_pl: true,
          status: 'pending',
          created_at: new Date().toISOString(),
          timeout_at: timeoutAt
        });
        schedulePLTimeout(state.messageId, timeoutDelay);
      }
    } catch (err) {
      errorLog(`Failed to create PL match from queue ${queueIndex}:`, err);
      if (queueIndex === 1) {
        await requeueRuntimePlPlayers(guild.id, participantsIds);
      } else {
        queue.unshift(...participantsIds);
      }
      await sendOrUpdateQueueMessage(guild, plQueueChannel);
      break;
    }
  }
}

async function processPLQueue() {
  if (!guild) {
    return;
  }

  const channel = await ensurePLQueueChannel(guild);
  if (!channel?.isTextBased()) {
    return;
  }
  plQueueChannel = channel;

  await processSinglePLQueue(1, 'primary');
  await processSinglePLQueue(2, 'fallback');

  await sendOrUpdateQueueMessage(guild, plQueueChannel);
}

async function restorePLState() {
  if (guild?.id) {
    await loadRuntimePlQueue(guild.id);
  }

  if (guild && plQueueChannel?.isTextBased()) {
    await sendOrUpdateQueueMessage(guild, plQueueChannel);
  }

  const activeEntries = await loadPendingRuntimeMatches(guild?.id);
  for (const matchInfo of activeEntries) {
    const timeoutAt = matchInfo.timeout_at ? new Date(matchInfo.timeout_at).getTime() : null;
    const remaining = timeoutAt ? timeoutAt - Date.now() : null;

    if (matchInfo.is_pl) {
      if (remaining != null && remaining > 0) {
        schedulePLTimeout(matchInfo.message_id, remaining);
      } else if (matchInfo.is_pl) {
        await handlePLMatchTimeout(matchInfo.message_id);
      }
    }
  }
}
// ===== PL Queue System END =====

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
  return getPendingMatchForUser(userId);
}

function buildAdminSlashCommands() {
  return [
    {
      name: 'addelo',
      description: localizeText({ fr: 'Ajouter de l’Elo à un joueur', en: 'Add Elo to a player' }),
      dm_permission: false,
      options: [
        {
          name: 'player',
          description: localizeText({ fr: 'Joueur ciblé', en: 'Target player' }),
          type: ApplicationCommandOptionType.User,
          required: true
        },
        {
          name: 'amount',
          description: localizeText({ fr: 'Nombre d’Elo à ajouter', en: 'Elo amount to add' }),
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 1,
          max_value: 2000
        }
      ]
    },
    {
      name: 'removeelo',
      description: localizeText({ fr: 'Retirer de l’Elo à un joueur', en: 'Remove Elo from a player' }),
      dm_permission: false,
      options: [
        {
          name: 'player',
          description: localizeText({ fr: 'Joueur ciblé', en: 'Target player' }),
          type: ApplicationCommandOptionType.User,
          required: true
        },
        {
          name: 'amount',
          description: localizeText({ fr: 'Nombre d’Elo à retirer', en: 'Elo amount to remove' }),
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 1,
          max_value: 2000
        }
      ]
    },
    {
      name: 'addpoints',
      description: localizeText({ fr: 'Ajouter des points de tier à un joueur', en: 'Add tier points to a player' }),
      dm_permission: false,
      options: [
        {
          name: 'player',
          description: localizeText({ fr: 'Joueur ciblé', en: 'Target player' }),
          type: ApplicationCommandOptionType.User,
          required: true
        },
        {
          name: 'amount',
          description: localizeText({ fr: 'Nombre de points à ajouter', en: 'Points amount to add' }),
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 1,
          max_value: 10000
        }
      ]
    },
    {
      name: 'setws',
      description: localizeText({ fr: 'Définir la winstreak d’un joueur', en: 'Set a player win streak' }),
      dm_permission: false,
      options: [
        {
          name: 'player',
          description: localizeText({ fr: 'Joueur ciblé', en: 'Target player' }),
          type: ApplicationCommandOptionType.User,
          required: true
        },
        {
          name: 'value',
          description: localizeText({ fr: 'Valeur de winstreak', en: 'Win streak value' }),
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 0,
          max_value: 200
        }
      ]
    },
    {
      name: 'setls',
      description: localizeText({ fr: 'Définir la losestreak d’un joueur', en: 'Set a player lose streak' }),
      dm_permission: false,
      options: [
        {
          name: 'player',
          description: localizeText({ fr: 'Joueur ciblé', en: 'Target player' }),
          type: ApplicationCommandOptionType.User,
          required: true
        },
        {
          name: 'value',
          description: localizeText({ fr: 'Valeur de losestreak', en: 'Lose streak value' }),
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 0,
          max_value: 200
        }
      ]
    },
    {
      name: 'banpl',
      description: localizeText({ fr: 'Empêcher un joueur d’utiliser !join', en: 'Ban a player from !join' }),
      dm_permission: false,
      options: [
        {
          name: 'player',
          description: localizeText({ fr: 'Joueur ciblé', en: 'Target player' }),
          type: ApplicationCommandOptionType.User,
          required: true
        },
        {
          name: 'duration',
          description: localizeText({ fr: 'Durée (ex: 30m, 2h, 1d)', en: 'Duration (e.g. 30m, 2h, 1d)' }),
          type: ApplicationCommandOptionType.String,
          required: true
        }
      ]
    },
    {
      name: 'cancelmatch',
      description: localizeText({ fr: 'Annuler un match PL en cours', en: 'Cancel a running PL match' }),
      dm_permission: false,
      options: [
        {
          name: 'match_id',
          description: localizeText({ fr: 'Identifiant du match', en: 'Match ID' }),
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 1
        }
      ]
    },
    {
      name: 'sync',
      description: localizeText({ fr: 'Synchroniser les rôles de rang PL', en: 'Synchronize PL rank roles' }),
      dm_permission: false
    },
    {
      name: 'addplayer',
      description: localizeText({ fr: 'Ajouter le rôle joueur PL', en: 'Add PL player role' }),
      dm_permission: false,
      options: [
        {
          name: 'player',
          description: localizeText({ fr: 'Joueur ciblé', en: 'Target player' }),
          type: ApplicationCommandOptionType.User,
          required: true
        }
      ]
    },
    {
      name: 'removeplayer',
      description: localizeText({ fr: 'Retirer le rôle joueur PL', en: 'Remove PL player role' }),
      dm_permission: false,
      options: [
        {
          name: 'player',
          description: localizeText({ fr: 'Joueur ciblé', en: 'Target player' }),
          type: ApplicationCommandOptionType.User,
          required: true
        }
      ]
    }
  ];
}

function findRoleIdByName(guildContext, roleName) {
  if (!guildContext?.roles?.cache || !roleName) {
    return null;
  }

  const targetName = roleName.toLowerCase();
  const role = guildContext.roles.cache.find((entry) => entry.name.toLowerCase() === targetName);
  return role?.id || null;
}

async function updateMatchMessage(clientRef, matchState, summary) {
  const channel = await clientRef.channels.fetch(matchState.channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    return;
  }

  const message = await channel.messages.fetch(matchState.messageId).catch(() => null);
  if (!message) {
    return;
  }

  await message.edit({
    embeds: [buildMatchEmbed(matchState, summary)],
    components: [buildResultButtons(true)]
  });
}

async function finalizeMatchOutcome(matchState, outcome, userId, clientRef, options = {}) {
  const summary = await applyMatchOutcome(matchState, outcome, userId);
  if (!summary) {
    return null;
  }

  if (typeof options.summaryText === 'string' && options.summaryText.trim()) {
    summary.text = options.summaryText;
  }

  matchState.resolved = true;
  activeMatches.delete(matchState.matchId);

  if (matchState.isPl) {
    await handlePLMatchResolved(matchState.messageId);
  }

  await updateMatchMessage(clientRef, matchState, summary);
  runInBackground('Match resource cleanup', () => cleanupMatchResources(matchState));
  return summary;
}

async function handleAdminSlashCommand(interaction) {
  if (!interaction.isChatInputCommand()) {
    return false;
  }

  const command = interaction.commandName;
  if (!['addelo', 'removeelo', 'addpoints', 'setws', 'setls', 'banpl', 'cancelmatch', 'sync', 'addplayer', 'removeplayer'].includes(command)) {
    return false;
  }

  const hasPermission = hasPLAdminAccess(interaction);
  if (!hasPermission) {
    await interaction.reply({
      content: localizeText({
        fr: "❌ Vous n'avez pas la permission d'utiliser cette commande.",
        en: "❌ You don't have permission to use this command."
      }),
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  if (command === 'cancelmatch') {
    const matchId = interaction.options.getInteger('match_id', true);
    const matchState = activeMatches.get(matchId);

    if (!matchState) {
      await interaction.reply({
        content: localizeText({ fr: 'Match introuvable.', en: 'Match not found.' }),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    if (!matchState.isPl) {
      await interaction.reply({
        content: localizeText({
          fr: 'Cette commande est réservée aux matchs PL.',
          en: 'This command is reserved for PL matches.'
        }),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    if (matchState.resolved) {
      await interaction.reply({
        content: localizeText({ fr: 'Ce match est déjà terminé.', en: 'This match is already completed.' }),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const summary = await finalizeMatchOutcome(matchState, 'cancel', interaction.user.id, interaction.client);
      if (!summary) {
        await interaction.editReply({
          content: localizeText({ fr: 'Le match est déjà annulé.', en: 'The match is already cancelled.' })
        });
        return true;
      }

      const guildContext = interaction.guild;
      const roleId = matchState.lobbyRoleId || findRoleIdByName(guildContext, UNKNOWN_PING_ROLE_NAME);
      const roleMention = roleId ? `<@&${roleId}>` : null;
      const notificationChannel = await interaction.client.channels.fetch(matchState.channelId).catch(() => null);

      if (notificationChannel?.isTextBased()) {
        await notificationChannel.send({
          content: [
            roleMention,
            localizeText({
              fr: `⚠️ Match PL #${matchState.matchId} annulé.`,
              en: `⚠️ PL match #${matchState.matchId} cancelled.`
            })
          ]
            .filter(Boolean)
            .join(' '),
          embeds: [buildMatchEmbed(matchState, summary)],
          allowedMentions: roleId ? { roles: [roleId] } : undefined
        });
      }

      await sendLogMessage(
        [`⚠️ Match #${matchState.matchId} annulé (commande admin).`, summary.text].join('\n')
      );

      await interaction.editReply({
        content: localizeText({ fr: 'Match PL annulé.', en: 'PL match cancelled.' })
      });
    } catch (err) {
      errorLog('Failed to cancel match:', err);
      await interaction.editReply({
        content: localizeText({
          fr: "Erreur lors de l'annulation du match.",
          en: 'Error while cancelling the match.'
        })
      });
    }

    return true;
  }

  if (command === 'sync') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const result = await syncAllRankRoles(interaction.guild);
      await interaction.editReply({
        content: localizeText(
          {
            fr: '✅ Synchronisation des rôles de rang terminée ({synced} joueurs synchronisés).',
            en: '✅ Rank role synchronization completed ({synced} players synced).'
          },
          { synced: result.synced }
        )
      });
    } catch (err) {
      errorLog('Failed to synchronize rank roles:', err);
      await interaction.editReply({
        content: localizeText({
          fr: '❌ Erreur pendant la synchronisation des rôles de rang.',
          en: '❌ Error while synchronizing rank roles.'
        })
      });
    }

    return true;
  }

  if (command === 'banpl') {
    const targetUser = interaction.options.getUser('player', true);
    const durationInput = interaction.options.getString('duration', true);
    const durationMs = parseDurationToMs(durationInput);

    if (!durationMs) {
      await interaction.reply({
        content: localizeText({
          fr: 'Durée invalide. Utilisez un format comme `30m`, `2h`, `1d`.',
          en: 'Invalid duration. Use a format like `30m`, `2h`, `1d`.'
        }),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    const until = Date.now() + durationMs;
    plJoinBanLocks.set(targetUser.id, until);

    await interaction.reply({
      content: localizeText(
        {
          fr: '🚫 <@{userId}> ne peut plus utiliser `!join` pendant {duration}.',
          en: '🚫 <@{userId}> can no longer use `!join` for {duration}.'
        },
        { userId: targetUser.id, duration: formatDurationMinutes(durationMs) }
      ),
      flags: MessageFlags.Ephemeral
    });

    return true;
  }

  if (command === 'addplayer' || command === 'removeplayer') {
    if (!interaction.guild) {
      await interaction.reply({
        content: localizeText({
          fr: 'Cette commande doit être utilisée dans le serveur.',
          en: 'This command must be used in the server.'
        }),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    const targetUser = interaction.options.getUser('player', true);
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      await interaction.reply({
        content: localizeText({ fr: 'Joueur introuvable sur le serveur.', en: 'Player not found in this server.' }),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    const shouldAdd = command === 'addplayer';
    const hasRole = member.roles.cache.has(PL_PLAYER_ROLE_ID);

    if (shouldAdd && hasRole) {
      await interaction.reply({
        content: localizeText({
          fr: 'Ce joueur possède déjà le rôle joueur PL.',
          en: 'This player already has the PL player role.'
        }),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    if (!shouldAdd && !hasRole) {
      await interaction.reply({
        content: localizeText({
          fr: 'Ce joueur ne possède pas le rôle joueur PL.',
          en: 'This player does not have the PL player role.'
        }),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    try {
      if (shouldAdd) {
        await member.roles.add(PL_PLAYER_ROLE_ID, 'Commande /addplayer');
      } else {
        await member.roles.remove(PL_PLAYER_ROLE_ID, 'Commande /removeplayer');
      }

      await interaction.reply({
        content: localizeText(
          shouldAdd
            ? {
                fr: '✅ Rôle joueur PL ajouté à <@{userId}>.',
                en: '✅ PL player role added to <@{userId}>.'
              }
            : {
                fr: '✅ Rôle joueur PL retiré à <@{userId}>.',
                en: '✅ PL player role removed from <@{userId}>.'
              },
          { userId: targetUser.id }
        ),
        flags: MessageFlags.Ephemeral
      });
    } catch (err) {
      errorLog(`Failed to ${shouldAdd ? 'add' : 'remove'} PL player role:`, err);
      await interaction.reply({
        content: localizeText({
          fr: `❌ Impossible de ${shouldAdd ? 'donner' : 'retirer'} le rôle joueur PL.`,
          en: `❌ Unable to ${shouldAdd ? 'grant' : 'remove'} the PL player role.`
        }),
        flags: MessageFlags.Ephemeral
      });
    }

    return true;
  }

  const targetUser = interaction.options.getUser('player', true);

  let displayName = targetUser.username;
  if (interaction.guild) {
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    displayName = member?.displayName || displayName;
  }

  let player;
  try {
    player = await getOrCreatePlayer(targetUser.id, displayName);
  } catch (err) {
    errorLog('Failed to fetch player for admin update:', err);
    await interaction.reply({
      content: localizeText({
        fr: 'Impossible de récupérer le profil du joueur.',
        en: 'Unable to retrieve the player profile.'
      }),
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  if (command === 'setws' || command === 'setls') {
    const value = interaction.options.getInteger('value', true);
    const payload =
      command === 'setws'
        ? { win_streak: value, lose_streak: 0 }
        : { win_streak: 0, lose_streak: value };

    try {
      const { error } = await supabase.from('players').update(payload).eq('id', player.id);
      if (error) {
        throw error;
      }

      performanceStores.playerStore.invalidatePlayer(targetUser.id);
    } catch (err) {
      errorLog('Failed to update streak:', err);
      await interaction.reply({
        content: localizeText({
          fr: 'Erreur lors de la mise à jour de la série.',
          en: 'Error while updating streak.'
        }),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    const isWin = command === 'setws';
    await interaction.reply({
      content: localizeText(
        {
          fr: isWin
            ? '✅ Winstreak de <@{userId}> définie à **{value}**.'
            : '✅ Losestreak de <@{userId}> définie à **{value}**.',
          en: isWin
            ? '✅ <@{userId}> win streak set to **{value}**.'
            : '✅ <@{userId}> lose streak set to **{value}**.'
        },
        { userId: targetUser.id, value }
      ),
      flags: MessageFlags.Ephemeral
    });

    return true;
  }

  const amount = interaction.options.getInteger('amount', true);
  if (command === 'addpoints') {
    const activeSeasonId = await getActiveSeasonId();
    if (!activeSeasonId) {
      await interaction.reply({
        content: localizeText({
          fr: 'Aucune saison active trouvée pour mettre à jour les points de tier.',
          en: 'No active season found to update tier points.'
        }),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    const { data: existingTierEntry, error: fetchTierError } = await supabase
      .from('lfn_player_tier_points')
      .select('points,tier')
      .eq('player_id', player.id)
      .eq('season_id', activeSeasonId)
      .maybeSingle();

    if (fetchTierError) {
      errorLog('Failed to fetch current tier points:', fetchTierError);
      await interaction.reply({
        content: localizeText({
          fr: 'Erreur lors de la récupération des points de tier.',
          en: 'Error while fetching tier points.'
        }),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    const currentPoints = Number(existingTierEntry?.points || 0);
    const nextPoints = currentPoints + amount;
    const currentTier = existingTierEntry?.tier || 'Tier E';

    const { error: updateTierError } = await supabase.from('lfn_player_tier_points').upsert(
      {
        player_id: player.id,
        season_id: activeSeasonId,
        points: nextPoints,
        tier: currentTier,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'player_id,season_id' }
    );

    if (updateTierError) {
      errorLog('Failed to update tier points:', updateTierError);
      await interaction.reply({
        content: localizeText({
          fr: 'Erreur lors de la mise à jour des points de tier.',
          en: 'Error while updating tier points.'
        }),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    performanceStores.playerStore.invalidateRankingSnapshot();
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(localizeText({ fr: 'Points de tier ajoutés', en: 'Tier points added' }))
          .setDescription(`<@${targetUser.id}>`)
          .addFields(
            {
              name: localizeText({ fr: 'Anciens points', en: 'Previous points' }),
              value: `${Math.round(currentPoints)}`,
              inline: true
            },
            {
              name: localizeText({ fr: 'Nouveaux points', en: 'New points' }),
              value: `${Math.round(nextPoints)}`,
              inline: true
            },
            {
              name: localizeText({ fr: 'Delta', en: 'Delta' }),
              value: `+${amount}`,
              inline: true
            }
          )
          .setColor(0x2ecc71)
          .setTimestamp(new Date())
      ],
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  const delta = command === 'addelo' ? amount : -amount;
  const currentElo = normalizeRating(player.solo_elo);
  const nextElo = Math.max(0, currentElo + delta);

  try {
    const { error } = await supabase
      .from('players')
      .update({ solo_elo: nextElo })
      .eq('id', player.id);

    if (error) {
      throw error;
    }

    performanceStores.playerStore.invalidatePlayer(targetUser.id);
  } catch (err) {
    errorLog('Failed to update player elo:', err);
    await interaction.reply({
      content: localizeText({
        fr: "Erreur lors de la mise à jour de l'Elo.",
        en: 'Error while updating Elo.'
      }),
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  const embed = new EmbedBuilder()
    .setTitle(
      command === 'addelo'
        ? localizeText({ fr: 'Elo ajouté', en: 'Elo added' })
        : localizeText({ fr: 'Elo retiré', en: 'Elo removed' })
    )
    .setDescription(`<@${targetUser.id}>`)
    .addFields(
      { name: localizeText({ fr: 'Ancien Elo', en: 'Previous Elo' }), value: `${Math.round(currentElo)}`, inline: true },
      { name: localizeText({ fr: 'Nouveau Elo', en: 'New Elo' }), value: `${Math.round(nextElo)}`, inline: true },
      { name: localizeText({ fr: 'Delta', en: 'Delta' }), value: `${delta}`, inline: true }
    )
    .setColor(command === 'addelo' ? 0x2ecc71 : 0xe74c3c)
    .setTimestamp(new Date());

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  return true;
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

function isMissingShieldColumnError(message) {
  if (typeof message !== 'string') {
    return false;
  }

  return (
    message.includes("Could not find the 'shield_active' column") ||
    message.includes("Could not find the 'shield_threshold' column")
  );
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

function getEloRankByRating(rating) {
  const normalized = normalizeRating(rating);

  for (let index = 0; index < ELO_RANKS.length; index += 1) {
    const rank = ELO_RANKS[index];
    if (normalized >= rank.min) {
      return { ...rank, index };
    }
  }

  const fallback = ELO_RANKS[ELO_RANKS.length - 1];
  return { ...fallback, index: ELO_RANKS.length - 1 };
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

  const normalizedTier = String(tier).toUpperCase().replace(/^TIER\s+/, '');
  return TIER_EMOJIS[normalizedTier] || tier;
}

function formatEloRankLabel(rankInfo) {
  if (!rankInfo) {
    return null;
  }

  const name = rankInfo.name || '';
  const numeral = rankInfo.numeral;
  const emoji = rankInfo.emoji || '';

  if (!numeral) {
    return `${emoji} ${name}`.trim();
  }

  return `${emoji} ${name} **${numeral}**`.trim();
}

function formatEloRankEmoji(rankInfo) {
  if (!rankInfo) {
    return null;
  }

  return rankInfo.emoji || null;
}

function getNextEloRank(rankInfo) {
  if (!rankInfo || typeof rankInfo.index !== 'number') {
    return null;
  }

  if (rankInfo.index <= 0) {
    return null;
  }

  const nextRank = ELO_RANKS[rankInfo.index - 1];
  return nextRank ? { ...nextRank, index: rankInfo.index - 1 } : null;
}


function getEloMajorRankLevel(rating) {
  const rankInfo = getEloRankByRating(rating);
  return ELO_MAJOR_RANK_ORDER[rankInfo.name] ?? 0;
}

function getRankRoleKeyByRating(rating) {
  const normalized = normalizeRating(rating);

  if (normalized >= 2700) return 'verdoyant';
  if (normalized >= 2100) return 'grandmaster';
  if (normalized >= 1750) return 'master';
  if (normalized >= 1525) return 'legendaire';
  if (normalized >= 1350) return 'mythique';
  if (normalized >= 1220) return 'diamant';
  if (normalized >= 1120) return 'or';
  if (normalized >= 1050) return 'argent';
  if (normalized >= 1000) return 'bronze';
  return 'wished';
}

function getQueueLockRemainingMs(userId) {
  const until = dodgeQueueLocks.get(userId);
  if (!until) {
    return 0;
  }

  const remaining = until - Date.now();
  if (remaining <= 0) {
    dodgeQueueLocks.delete(userId);
    return 0;
  }

  return remaining;
}

function getPLBanRemainingMs(userId) {
  const until = plJoinBanLocks.get(userId);
  if (!until) {
    return 0;
  }

  const remaining = until - Date.now();
  if (remaining <= 0) {
    plJoinBanLocks.delete(userId);
    return 0;
  }

  return remaining;
}

function parseDurationToMs(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(/^(\d+)\s*(m|min|h|d|j)?$/i);
  if (!match) {
    return null;
  }

  const amount = Number.parseInt(match[1], 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const unit = (match[2] || 'm').toLowerCase();
  if (unit === 'h') {
    return amount * 60 * 60 * 1000;
  }
  if (unit === 'd' || unit === 'j') {
    return amount * 24 * 60 * 60 * 1000;
  }

  return amount * 60 * 1000;
}

function hasPLAdminAccess(interaction) {
  if (interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
    return true;
  }

  const roleCache = interaction.member?.roles?.cache;
  if (!roleCache) {
    return false;
  }

  return roleCache.has(PL_ADMIN_ROLE_ID) || roleCache.has(SECONDARY_PL_ADMIN_ROLE_ID);
}

function formatDurationMinutes(ms) {
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  return `${minutes} min`;
}

function formatDiscordTimestamp(dateInput, style = 'R') {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const ms = date.getTime();
  if (!Number.isFinite(ms)) {
    return null;
  }

  return `<t:${Math.floor(ms / 1000)}:${style}>`;
}

async function syncMemberRankRole(guildContext, discordId, rating) {
  if (!guildContext?.members || !discordId) {
    return;
  }

  const roleIds = Object.values(ELO_RANK_ROLE_IDS).filter(Boolean);
  if (!roleIds.length) {
    return;
  }

  const member = await performanceStores.memberStore.fetchMember(guildContext, discordId);
  if (!member?.roles?.cache) {
    return;
  }

  const targetRoleId = ELO_RANK_ROLE_IDS[getRankRoleKeyByRating(rating)];
  const rolesToRemove = roleIds.filter((roleId) => roleId !== targetRoleId && member.roles.cache.has(roleId));

  if (rolesToRemove.length) {
    await member.roles.remove(rolesToRemove, 'LFN rank role sync after match validation').catch(() => null);
  }

  if (targetRoleId && !member.roles.cache.has(targetRoleId)) {
    await member.roles.add(targetRoleId, 'LFN rank role sync after match validation').catch(() => null);
  }
}

function getPendingMatchForUser(userId) {
  for (const matchState of activeMatches.values()) {
    if (!matchState.resolved && matchState.participants?.has(userId)) {
      return matchState;
    }
  }

  for (const record of runtimeActiveMatchesCache.values()) {
    if (record?.status !== 'pending') {
      continue;
    }

    const players = Array.isArray(record.players)
      ? record.players
      : Array.isArray(record?.players?.ids)
        ? record.players.ids
        : [];
    if (players.includes(userId)) {
      return record;
    }
  }

  return null;
}

async function syncAllRankRoles(guildContext) {
  if (!guildContext) {
    return { synced: 0 };
  }

  const snapshot = await performanceStores.playerStore.getRankingSnapshot({ includeInactive: false, forceRefresh: true });

  let synced = 0;
  for (const player of snapshot.rankedPlayers) {
    if (!player?.discord_id) {
      continue;
    }

    await syncMemberRankRole(guildContext, player.discord_id, player.weightedScore);
    synced += 1;
  }

  return { synced };
}


async function getSiteRankingInfo(targetDiscordId) {
  try {
    const targetIdText = targetDiscordId?.toString();

    const snapshot = await performanceStores.playerStore.getRankingSnapshot({ includeInactive: false });
    const totalPlayers = snapshot.totalPlayers;
    const playerIndex = snapshot.rankedPlayers.findIndex((entry) => entry.discord_id?.toString() === targetIdText);
    const rank = playerIndex === -1 ? null : playerIndex + 1;

    return { rank, totalPlayers };
  } catch (err) {
    warn('Unable to compute site ranking info:', err.message);
    return { rank: null, totalPlayers: null };
  }
}

async function getSiteRankingMap() {
  const snapshot = await performanceStores.playerStore.getRankingSnapshot({ includeInactive: false });
  return {
    rankingByDiscordId: snapshot.rankingByDiscordId,
    totalPlayers: snapshot.totalPlayers
  };
}

function toCountryFlag(countryCode) {
  const normalized = String(countryCode || 'FR').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return '🏳️';
  }
  return String.fromCodePoint(...Array.from(normalized).map((char) => 127397 + char.charCodeAt(0)));
}

async function fetchSiteTierLeaderboard() {
  const response = await fetch(`${SITE_BASE_URL}/api/site/player-standings`, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Site standings request failed (${response.status})`);
  }
  const payload = await response.json();
  const players = Array.isArray(payload?.players) ? payload.players : [];
  return players.filter((player) => Number(player?.points || 0) > 0);
}

async function fetchSiteTierPlayerByDiscordId(discordId) {
  if (!discordId) {
    return null;
  }

  const players = await fetchSiteTierLeaderboard();
  return players.find((player) => String(player?.discordId || '') === String(discordId)) || null;
}

async function fetchPLLeaderboard(limit = 50) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
  const { data, error } = await supabase
    .from('players')
    .select('name,discord_id,solo_elo,active')
    .eq('active', true)
    .not('discord_id', 'is', null)
    .order('solo_elo', { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(error.message || 'Unable to load PL leaderboard.');
  }

  return Array.isArray(data) ? data : [];
}

async function getActiveSeasonId() {
  const { data, error } = await supabase
    .from('lfn_seasons')
    .select('id')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    errorLog('Failed to resolve active season:', error);
    return null;
  }

  return data?.id || null;
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
  return 80;
}

function getVolatilityMultiplierForRating(rating) {
  const normalizedRating = normalizeRating(rating);
  const entry = VOLATILITY_MULTIPLIERS.find((candidate) => normalizedRating >= candidate.min);
  return entry ? entry.multiplier : 1;
}

function getStreakKBonus(player) {
  const winStreak = Number.isFinite(player?.winStreak) ? player.winStreak : 0;
  const loseStreak = Number.isFinite(player?.loseStreak) ? player.loseStreak : 0;
  return Math.min(MAX_STREAK_K_BONUS, Math.max(0, winStreak, loseStreak));
}

function getUpsetMultiplier(playerRating, opponentAvg) {
  const diff = Math.abs(normalizeRating(playerRating) - normalizeRating(opponentAvg));

  if (diff >= 500) {
    return 1.6;
  }
  if (diff >= 350) {
    return 1.4;
  }
  if (diff >= 200) {
    return 1.2;
  }
  return 1.0;
}

function getPersonalizedKFactor(player, baseKFactor, rating, opponentAvg) {
  const streakBonus = getStreakKBonus(player);
  const upsetMultiplier = getUpsetMultiplier(rating, opponentAvg);
  const k = (baseKFactor + streakBonus) * upsetMultiplier;
  return Math.round(k);
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

function describeStreak(winStreak, loseStreak, { short = false } = {}) {
  const wins = Number.isFinite(winStreak) ? winStreak : 0;
  const losses = Number.isFinite(loseStreak) ? loseStreak : 0;

  if (wins > 0) {
    const label = localizeText({ fr: '🔥 **{count}**', en: '🔥 **{count}**' }, { count: wins });
    return { label, type: 'win', short };
  }

  if (losses > 0) {
    const label = localizeText({ fr: '💀 **{count}**', en: '💀 **{count}**' }, { count: losses });
    return { label, type: 'lose', short };
  }

  const neutralLabel = localizeText({ fr: '➖ **0**', en: '➖ **0**' });
  return { label: neutralLabel, type: 'neutral', short };
}

function formatPlayerList(team) {
  if (!team.length) {
    return '—';
  }

  return team
    .map(
      (player, index) => {
        const rankEmoji = formatEloRankEmoji(getEloRankByRating(player.soloElo));
        return `${index + 1}. <@${player.discordId}>${rankEmoji ? ` ${rankEmoji}` : ''}`;
      }
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
  performanceStores.playerStore.invalidatePlayer(targetPlayer.discordId);
  const lockUntil = Date.now() + DODGE_QUEUE_LOCK_MS;
  dodgeQueueLocks.set(targetPlayer.discordId, lockUntil);

  await sendLogMessage(
    localizeText(
      {
        fr: '🚫 {name} perd {penalty} Elo ({count} votes dodge) et ne peut plus jouer pendant 1h.',
        en: '🚫 {name} loses {penalty} Elo ({count} dodge votes) and cannot play for 1 hour.'
      },
      {
        name: targetPlayer.displayName || `<@${targetPlayer.discordId}>`,
        penalty: DODGE_ELO_PENALTY,
        count: DODGE_VOTES_REQUIRED
      }
    )
  );

  return { success: true, newRating, lockUntil };
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
      .map((choice, index) => `${index + 1}. ${choice.emoji} ${choice.mode} — **${choice.map}**`)
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
  const { matchId, primaryMap, mapChoices = [], teams, createdAt, votes, timeoutAt } = state;
  const votesRequired = getVotesRequired(state);
  const mapTitle = primaryMap
    ? `${primaryMap.emoji} ${primaryMap.mode} — ${primaryMap.map}`
    : localizeText({ fr: 'Match en attente', en: 'Match pending' });
  const title = matchId
    ? localizeText({ fr: 'Match #{matchId} — {mapTitle}', en: 'Match #{matchId} — {mapTitle}' }, { matchId, mapTitle })
    : mapTitle;

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
      .map((choice, index) => `${index + 1}. ${choice.emoji} ${choice.mode} — **${choice.map}**`)
      .join('\n');
    embed.addFields({
      name: localizeText({ fr: 'Maps proposées', en: 'Suggested maps' }),
      value: mapLines
    });
  }

  if (timeoutAt) {
    const cancelRelativeTime = formatDiscordTimestamp(timeoutAt, 'R');
    const cancelAbsoluteTime = formatDiscordTimestamp(timeoutAt, 'F');
    if (cancelRelativeTime) {
      embed.addFields({
        name: localizeText({ fr: 'Annulation automatique', en: 'Automatic cancellation' }),
        value: localizeText(
          {
            fr: 'Le match sera annulé {relative} ({absolute}) sans résultat.',
            en: 'The match will be cancelled {relative} ({absolute}) if no result is submitted.'
          },
          {
            relative: cancelRelativeTime,
            absolute: cancelAbsoluteTime || cancelRelativeTime
          }
        )
      });
    }
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

async function sendRankUpNotification(player, oldRating, newRating) {
  const oldRank = getEloRankByRating(oldRating);
  const newRank = getEloRankByRating(newRating);
  if (!oldRank || !newRank || newRank.index >= oldRank.index) {
    return;
  }

  if (!client) {
    return;
  }

  const channel = await client.channels.fetch(RANK_UP_CHANNEL_ID).catch(() => null);
  if (!channel?.isTextBased()) {
    return;
  }

  const playerLabel = player?.discordId ? `<@${player.discordId}>` : player?.displayName || 'Joueur';
  const oldLabel = formatEloRankLabel(oldRank);
  const newLabel = formatEloRankLabel(newRank);

  await channel.send({
    content: localizeText(
      {
        fr: '🎉 {player} monte de rang : {old} → {new}',
        en: '🎉 {player} ranked up: {old} → {new}'
      },
      { player: playerLabel, old: oldLabel, new: newLabel }
    )
  });
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

async function fetchPlayerByDiscordId(discordId, options = {}) {
  return performanceStores.playerStore.getPlayerByDiscordId(discordId, options);
}


async function getLowestEloPlayer() {
  const snapshot = await performanceStores.playerStore.getRankingSnapshot({ includeInactive: false });
  if (!snapshot.rankedPlayers.length) {
    return null;
  }

  const lowest = snapshot.rankedPlayers[snapshot.rankedPlayers.length - 1];
  if (!lowest?.discord_id) {
    return null;
  }

  return fetchPlayerByDiscordId(lowest.discord_id);
}

async function ensureWorstPlayerRole(guildContext) {
  if (!guildContext?.roles) {
    return null;
  }

  const roleByName = guildContext.roles.cache.find((entry) => entry.name === WORST_PLAYER_ROLE_NAME);
  if (roleByName) {
    return roleByName;
  }

  try {
    return await guildContext.roles.create({
      name: WORST_PLAYER_ROLE_NAME,
      mentionable: true,
      reason: 'Automatic role for lowest Elo player'
    });
  } catch (err) {
    warn('Unable to create worst player role:', err?.message || err);
    return null;
  }
}

async function syncWorstPlayerRole(guildContext) {
  if (!guildContext?.members || !guildContext.roles) {
    return;
  }

  const role = await ensureWorstPlayerRole(guildContext);
  if (!role) {
    return;
  }

  let lowestPlayer;
  try {
    lowestPlayer = await getLowestEloPlayer();
  } catch (err) {
    warn('Unable to sync worst player role:', err?.message || err);
    return;
  }

  if (!lowestPlayer?.discord_id) {
    return;
  }

  const lowestDiscordId = String(lowestPlayer.discord_id);
  const membersWithRole = await guildContext.members.fetch({ withPresences: false }).catch(() => null);
  if (membersWithRole) {
    for (const member of membersWithRole.values()) {
      if (member.roles.cache.has(role.id) && member.id !== lowestDiscordId) {
        await member.roles.remove(role, 'Role reassigned to current lowest Elo player').catch(() => null);
      }
    }
  }

  const targetMember = await performanceStores.memberStore.fetchMember(guildContext, lowestDiscordId);
  if (!targetMember) {
    return;
  }

  if (!targetMember.roles.cache.has(role.id)) {
    await targetMember.roles.add(role, 'Assigned to current lowest Elo player').catch(() => null);
  }
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
      } else {
        performanceStores.playerStore.cachePlayer({
          ...existing,
          name: displayName,
          mmr,
          solo_elo: soloElo
        });
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

  performanceStores.playerStore.cachePlayer(inserted);
  log(`Created new player entry for ${discordId}.`);
  return inserted;
}

function buildQueueEntry(member, playerRecord) {
  const wins = typeof playerRecord.wins === 'number' ? playerRecord.wins : 0;
  const losses = typeof playerRecord.losses === 'number' ? playerRecord.losses : 0;
  const games = typeof playerRecord.games_played === 'number' ? playerRecord.games_played : wins + losses;
  const winStreak = typeof playerRecord.win_streak === 'number' ? playerRecord.win_streak : 0;
  const loseStreak = typeof playerRecord.lose_streak === 'number' ? playerRecord.lose_streak : 0;
  const shieldActive = Boolean(playerRecord.shield_active);
  const shieldThreshold = typeof playerRecord.shield_threshold === 'number' ? playerRecord.shield_threshold : 0;

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
    shieldActive,
    shieldThreshold,
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

function computeQueueMajorRankRange(entries) {
  if (!entries?.length) {
    return { min: null, max: null, diff: 0 };
  }

  let min = Infinity;
  let max = -Infinity;

  for (const entry of entries) {
    const level = getEloMajorRankLevel(entry?.soloElo);
    if (level < min) {
      min = level;
    }
    if (level > max) {
      max = level;
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
    const queueConfig = QUEUE_CONFIGS[index];
    const limitDescription = queueConfig.maxEloDifference
      ? localizeText(
          {
            fr: ` (écart max ${queueConfig.maxEloDifference})`,
            en: ` (max diff ${queueConfig.maxEloDifference})`
          }
        )
      : localizeText({ fr: ' (sans limite de rang)', en: ' (no Elo limit)' });

    if (!queue.length) {
      return localizeText(
        { fr: 'File {id}{note} vide.', en: 'Queue {id}{note} is empty.' },
        { id: index + 1, note: limitDescription }
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
        {
          fr: 'File {id}{note} ({count}/{size}) :',
          en: 'Queue {id}{note} ({count}/{size}):'
        },
        { id: index + 1, note: limitDescription, count: queue.length, size: MATCH_SIZE }
      ),
      ...lines
    ].join('\n');
  });

  return sections.join('\n\n');
}

function buildQueueStatusEmbed() {
  return new EmbedBuilder()
    .setTitle('Matchmaking – File en direct')
    .setDescription(formatQueueStatus())
    .setColor(0x0b132b)
    .setTimestamp(new Date());
}

async function sendOrUpdateQueueStatusMessage(guildContext, channel) {
  if (!guildContext) {
    return null;
  }

  let targetChannel = channel?.isTextBased() ? channel : null;
  const storedMessage = queueStatusMessages.get(guildContext.id);

  if ((!targetChannel || (storedMessage && storedMessage.channelId !== targetChannel.id)) && storedMessage?.channelId) {
    const resolvedChannel =
      guildContext.channels?.cache?.get(storedMessage.channelId) ||
      (await guildContext.channels.fetch(storedMessage.channelId).catch(() => null));

    if (resolvedChannel?.isTextBased()) {
      targetChannel = resolvedChannel;
    }
  }

  if (!targetChannel?.isTextBased()) {
    return null;
  }

  const embed = buildQueueStatusEmbed();
  let queueMessage = null;

  if (storedMessage?.messageId) {
    try {
      queueMessage = await targetChannel.messages.fetch(storedMessage.messageId);
      await queueMessage.edit({ embeds: [embed] });
    } catch (err) {
      warn('Unable to update matchmaking queue embed:', err?.message || err);
      queueMessage = null;
    }
  }

  if (!queueMessage) {
    queueMessage = await targetChannel.send({ embeds: [embed] });
    queueStatusMessages.set(guildContext.id, { channelId: targetChannel.id, messageId: queueMessage.id });
  }

  return queueMessage;
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

async function handlePLJoinCommand(message) {
  if (!message.guild || message.guild.id !== DISCORD_GUILD_ID) {
    return;
  }

  const requestedQueue = message.content.trim().split(/\s+/)[1] === '2' ? 2 : 1;
  const joinResult = await addPlayerToPLQueue(message.author.id, message.guild, { queueIndex: requestedQueue });
  if (joinResult.added) {
    await processPLQueue();
  }

  const replyContent = buildPLJoinReplyContent(joinResult);

  try {
    if (joinResult.blockedByRankGap) {
      await message.author.send({ embeds: [buildRankGapErrorEmbed()] });
    } else {
      await message.author.send(replyContent);
    }
  } catch (err) {
    warn('Unable to send PL join DM:', err?.message || err);
  }

  if (message.deletable) {
    await message.delete().catch(() => null);
  }
}

async function handlePLLeaveCommand(message) {
  if (!message.guild || message.guild.id !== DISCORD_GUILD_ID) {
    return;
  }

  const leaveResult = await removePlayerFromPLQueue(message.author.id, message.guild);
  const replyContent = leaveResult.removed
    ? leaveResult.queueIndex === 2
      ? 'Tu as quitté la file 2. (You left queue 2.)'
      : 'Tu as quitté la file PL. (You left the PL queue.)'
    : "Tu n'es pas dans la file PL. (You are not in the PL queue.)";

  try {
    await message.author.send(replyContent);
  } catch (err) {
    warn('Unable to send PL leave DM:', err?.message || err);
  }

  if (message.deletable) {
    await message.delete().catch(() => null);
  }
}

async function handleSimpleLobbyJoin(message) {
  if (!message.guild) {
    return;
  }

  if (!isSimpleLobbyEnabled()) {
    return;
  }

  const queue = getSimpleLobbyQueue(message.guild.id);
  const memberId = message.author.id;
  const lockRemainingMs = getQueueLockRemainingMs(memberId);

  if (lockRemainingMs > 0) {
    await message.reply({
      content: `🚫 Tu as 4 votes dodge: -30 Elo et verrouillage 1h. Réessaie dans ${formatDurationMinutes(lockRemainingMs)}.`,
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  if (queue.includes(memberId)) {
    await message.reply({
      content: `✅ <@${memberId}> est déjà dans le lobby (${queue.length}/${SIMPLE_LOBBY_SIZE}).`,
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  if (queue.length >= SIMPLE_LOBBY_SIZE) {
    queue.length = 0;
  }

  queue.push(memberId);

  if (queue.length < SIMPLE_LOBBY_SIZE) {
    await message.reply({
      content: `✅ <@${memberId}> a rejoint le lobby (${queue.length}/${SIMPLE_LOBBY_SIZE}).`,
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  const teamSize = getSimpleLobbyTeamSize();
  const shuffled = shufflePlayers(queue);
  const teamOne = shuffled.slice(0, teamSize);
  const teamTwo = shuffled.slice(teamSize, teamSize * 2);

  queue.length = 0;

  await message.channel.send({
    content: [
      '🎮 Lobby prêt !',
      `Équipe 1 (${teamOne.length}) : ${teamOne.map((id) => `<@${id}>`).join(' ')}`,
      `Équipe 2 (${teamTwo.length}) : ${teamTwo.map((id) => `<@${id}>`).join(' ')}`
    ].join('\n')
  });
}

async function handleSimpleLobbyLeave(message) {
  if (!message.guild) {
    return;
  }

  if (!isSimpleLobbyEnabled()) {
    return;
  }

  const queue = getSimpleLobbyQueue(message.guild.id);
  const memberId = message.author.id;
  const index = queue.indexOf(memberId);

  if (index === -1) {
    await message.reply({
      content: "❌ Tu n'es pas dans le lobby.",
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  queue.splice(index, 1);
  await message.reply({
    content: `🚪 <@${memberId}> a quitté le lobby (${queue.length}/${SIMPLE_LOBBY_SIZE}).`,
    allowedMentions: { repliedUser: false }
  });
}

async function handleJoinCommand(message, args) {
  if (message.guild?.id === DISCORD_GUILD_ID) {
    if (shouldUseSimpleLobby(message)) {
      await handleSimpleLobbyJoin(message);
      return;
    }

    await ensureRuntimePlQueueLoaded(message.guild.id);

    if (!plQueueChannel) {
      plQueueChannel = await ensurePLQueueChannel(message.guild);
    }

    if (plQueueChannel || message.channelId === PL_QUEUE_CHANNEL_ID) {
      const requestedQueue = args[0] === '2' ? 2 : 1;
      const joinResult = await addPlayerToPLQueue(message.author.id, message.guild, { queueIndex: requestedQueue });
      if (joinResult.added) {
        await processPLQueue();
      }

      const replyContent = buildPLJoinReplyContent(joinResult);
      if (joinResult.blockedByRankGap) {
        await message.reply({ embeds: [buildRankGapErrorEmbed()] });
      } else if (joinResult.added) {
        await addWhiteCheckmarkReaction(message);
      } else {
        await message.reply({ content: replyContent });
      }
      return;
    }
  }

  const mentionedUser = message.mentions.users.first();

  if (mentionedUser) {
    await message.reply({
      content:
        'Les rooms custom sont temporairement désactivées pour simplifier le système compétitif. / Custom rooms are temporarily disabled to simplify the competitive system.',
      allowedMentions: { repliedUser: false }
    });
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

  if (requestedQueueIndex != null && (Number.isNaN(requestedQueueIndex) || requestedQueueIndex !== 0)) {
    await message.reply({
      content: localizeText({
        fr: 'Il n\'y a qu\'une seule file de matchmaking.',
        en: 'There is only one matchmaking queue.'
      })
    });
    return;
  }

  const entryElo = normalizeRating(entry.soloElo);
  let targetQueueIndex = requestedQueueIndex;

  if (targetQueueIndex == null) {
    let bestIndex = null;
    let bestDiff = Infinity;

    matchQueues.forEach((queue, index) => {
      const queueConfig = QUEUE_CONFIGS[index];
      const average = computeQueueAverageElo(queue);
      const diff = average == null ? Infinity : Math.abs(average - entryElo);
      const eloRange = computeQueueEloRange([...queue, entry]);
      const exceedsLimit =
        queueConfig.maxEloDifference != null && eloRange.diff >= queueConfig.maxEloDifference;

      if (exceedsLimit) {
        return;
      }

      if (
        diff < bestDiff ||
        (diff === bestDiff && (bestIndex == null || queue.length < matchQueues[bestIndex].length))
      ) {
        bestIndex = index;
        bestDiff = diff;
      }
    });

    if (bestIndex == null) {
      const unlimitedIndex = QUEUE_CONFIGS.findIndex((config) => config.maxEloDifference == null);
      targetQueueIndex = unlimitedIndex !== -1 ? unlimitedIndex : 0;
    } else {
      targetQueueIndex = bestIndex;
    }
  }

  const targetQueue = matchQueues[targetQueueIndex];
  const targetQueueConfig = QUEUE_CONFIGS[targetQueueIndex];
  const eloRange = computeQueueEloRange([...targetQueue, entry]);
  const rankRange = computeQueueMajorRankRange([...targetQueue, entry]);

  if (targetQueueConfig.maxEloDifference != null && eloRange.diff >= targetQueueConfig.maxEloDifference) {
    await message.reply({
      content: localizeText(
        {
          fr: `❌ L'écart Elo dépasse la limite de la file ${targetQueueIndex + 1} (max ${
            targetQueueConfig.maxEloDifference
          }).`,
          en: `❌ Elo gap exceeds queue ${targetQueueIndex + 1}'s limit (max ${
            targetQueueConfig.maxEloDifference
          }).`
        }
      )
    });
    return;
  }

  if (rankRange.diff > MAX_MATCHMAKING_MAJOR_RANK_GAP) {
    await message.reply({ embeds: [buildRankGapErrorEmbed()] });
    return;
  }

  targetQueue.push(entry);
  queueEntries.set(member.id, { entry, queueIndex: targetQueueIndex });

  const queueSize = targetQueue.length;
  await message.reply({
    content: localizeText(
      {
        fr: '✅ Tu as rejoint la file {queue}. ({count}/{size} joueurs en attente)',
        en: '✅ You joined queue {queue}. ({count}/{size} players waiting)'
      },
      { queue: targetQueueIndex + 1, count: queueSize, size: MATCH_SIZE }
    )
  });

  await sendOrUpdateQueueStatusMessage(message.guild, message.channel);

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

    await sendOrUpdateQueueStatusMessage(message.guild, message.channel);
  }
}

async function handleLeaveCommand(message) {
  const memberId = message.author.id;

  if (message.guild?.id === DISCORD_GUILD_ID) {
    if (shouldUseSimpleLobby(message)) {
      await handleSimpleLobbyLeave(message);
      return;
    }

    if (message.channelId === PL_QUEUE_CHANNEL_ID) {
      await handlePLLeaveCommand(message);
      return;
    }

    await ensureRuntimePlQueueLoaded(message.guild.id);

    if (isInPLQueue(message.guild.id, memberId)) {
      await ensurePLQueueChannel(message.guild);
      const leaveResult = await removePlayerFromPLQueue(memberId, message.guild);

      const replyContent = leaveResult.removed
        ? leaveResult.queueIndex === 2
          ? 'Tu as quitté la file 2. (You left queue 2.)'
          : 'Tu as quitté la file PL. (You left the PL queue.)'
        : "Tu n'es pas dans la file PL. (You are not in the PL queue.)";

      if (leaveResult.removed) {
        await addWhiteCheckmarkReaction(message);
      } else {
        await message.reply({ content: replyContent });
      }
      return;
    }
  }

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

  await sendOrUpdateQueueStatusMessage(message.guild, message.channel);
}

async function handleQueueCommand(message) {
  if (!message.guild || message.guild.id !== DISCORD_GUILD_ID) {
    return;
  }

  await ensureRuntimePlQueueLoaded(message.guild.id);
  const primaryQueue = getPLQueueByIndex(message.guild.id, 1);
  const secondaryQueue = getPLQueueByIndex(message.guild.id, 2);
  await sendOrUpdateQueueMessage(message.guild, plQueueChannel);

  const primaryDetails = await formatPLQueueDetails(primaryQueue);
  const secondaryDetails = await formatPLQueueDetails(secondaryQueue);
  const descriptionFr = [
    `🔁 File 1 (principale) : **${primaryQueue.length}/${MATCH_SIZE}** joueurs`,
    primaryDetails.fr,
    '',
    `⚡ File 2 (fallback) : **${secondaryQueue.length}/${MATCH_SIZE}** joueurs`,
    secondaryDetails.fr,
    '',
    'ℹ️ `!join 2` pour rejoindre la file fallback.'
  ].join('\n');
  const embed = new EmbedBuilder()
    .setTitle('Power League')
    .setDescription(descriptionFr)
    .setColor(0x3498db)
    .setTimestamp(new Date());

  await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
}

async function handleCleanQueueCommand(message) {
  if (!message.guild || message.guild.id !== DISCORD_GUILD_ID) {
    return;
  }

  const hasPermission = message.member?.permissions?.has(PermissionsBitField.Flags.ManageGuild);
  if (!hasPermission) {
    await message.reply({
      content: localizeText({
        fr: '❌ Vous devez avoir la permission Gérer le serveur pour vider la file.',
        en: '❌ You need the Manage Server permission to clear the queue.'
      }),
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  if (!message.guild) {
    await message.reply({
      content: localizeText({
        fr: 'Impossible de récupérer les informations du serveur.',
        en: 'Unable to retrieve server information.'
      }),
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  const cleared = await clearRuntimePlQueue(message.guild.id);
  await sendOrUpdateQueueMessage(message.guild, plQueueChannel);

  await message.reply({
    content: cleared
      ? localizeText({ fr: '✅ File vidée.', en: '✅ Queue cleared.' })
      : localizeText({ fr: '❌ Impossible de vider la file pour le moment.', en: '❌ Unable to clear the queue.' }),
    allowedMentions: { repliedUser: false }
  });
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
  const { rank: siteRank, totalPlayers } = siteRanking;
  const wishedRankLabel =
    formatEloRankLabel(getEloRankByRating(soloElo)) ||
    localizeText({ fr: 'Non classé', en: 'Unranked' });
  const classementLabel = siteRank
    ? `#**${siteRank}**${totalPlayers ? `/${totalPlayers}` : ''}`
    : localizeText({ fr: 'Non classé', en: 'Unranked' });

  const embed = new EmbedBuilder()
    .setTitle(
      localizeText({
        fr: 'Profil Elo — {name}',
        en: 'Elo profile — {name}'
      }, { name: player.name || localizeText({ fr: `Joueur ${targetId}`, en: `Player ${targetId}` }) })
    )
    .addFields(
      { name: 'Elo', value: `${Math.round(soloElo)}`, inline: true },
      {
        name: localizeText({ fr: 'Rang', en: 'Rank' }),
        value: wishedRankLabel,
        inline: true
      },
      {
        name: localizeText({ fr: 'Série en cours', en: 'Current streak' }),
        value: streakInfo.label,
        inline: true
      },
      {
        name: localizeText({ fr: 'Classement', en: 'Ranking' }),
        value: classementLabel,
        inline: true
      }
    )
    .setColor(0x5865f2)
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .setTimestamp(new Date());

  await message.reply({ embeds: [embed] });
}


async function handleLastCommand(message) {
  await syncWorstPlayerRole(message.guild).catch(() => null);

  let player;
  try {
    player = await getLowestEloPlayer();
  } catch (err) {
    errorLog('Failed to fetch lowest Elo player:', err);
    await message.reply({
      content: localizeText({
        fr: 'Erreur lors de la récupération du dernier joueur.',
        en: 'Error while fetching lowest Elo player.'
      }),
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  if (!player?.discord_id) {
    await message.reply({
      content: localizeText({
        fr: 'Aucun joueur actif trouvé.',
        en: 'No active player found.'
      }),
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  const elo = Math.round(normalizeRating(player.solo_elo));
  await message.reply({
    content: localizeText(
      {
        fr: '📉 Dernier joueur PL: <@{discordId}> avec **{elo} Elo**. Rôle **{roleName}** synchronisé toutes les 10 minutes.',
        en: '📉 Lowest PL player: <@{discordId}> with **{elo} Elo**. **{roleName}** role is synced every 10 minutes.'
      },
      {
        discordId: player.discord_id,
        elo,
        roleName: WORST_PLAYER_ROLE_NAME
      }
    ),
    allowedMentions: { repliedUser: false, users: [player.discord_id] }
  });
}

async function handleRanksCommand(message) {
  const targetId = message.author.id;

  let player;
  try {
    player = await fetchPlayerByDiscordId(targetId);
  } catch (err) {
    errorLog('Failed to fetch player ranks:', err);
    await message.reply({
      content: localizeText({
        fr: 'Erreur lors de la récupération du classement.',
        en: 'Error while fetching rankings.'
      }),
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  if (!player) {
    await message.reply({
      content: localizeText({
        fr: 'Aucun profil Elo trouvé pour ce joueur.',
        en: 'No Elo profile found for this player.'
      }),
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  const soloElo = normalizeRating(player.solo_elo);
  const currentRank = getEloRankByRating(soloElo);
  const nextRank = getNextEloRank(currentRank);
  const remaining = nextRank ? Math.max(0, Math.ceil(nextRank.min - soloElo)) : 0;

  const progressionLines = ELO_RANKS.slice()
    .reverse()
    .map((rank) => {
      const rankLabel = formatEloRankLabel(rank);
      const reached = soloElo >= rank.min;
      const marker = reached ? '✅' : '⬜';

      if (rank.min === -Infinity) {
        return `${marker} ${localizeText(
          { fr: '{rank} — < 1000 Elo', en: '{rank} — < 1000 Elo' },
          { rank: rankLabel }
        )}`;
      }

      return `${marker} ${localizeText({ fr: '{rank} — {min} Elo', en: '{rank} — {min} Elo' }, {
        rank: rankLabel,
        min: rank.min
      })}`;
    });

  const goalLine = nextRank
    ? localizeText(
        {
          fr: '🎯 Prochain palier : {rank} ({remaining} Elo restants)',
          en: '🎯 Next milestone: {rank} ({remaining} Elo to go)'
        },
        { rank: formatEloRankLabel(nextRank), remaining }
      )
    : localizeText({
        fr: '🏆 Tu es déjà au rang max (Verdoyant).',
        en: '🏆 You are already at the top rank (Verdoyant).'
      });

  const PAGE_SIZE = 8;
  const rankPages = [];
  for (let index = 0; index < progressionLines.length; index += PAGE_SIZE) {
    rankPages.push(progressionLines.slice(index, index + PAGE_SIZE));
  }

  const buildRanksEmbed = (pageIndex) => {
    const page = rankPages[pageIndex] || [];
    const pageLabel = localizeText(
      {
        fr: 'Page {current}/{total}',
        en: 'Page {current}/{total}'
      },
      { current: pageIndex + 1, total: rankPages.length }
    );

    return new EmbedBuilder()
      .setTitle(localizeText({ fr: 'Progression Elo — Verdoyant', en: 'Elo progression — Verdoyant' }))
      .setDescription(goalLine)
      .addFields(
        {
          name: localizeText({ fr: 'Ton Elo', en: 'Your Elo' }),
          value: `**${Math.round(soloElo)}**`,
          inline: true
        },
        {
          name: localizeText({ fr: 'Rang actuel', en: 'Current rank' }),
          value: formatEloRankLabel(currentRank),
          inline: true
        },
        {
          name: localizeText({ fr: 'Paliers Elo', en: 'Elo milestones' }),
          value: page.join('\n') || '—'
        }
      )
      .setFooter({ text: pageLabel })
      .setColor(0x9b59b6)
      .setTimestamp(new Date());
  };

  let currentPage = 0;
  const needsPagination = rankPages.length > 1;

  const buildNavigationRow = () =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ranks_prev')
        .setLabel('◀')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId('ranks_next')
        .setLabel('▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= rankPages.length - 1)
    );

  const sentMessage = await message.reply({
    embeds: [buildRanksEmbed(currentPage)],
    components: needsPagination ? [buildNavigationRow()] : [],
    allowedMentions: { repliedUser: false }
  });

  if (!needsPagination) {
    return;
  }

  const collector = sentMessage.createMessageComponentCollector({
    filter: (interaction) =>
      interaction.isButton() &&
      ['ranks_prev', 'ranks_next'].includes(interaction.customId) &&
      interaction.user.id === message.author.id,
    time: 120000
  });

  collector.on('collect', async (interaction) => {
    if (interaction.customId === 'ranks_prev' && currentPage > 0) {
      currentPage -= 1;
    }

    if (interaction.customId === 'ranks_next' && currentPage < rankPages.length - 1) {
      currentPage += 1;
    }

    await interaction.update({
      embeds: [buildRanksEmbed(currentPage)],
      components: [buildNavigationRow()]
    });
  });

  collector.on('end', async () => {
    try {
      await sentMessage.edit({
        components: []
      });
    } catch (err) {
      warn('Unable to clear ranks pagination controls:', err?.message || err);
    }
  });
}

async function handleAchievementsCommand(message) {
  const mention = message.mentions.users.first();
  const targetId = mention ? mention.id : message.author.id;
  const targetUser = mention || message.author;

  let player;
  try {
    player = await fetchPlayerByDiscordId(targetId);
  } catch (err) {
    errorLog('Failed to fetch player achievements:', err);
    await message.reply({
      content: localizeText({
        fr: 'Erreur lors de la récupération des succès.',
        en: 'Error while fetching achievements.'
      })
    });
    return;
  }

  if (!player) {
    await message.reply({
      content: localizeText({
        fr: "Aucun profil trouvé pour ce joueur.",
        en: 'No profile found for this player.'
      })
    });
    return;
  }

  const siteRanking = await getSiteRankingInfo(targetId);
  const currentRankLabel = siteRanking.rank
    ? `#${siteRanking.rank}`
    : localizeText({ fr: 'Non classé', en: 'Unranked' });

  const scrimWins = typeof player.scrim_wins === 'number' ? player.scrim_wins : 0;
  const prissCupOpenWins =
    typeof player.prisscup_open_wins === 'number' ? player.prisscup_open_wins : 0;
  const prissCup1v1Wins =
    typeof player.prisscup_1v1_wins === 'number' ? player.prisscup_1v1_wins : 0;


  const achievementFields = [
    {
      name: localizeText({ fr: 'Victoires en scrim', en: 'Scrim wins' }),
      value: `${scrimWins}`,
      inline: true
    }
  ];

  if (prissCupOpenWins > 0) {
    achievementFields.push({
      name: localizeText({ fr: 'Victoires PRISSCup Open', en: 'PRISSCup Open wins' }),
      value: `${prissCupOpenWins}`,
      inline: true
    });
  }

  if (prissCup1v1Wins > 0) {
    achievementFields.push({
      name: localizeText({ fr: 'Victoires PRISSCup 1v1', en: 'PRISSCup 1v1 wins' }),
      value: `${prissCup1v1Wins}`,
      inline: true
    });
  }

  achievementFields.push({
    name: localizeText({ fr: 'Rang actuel', en: 'Current rank' }),
    value: currentRankLabel,
    inline: true
  });

  const embed = new EmbedBuilder()
    .setTitle(
      localizeText(
        { fr: 'Succès — {name}', en: 'Achievements — {name}' },
        { name: player.name || localizeText({ fr: `Joueur ${targetId}`, en: `Player ${targetId}` }) }
      )
    )
    .addFields(achievementFields)
    .setColor(0xffbe0b)
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .setTimestamp(new Date());

  await message.reply({ embeds: [embed] });
}

async function handleLeaderboardCommand(message, args) {
  try {
    const allPlayers = await fetchSiteTierLeaderboard();
    if (!allPlayers.length) {
      await message.reply({
        content: localizeText({
          fr: 'Aucun joueur classé pour le moment.',
          en: 'No ranked players yet.'
        })
      });
      return;
    }

    const rawQuery = args.join(' ').trim();
    if (rawQuery) {
      const normalizedQuery = rawQuery.toLowerCase();
      const matchedPlayers = allPlayers.filter((player) =>
        String(player?.name || '')
          .toLowerCase()
          .includes(normalizedQuery)
      );

      if (!matchedPlayers.length) {
        await message.reply({
          content: localizeText(
            {
              fr: "Aucun joueur trouvé pour la recherche: **{query}**.",
              en: 'No player found for search: **{query}**.'
            },
            { query: rawQuery }
          ),
          allowedMentions: { repliedUser: false }
        });
        return;
      }

      const lines = matchedPlayers.slice(0, 10).map((player) => {
        const absoluteRank =
          allPlayers.findIndex(
            (entry) =>
              String(entry?.discordId || '') === String(player?.discordId || '') &&
              String(entry?.name || '').toLowerCase() === String(player?.name || '').toLowerCase()
          ) + 1;
        const countryFlag = toCountryFlag(player.countryCode);
        const displayRank = absoluteRank > 0 ? absoluteRank : '?';
        return `**#${displayRank}** **${player.name}** • ${countryFlag} ${String(player.countryCode || 'FR').toUpperCase()} • ${
          player.tier
        } • **${Math.round(Number(player.points || 0))} pts**`;
      });

      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x8e44ad)
            .setTitle(
              localizeText(
                { fr: '🔎 Résultats de recherche — {query}', en: '🔎 Search results — {query}' },
                { query: rawQuery }
              )
            )
            .setDescription(lines.join('\n'))
            .setFooter({
              text: localizeText(
                { fr: '{count} résultat(s)', en: '{count} result(s)' },
                { count: matchedPlayers.length }
              )
            })
            .setTimestamp(new Date())
        ],
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    let requestedLimit = allPlayers.length;
    if (args[0]) {
      const parsed = parseInt(args[0], 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        requestedLimit = Math.min(parsed, allPlayers.length);
      }
    }

    const players = allPlayers.slice(0, requestedLimit);
    const pageSize = 10;
    const pages = [];
    for (let index = 0; index < players.length; index += pageSize) {
      pages.push(players.slice(index, index + pageSize));
    }

    const buildEmbed = (pageIndex) => {
      const page = pages[pageIndex] || [];
      const lines = page.map((player, index) => {
        const globalRank = pageIndex * pageSize + index + 1;
        const trophy = globalRank <= 3 ? `${TROPHY_EMOJI} ` : '';
        const countryFlag = toCountryFlag(player.countryCode);
        return `**#${globalRank}** ${trophy}**${player.name}** • ${countryFlag} ${String(
          player.countryCode || 'FR'
        ).toUpperCase()} • ${player.tier} • **${Math.round(Number(player.points || 0))} pts**`;
      });

      return new EmbedBuilder()
        .setTitle(
          localizeText(
            { fr: `${TROPHY_EMOJI} Classement Tier — Top {count}`, en: `${TROPHY_EMOJI} Tier leaderboard — Top {count}` },
            { count: players.length }
          )
        )
        .setDescription(lines.join('\n'))
        .setColor(0xf1c40f)
        .setFooter({
          text: localizeText(
            { fr: 'Page {current}/{total}', en: 'Page {current}/{total}' },
            { current: pageIndex + 1, total: pages.length }
          )
        })
        .setTimestamp(new Date());
    };

    let currentPage = 0;
    const needsPagination = pages.length > 1;
    const buildNavigationRow = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('tierleaderboard_prev')
          .setLabel('◀')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId('tierleaderboard_next')
          .setLabel('▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage >= pages.length - 1),
        new ButtonBuilder()
          .setCustomId('tierleaderboard_search')
          .setLabel(localizeText({ fr: 'Rechercher un joueur', en: 'Search player' }))
          .setStyle(ButtonStyle.Primary)
      );

    const sentMessage = await message.reply({
      embeds: [buildEmbed(currentPage)],
      components: needsPagination ? [buildNavigationRow()] : [],
      allowedMentions: { repliedUser: false }
    });

    if (!needsPagination) {
      return;
    }

    const collector = sentMessage.createMessageComponentCollector({
      filter: (interaction) =>
        interaction.isButton() &&
        ['tierleaderboard_prev', 'tierleaderboard_next', 'tierleaderboard_search'].includes(interaction.customId) &&
        interaction.user.id === message.author.id,
      time: 120000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'tierleaderboard_search') {
        const modalCustomId = `tierleaderboard_search_modal:${interaction.user.id}:${sentMessage.id}`;
        const modal = new ModalBuilder()
          .setCustomId(modalCustomId)
          .setTitle(localizeText({ fr: 'Rechercher un joueur', en: 'Search player' }))
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('player_name')
                .setLabel(localizeText({ fr: 'Nom du joueur', en: 'Player name' }))
                .setPlaceholder(localizeText({ fr: 'Ex: Prissme', en: 'e.g. Prissme' }))
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(32)
            )
          );

        await interaction.showModal(modal);

        const modalInteraction = await interaction
          .awaitModalSubmit({
            filter: (submitted) => submitted.customId === modalCustomId && submitted.user.id === message.author.id,
            time: 60000
          })
          .catch(() => null);

        if (!modalInteraction) {
          return;
        }

        const query = (modalInteraction.fields.getTextInputValue('player_name') || '').trim().toLowerCase();
        const matchedPlayers = players
          .map((player, index) => ({
            player,
            globalRank: index + 1
          }))
          .filter((entry) => String(entry.player?.name || '').toLowerCase().includes(query))
          .slice(0, 10);

        if (!matchedPlayers.length) {
          await modalInteraction.reply({
            content: localizeText({
              fr: 'Aucun joueur trouvé avec cette recherche.',
              en: 'No player found with this search.'
            }),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        await modalInteraction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x8e44ad)
              .setTitle(localizeText({ fr: '🔎 Résultat de recherche', en: '🔎 Search result' }))
              .setDescription(
                matchedPlayers
                  .map(
                    ({ player, globalRank }) =>
                      `**#${globalRank}** **${player.name}** • ${player.tier} • **${Math.round(
                        Number(player.points || 0)
                      )} pts**`
                  )
                  .join('\n')
              )
              .setTimestamp(new Date())
          ],
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (interaction.customId === 'tierleaderboard_prev' && currentPage > 0) {
        currentPage -= 1;
      }

      if (interaction.customId === 'tierleaderboard_next' && currentPage < pages.length - 1) {
        currentPage += 1;
      }

      await interaction.update({
        embeds: [buildEmbed(currentPage)],
        components: [buildNavigationRow()]
      });
    });

    collector.on('end', async () => {
      try {
        await sentMessage.edit({ components: [] });
      } catch (err) {
        warn('Unable to clear tier leaderboard pagination controls:', err?.message || err);
      }
    });
  } catch (error) {
    errorLog('Failed to fetch tier leaderboard:', error);
    await message.reply({
      content: localizeText({
        fr: 'Erreur lors de la récupération du classement.',
        en: 'Failed to retrieve leaderboard.'
      })
    });
  }
}

async function handlePLLeaderboardCommand(message, args) {
  try {
    let requestedLimit = 20;
    if (args[0]) {
      const parsed = parseInt(args[0], 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        requestedLimit = Math.min(parsed, 100);
      }
    }

    const players = await fetchPLLeaderboard(requestedLimit);
    if (!players.length) {
      await message.reply({
        content: localizeText({
          fr: 'Aucun joueur PL classé pour le moment.',
          en: 'No PL ranked players yet.'
        })
      });
      return;
    }

    const lines = players.map((player, index) => {
      const rank = index + 1;
      const trophy = rank <= 3 ? `${TROPHY_EMOJI} ` : '';
      const elo = Math.round(Number(player?.solo_elo || 1000));
      const name = player?.name || `Player ${player?.discord_id || '?'}`;
      return `**#${rank}** ${trophy}**${name}** • **${elo} Elo**`;
    });

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(localizeText({ fr: `${TROPHY_EMOJI} Classement PL`, en: `${TROPHY_EMOJI} PL leaderboard` }))
          .setDescription(lines.join('\n'))
          .setColor(0x5865f2)
          .setTimestamp(new Date())
      ],
      allowedMentions: { repliedUser: false }
    });
  } catch (error) {
    errorLog('Failed to fetch PL leaderboard:', error);
    await message.reply({
      content: localizeText({
        fr: 'Erreur lors de la récupération du classement PL.',
        en: 'Failed to retrieve PL leaderboard.'
      })
    });
  }
}

async function handleWorldLeaderboardCommand(message) {
  try {
    const allPlayers = await fetchSiteTierLeaderboard();
    if (!allPlayers.length) {
      await message.reply({
        content: localizeText({
          fr: 'Aucun joueur classé pour le moment.',
          en: 'No ranked players yet.'
        }),
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    const countries = new Map();

    for (const player of allPlayers) {
      const normalizedCountryCode = String(player?.countryCode || 'FR').trim().toUpperCase();
      const points = Math.round(Number(player?.points || 0));
      const currentEntry = countries.get(normalizedCountryCode) || {
        countryCode: normalizedCountryCode,
        points: 0,
        players: 0
      };

      currentEntry.points += Number.isFinite(points) ? points : 0;
      currentEntry.players += 1;
      countries.set(normalizedCountryCode, currentEntry);
    }

    const countryRanking = Array.from(countries.values()).sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.players !== a.players) {
        return b.players - a.players;
      }
      return a.countryCode.localeCompare(b.countryCode);
    });

    const lines = countryRanking.slice(0, 20).map((entry, index) => {
      const rank = index + 1;
      const trophy = rank <= 3 ? `${TROPHY_EMOJI} ` : '';
      const flag = toCountryFlag(entry.countryCode);
      return `**#${rank}** ${trophy}${flag} **${entry.countryCode}** • **${entry.points} pts** (${entry.players} joueur(s))`;
    });

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(localizeText({ fr: '🌍 Classement mondial des pays', en: '🌍 World country leaderboard' }))
          .setDescription(lines.join('\n'))
          .setFooter({
            text: localizeText(
              { fr: '{count} pays classés', en: '{count} ranked countries' },
              { count: countryRanking.length }
            )
          })
          .setTimestamp(new Date())
      ],
      allowedMentions: { repliedUser: false }
    });
  } catch (error) {
    errorLog('Failed to fetch world leaderboard:', error);
    await message.reply({
      content: localizeText({
        fr: 'Erreur lors de la récupération du classement mondial.',
        en: 'Failed to retrieve world leaderboard.'
      }),
      allowedMentions: { repliedUser: false }
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

// ==== PRISSCUP 3V3 REGISTRATION START ====
function sanitizePrisscupTeamName(name) {
  if (!name) {
    return 'Team';
  }

  const cleaned = name.replace(/[^\w\s-]/g, '').trim();
  const trimmed = cleaned.slice(0, 25) || 'Team';
  return trimmed;
}

function formatPrisscupRoleName(name) {
  return `TEAM | ${sanitizePrisscupTeamName(name)}`;
}

async function fetchPrisscupTeams(guildId, eventName) {
  if (!guildId) {
    return [];
  }

  const { data, error } = await supabase
    .from('prisscup_teams')
    .select('team_name, leader_id, mate1_id, mate2_id, created_at')
    .eq('guild_id', guildId)
    .eq('event_name', eventName)
    .order('created_at', { ascending: true });

  if (error) {
    warn('Unable to load PrissCup teams:', error.message);
    return [];
  }

  return data || [];
}

function formatPrisscupTeamLine(team, index) {
  const badge = PRISSCUP_TEAM_BADGES[index % PRISSCUP_TEAM_BADGES.length];
  const teammates = [team.leader_id, team.mate1_id, team.mate2_id]
    .filter(Boolean)
    .map((id) => `<@${id}>`)
    .join(', ');

  return `${badge} **${sanitizePrisscupTeamName(team.team_name)}** — ${teammates || 'Team to complete'}`;
}

async function isUserRegisteredForPrisscup(guildId, eventName, userId) {
  const { data, error } = await supabase
    .from('prisscup_teams')
    .select('id')
    .eq('guild_id', guildId)
    .eq('event_name', eventName)
    .or(`leader_id.eq.${userId},mate1_id.eq.${userId},mate2_id.eq.${userId}`)
    .limit(1);

  if (error) {
    warn('Unable to verify PrissCup registration:', error.message);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

async function sendPrisscupEmbed(guildContext) {
  if (!guildContext) {
    return null;
  }

  const channel =
    guildContext.channels?.cache?.get(PRISSCUP_ANNOUNCE_CHANNEL_ID) ||
    (await guildContext.channels.fetch(PRISSCUP_ANNOUNCE_CHANNEL_ID).catch(() => null));

  if (!channel?.isTextBased()) {
    warn('PrissCup announce channel is not text-based or missing.');
    return null;
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prisscup_register')
      .setLabel('Register')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('prisscup_info')
      .setLabel('Info')
      .setStyle(ButtonStyle.Secondary)
  );

  const content = `Event Discord : ${PRISSCUP_EVENT_URL}`;
  const storedMessageId = prisscupData.messageIdByGuild[guildContext.id];
  let existingMessage = null;

  if (storedMessageId) {
    try {
      existingMessage = await channel.messages.fetch(storedMessageId);
    } catch (err) {
      warn('Unable to fetch stored PrissCup message:', err?.message || err);
    }
  }

  if (!existingMessage) {
    try {
      const botId = client?.user?.id;
      if (botId) {
        const recentMessages = await channel.messages.fetch({ limit: 50 });
        existingMessage = recentMessages.find((message) => {
          const authorMatch = message.author.id === botId;
          const hasButtons =
            message.components?.[0]?.components?.some((component) =>
              ['prisscup_register', 'prisscup_info'].includes(component.customId)
            ) || false;
          const contentMatch = message.content?.includes(PRISSCUP_EVENT_URL);

          return authorMatch && hasButtons && contentMatch;
        });
      }
    } catch (err) {
      warn('Unable to search for existing PrissCup message:', err?.message || err);
    }
  }

  if (existingMessage) {
    await existingMessage.edit({ content, embeds: [], components: [row] });
    prisscupData.messageIdByGuild[guildContext.id] = existingMessage.id;
    return existingMessage;
  }

  const sentMessage = await channel.send({ content, components: [row] });
  prisscupData.messageIdByGuild[guildContext.id] = sentMessage.id;
  return sentMessage;
}

  async function handlePrissCup3v3Command(message) {
    const isAdmin = message.member?.permissions?.has(PermissionsBitField.Flags.Administrator);
    if (!isAdmin) {
      await message.reply({
        content: 'Only administrators can post the PrissCup announcement.',
        allowedMentions: { repliedUser: false }
      });
      return;
    }

  await sendPrisscupEmbed(message.guild);
  await message.reply({
    content: 'PrissCup message posted in the dedicated channel.',
    allowedMentions: { repliedUser: false }
  });
}

async function handlePrisscupDeleteTeamCommand(message, args) {
  const isAdmin = message.member?.permissions?.has(PermissionsBitField.Flags.Administrator);
  if (!isAdmin) {
    await message.reply({
      content: "Seuls les administrateurs peuvent supprimer une équipe PrissCup. / Only administrators can delete a PrissCup team.",
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  const teamName = args.join(' ');
  if (!teamName.trim()) {
    await message.reply({
      content: "Merci d'indiquer le nom de l'équipe à supprimer. / Please provide the team name to delete.",
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  const result = await deletePrisscupTeam(message.guild, teamName);

  if (!result.success) {
    const errorMessages = {
      missing_guild: 'Serveur introuvable. / Guild missing.',
      missing_name: "Nom d'équipe manquant. / Team name missing.",
      not_found: "Aucune équipe trouvée avec ce nom. / No team found with that name.",
      lookup_failed: "Erreur en recherchant l'équipe. / Error while searching the team.",
      delete_failed: "Impossible de supprimer l'équipe. / Unable to delete the team."
    };

    await message.reply({
      content: errorMessages[result.reason] || 'Suppression impossible. / Deletion failed.',
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  await sendPrisscupEmbed(message.guild);

  await message.reply({
    content: `L'équipe **${sanitizePrisscupTeamName(result.team.team_name)}** a été supprimée. / Team **${sanitizePrisscupTeamName(result.team.team_name)}** has been deleted.`,
    allowedMentions: { repliedUser: false }
  });
}

async function registerPrisscupTeam(guildContext, leaderId, mateIds, teamName) {
  if (!guildContext) {
    throw new Error('Guild context missing for PrissCup registration.');
  }

  const participantIds = [leaderId, ...mateIds];
  for (const participantId of participantIds) {
    if (await isUserRegisteredForPrisscup(guildContext.id, PRISSCUP_EVENT_NAME, participantId)) {
      return { success: false, reason: 'already_registered' };
    }
  }

  const roleName = formatPrisscupRoleName(teamName);
  let role = null;

  try {
    role = await guildContext.roles.create({
      name: roleName,
      reason: 'PrissCup 3v3 team registration'
    });
  } catch (err) {
    errorLog('Unable to create PrissCup team role:', err.message || err);
    return { success: false, reason: 'role_creation_failed' };
  }

  const members = await Promise.all(
    participantIds.map((id) => guildContext.members.fetch(id).catch(() => null))
  );

  if (members.some((member) => !member)) {
    warn('One or more PrissCup participants are not in the guild.');
  }

  await Promise.all(
    members
      .filter(Boolean)
      .map((member) => member.roles.add(role, 'PrissCup 3v3 team registration').catch(() => null))
  );

  const { error } = await supabase.from('prisscup_teams').insert({
    guild_id: guildContext.id,
    event_name: PRISSCUP_EVENT_NAME,
    leader_id: leaderId,
    mate1_id: mateIds[0],
    mate2_id: mateIds[1],
    team_role_id: role.id,
    team_name: sanitizePrisscupTeamName(teamName),
    created_at: new Date().toISOString()
  });

  if (error) {
    errorLog('Unable to save PrissCup team:', error.message || error);
    return { success: false, reason: 'save_failed' };
  }

  return { success: true, role };
}

async function deletePrisscupTeam(guildContext, teamName) {
  if (!guildContext) {
    return { success: false, reason: 'missing_guild' };
  }

  const trimmedName = (teamName || '').trim();
  if (!trimmedName) {
    return { success: false, reason: 'missing_name' };
  }

  const sanitizedName = sanitizePrisscupTeamName(trimmedName);
  const { data, error } = await supabase
    .from('prisscup_teams')
    .select('id, team_role_id, leader_id, mate1_id, mate2_id, team_name')
    .eq('guild_id', guildContext.id)
    .eq('event_name', PRISSCUP_EVENT_NAME)
    .ilike('team_name', sanitizedName)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    warn('Unable to look up PrissCup team for deletion:', error.message);
    return { success: false, reason: 'lookup_failed' };
  }

  if (!data) {
    return { success: false, reason: 'not_found' };
  }

  const memberIds = [data.leader_id, data.mate1_id, data.mate2_id].filter(Boolean);
  if (data.team_role_id) {
    const role =
      guildContext.roles.cache.get(data.team_role_id) ||
      (await guildContext.roles.fetch(data.team_role_id).catch(() => null));

    if (role) {
      await Promise.all(
        memberIds.map((id) =>
          guildContext.members
            .fetch(id)
            .then((member) => member.roles.remove(role, 'PrissCup team removed'))
            .catch(() => null)
        )
      );

      await role.delete('PrissCup team removed by admin').catch(() => null);
    }
  }

  const { error: deleteError } = await supabase.from('prisscup_teams').delete().eq('id', data.id);
  if (deleteError) {
    errorLog('Unable to delete PrissCup team:', deleteError.message || deleteError);
    return { success: false, reason: 'delete_failed' };
  }

  return { success: true, team: data };
}
// ==== PRISSCUP 3V3 REGISTRATION END ====

async function handleTeamsCommand(message) {
  const lines = ['📋 PRISS Cup – Teams', ''];

  for (const [teamName, players] of Object.entries(TEAMS)) {
    lines.push(`${teamName} : ${players.join(', ')}`);
  }

  const formattedMessage = lines.join('\n');

  await message.reply({ content: formattedMessage });
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

async function fetchPlayerTierDescription(playerId) {
  if (!playerId) {
    return '';
  }

  const { data, error } = await supabase
    .from('lfn_player_profiles')
    .select('description')
    .eq('player_id', playerId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116' && error.code !== '42P01' && error.code !== '42703') {
    throw new Error(error.message || 'Unable to load player description.');
  }

  return String(data?.description || '').trim();
}

async function handleTierCommand(message) {
  const mention = message.mentions.users.first();
  const targetUser = mention || message.author;

  let description = '';
  const playerProfile = await fetchPlayerByDiscordId(targetUser.id).catch(() => null);
  if (playerProfile?.id) {
    description = await fetchPlayerTierDescription(playerProfile.id).catch(() => '');
  }

  const siteTierPlayer = await fetchSiteTierPlayerByDiscordId(targetUser.id).catch(() => null);
  if (!siteTierPlayer) {
    await message.reply({ content: 'No-Tier' });
    return;
  }

  const tierLeaderboard = await fetchSiteTierLeaderboard().catch(() => []);
  const playerRank = tierLeaderboard.findIndex(
    (player) => String(player?.discordId || '') === String(targetUser.id)
  ) + 1;
  const totalPlayers = tierLeaderboard.length || null;
  const rankLabel = playerRank
    ? `#${playerRank}${totalPlayers ? `/${totalPlayers}` : ''}`
    : localizeText({ fr: 'Non classé', en: 'Unranked' });
  const sameTierCount = tierLeaderboard.filter((player) => player?.tier === siteTierPlayer.tier).length;
  const countryCode = String(siteTierPlayer.countryCode || 'FR').toUpperCase();
  const countryFlag = toCountryFlag(countryCode);
  const tierLabel = String(siteTierPlayer.tier || 'No Tier');
  const tierEmoji = formatTierEmoji(tierLabel);

  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(PUBLIC_TIER_COLORS[siteTierPlayer.tier] || 0x00b894)
        .setTitle(`${TROPHY_EMOJI} ${tierEmoji ? `${tierEmoji} ` : ''}${tierLabel.toUpperCase()}`)
        .setDescription(
          `**${sameTierCount}** personne(s) ont le même tier.\nClassement global: **${rankLabel}**\nPoints: **${Math.round(
            Number(siteTierPlayer.points || 0)
          )}**\nPays: **${countryFlag} ${countryCode}**${
            description ? `\n\n📝 ${description}` : ''
          }`
        )
        .setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }))
    ]
  });
}

function formatTierRoleMention(tier) {
  const normalizedTier = String(tier || '').toUpperCase();
  const roleId =
    tierRoleMap[normalizedTier] ||
    (normalizedTier === 'A' ? '1482720488529727498' : null) ||
    (normalizedTier === 'S' ? '1482720508813512814' : null);
  if (!roleId) {
    return `Tier ${normalizedTier}`;
  }
  return `<@&${roleId}>`;
}

async function handleTierCriteriaCommand(message) {
  const rows = [
    { tier: 'E', criteria: '0-9 points **ou** Master 1 BS' },
    { tier: 'D', criteria: '10-19 points **ou** Master 2 BS' },
    { tier: 'C', criteria: '20-34 points **ou** Master 3 BS' },
    { tier: 'B', criteria: '35-55 points **ou** Pro BS' },
    { tier: 'A', criteria: '55+ points' },
    { tier: 'S', criteria: 'Top players du Tier A' }
  ];

  const description = rows
    .map(({ tier, criteria }) => {
      const emoji = formatTierEmoji(tier);
      const roleMention = formatTierRoleMention(tier);
      return `${emoji} ${roleMention} — **Tier ${tier}**\n↳ ${criteria}`;
    })
    .join('\n\n');

  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('📊 Critères des tiers')
        .setDescription(description)
    ]
  });
}

async function sendPeriodicPromotionEmbed(message) {
  if (!message?.channel || commandUsageCounter % 20 !== 0) {
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x2b1a3d)
    .setTitle('Crée ta PROPRE CUP 🏆')
    .setDescription(
      [
        'Tu veux voir ton nom sur une compétition ?',
        '',
        '👉 **Je t’organise ta propre cup :**',
        '',
        '• Organisation ✅',
        '• Cast du direct 🎙️',
        '• Hype 🔥',
        '',
        '👉 **Toi tu profites, je m’occupe de tout**',
        '',
        '💰 Format simple : ~9,99-19,99€',
        '',
        '👉 https://ko-fi.com/prissme'
      ].join('\n')
    );

  await message.channel.send({ embeds: [embed] }).catch((err) => {
    warn('Failed to send periodic promotion embed:', err?.message || err);
  });
}

async function handleLfnCommand(message) {
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xe39f30)
        .setTitle('LFN Esports — Ligue francophone')
        .setDescription(
          'La LFN est une compétition Brawl Stars francophone organisée sur plusieurs saisons, avec classement, matchs et suivi des équipes.'
        )
        .addFields({ name: 'Site officiel', value: 'https://www.lfn-esports.fr/' })
        .setURL('https://www.lfn-esports.fr/')
    ]
  });
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

function formatDraftList(items) {
  if (!items.length) {
    return '—';
  }
  return items.join(', ');
}

function buildDraftEmbed(session) {
  const aiBans = draft.getAIBans(session);
  const available = draft.getAvailable(session);
  const summary = draft.summarizeResult(session);
  const victoryArgs = draft.buildVictoryArguments(session);
  const isDone = draft.isDraftDone(session);
  const turn = draft.getTurn(session);

  let description = '';
  if (session.phase === 'BAN') {
    description = 'Écris le nom d’un brawler pour le bannir (3 bans).';
  } else if (!isDone) {
    description = turn === 'USER' ? 'Écris le nom d’un brawler pour le pick.' : 'Tour de l’IA…';
  } else {
    description = 'Draft terminée.';
  }

  const embed = new EmbedBuilder()
    .setTitle('Draft IA')
    .setDescription(description)
    .setColor(0x9b59b6)
    .setTimestamp(new Date());

  embed.addFields(
    { name: 'Phase', value: session.phase === 'BAN' ? `Bans (${session.userBans.length}/3)` : 'Draft', inline: true },
    { name: 'Tour', value: isDone ? 'Terminé' : turn === 'USER' ? 'Toi' : 'IA', inline: true },
    { name: 'First pick', value: session.firstPick === 'AI' ? 'IA' : 'Toi', inline: true },
    { name: 'Meta', value: session.metaProfile, inline: true },
    { name: 'IA bans', value: formatDraftList(aiBans) },
    { name: 'Tes bans', value: formatDraftList(session.userBans) },
    { name: 'Tes picks', value: formatDraftList(session.userPicks) },
    { name: 'IA picks', value: formatDraftList(session.aiPicks) },
    { name: `Pool dispo (${available.length})`, value: formatDraftList(available) }
  );

  if (summary) {
    const chance = draft.estimateWinChance(summary.userScore, summary.aiScore);
    const verdict =
      summary.winner === 'user' ? '✅ Tu gagnes la draft' : summary.winner === 'ai' ? '❌ IA gagne la draft' : '🤝 Draft équilibrée';
    embed.addFields({
      name: 'Résultat',
      value: `Toi ${summary.userScore.toFixed(2)} / IA ${summary.aiScore.toFixed(2)}\nChance de victoire (toi): ${chance}%\n${verdict}`
    });
    if (victoryArgs?.length) {
      embed.addFields({
        name: 'Arguments',
        value: victoryArgs.map((arg, index) => `${index + 1}. ${arg}`).join('\n')
      });
    }
  }

  return embed;
}

async function sendOrUpdateDraftMessage(session, channel) {
  if (!channel?.isTextBased()) {
    return null;
  }
  const embed = buildDraftEmbed(session);
  let message = null;

  if (session.interfaceMessageId) {
    try {
      message = await channel.messages.fetch(session.interfaceMessageId);
      await message.edit({ embeds: [embed] });
      return message;
    } catch (err) {
      warn('Unable to edit draft interface message, sending a new one:', err?.message || err);
    }
  }

  message = await channel.send({ embeds: [embed] });
  session.interfaceMessageId = message.id;
  return message;
}

async function announceDraftResult(session, message) {
  if (session.resultAnnounced) {
    return;
  }
  const summary = draft.summarizeResult(session);
  const victoryArgs = draft.buildVictoryArguments(session);
  if (!summary) {
    return;
  }
  const chance = draft.estimateWinChance(summary.userScore, summary.aiScore);
  await message.channel.send({ content: `🎯 Chance de victoire estimée pour toi: **${chance}%**` });
  const verdict =
    summary.winner === 'user' ? '✅ Tu gagnes la draft' : summary.winner === 'ai' ? '❌ IA gagne la draft' : '🤝 Draft équilibrée';
  await message.channel.send({ content: `🏆 Résultat final: **${verdict}**` });
  if (victoryArgs?.length) {
    await message.channel.send({ content: `🧠 Arguments:\n- ${victoryArgs.join('\n- ')}` });
  }
  session.resultAnnounced = true;
}

function formatDraftStatus(session) {
  const aiBans = draft.getAIBans(session);
  const available = draft.getAvailable(session);
  const lines = [];

  if (session.phase === 'BAN') {
    lines.push(`Phase bans (toi ${session.userBans.length}/3)`);
  } else {
    lines.push('Phase draft');
  }

  lines.push(`IA bans: ${formatDraftList(aiBans)}`);
  lines.push(`Tes bans: ${formatDraftList(session.userBans)}`);
  lines.push(`Tes picks: ${formatDraftList(session.userPicks)}`);
  lines.push(`IA picks: ${formatDraftList(session.aiPicks)}`);

  if (draft.isDraftDone(session)) {
    const summary = draft.summarizeResult(session);
    if (summary) {
      const verdict =
        summary.winner === 'user' ? '✅ Tu gagnes la draft' : summary.winner === 'ai' ? '❌ IA gagne la draft' : '🤝 Draft équilibrée';
      lines.push(`Résultat: Toi ${summary.userScore.toFixed(2)} / IA ${summary.aiScore.toFixed(2)} — ${verdict}`);
      const victoryArgs = draft.buildVictoryArguments(session);
      if (victoryArgs?.length) {
        lines.push(`Arguments: ${victoryArgs.join(' | ')}`);
      }
    }
  } else {
    const turn = draft.getTurn(session);
    lines.push(`Tour: ${turn === 'USER' ? 'Toi' : 'IA'}`);
  }

  lines.push(`Pool dispo (${available.length}): ${available.join(', ')}`);
  return lines.join('\n');
}

async function appendDraftResult(payload) {
  await fs.mkdir(path.dirname(DRAFT_RESULTS_PATH), { recursive: true });
  let entries = [];
  try {
    const raw = await fs.readFile(DRAFT_RESULTS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      entries = parsed;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
  entries.push(payload);
  await fs.writeFile(DRAFT_RESULTS_PATH, `${JSON.stringify(entries, null, 2)}\n`);
}

async function persistDraftResult(session, message) {
  if (session.resultSaved) {
    return;
  }
  const summary = draft.summarizeResult(session);
  if (!summary) {
    return;
  }

  if (session.isAIDraft) {
    session.resultSaved = true;
    return;
  }

  const aiBans = draft.getAIBans(session);
  const victoryArgs = draft.buildVictoryArguments(session);
  const payload = {
    created_at: new Date().toISOString(),
    guild_id: message.guild?.id || null,
    channel_id: message.channel?.id || null,
    user_id: session.ownerId,
    meta_profile: session.metaProfile,
    first_pick: session.firstPick,
    user_bans: session.userBans,
    ai_bans: aiBans,
    user_picks: session.userPicks,
    ai_picks: session.aiPicks,
    user_score: summary.userScore,
    ai_score: summary.aiScore,
    winner: summary.winner,
    arguments: victoryArgs || []
  };

  try {
    await appendDraftResult(payload);
    session.resultSaved = true;
  } catch (error) {
    errorLog('Failed to store draft result:', error);
  }
}

async function handleDraftCommand(message, args) {
  const channelId = message.channel.id;
  const command = (args[0] || '').toLowerCase();
  let session = draftSessions.get(channelId);

  if (session && draft.isDraftDone(session) && (!command || command === 'status')) {
    session = null;
    draftSessions.delete(channelId);
  }

  if (!session) {
    session = draft.createSession(message.author.id, draft.META_DEFAULT, { isAIDraft: true });
    draftSessions.set(channelId, session);
  }

  const isAdmin = message.member?.permissions?.has(PermissionsBitField.Flags.Administrator);
  if (session.ownerId !== message.author.id && !isAdmin) {
    await message.reply({
      content: 'Une draft est déjà en cours dans ce salon. Seul son créateur (ou un admin) peut la piloter.',
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  if (command === 'reset') {
    draftSessions.delete(channelId);
    await message.reply({ content: 'Draft réinitialisée. Utilise `!draft` pour recommencer.' });
    return;
  }

  if (command === 'help') {
    await message.reply({
      content:
        'Commandes draft:\n' +
        '- `!draft` → démarre ou affiche la draft (interface)\n' +
        '- Tape simplement un nom de brawler pour ban/pick\n' +
        '- `!draft status` → afficher le statut\n' +
        '- `!draft reset` → reset la draft',
      allowedMentions: { repliedUser: false }
    });
    return;
  }

  if (command === 'status' || !command) {
    await sendOrUpdateDraftMessage(session, message.channel);
    return;
  }

  if (command === 'ban') {
    const rawName = args.slice(1).join(' ');
    const brawler = draft.resolveBrawler(rawName);
    if (!brawler) {
      await message.reply({ content: 'Brawler inconnu. Vérifie le nom exact.', allowedMentions: { repliedUser: false } });
      return;
    }
    const result = draft.applyUserBan(session, brawler);
    if (!result.ok) {
      await message.reply({ content: 'Impossible de bannir ce brawler maintenant.', allowedMentions: { repliedUser: false } });
      return;
    }
    if (session.phase === 'DRAFT') {
      draft.runAiPicks(session);
    }
    await sendOrUpdateDraftMessage(session, message.channel);
    return;
  }

  if (command === 'pick') {
    const rawName = args.slice(1).join(' ');
    const brawler = draft.resolveBrawler(rawName);
    if (!brawler) {
      await message.reply({ content: 'Brawler inconnu. Vérifie le nom exact.', allowedMentions: { repliedUser: false } });
      return;
    }
    const result = draft.applyUserPick(session, brawler);
    if (!result.ok) {
      await message.reply({ content: 'Impossible de pick ce brawler maintenant.', allowedMentions: { repliedUser: false } });
      return;
    }
    draft.runAiPicks(session);
    if (draft.isDraftDone(session)) {
      await persistDraftResult(session, message);
      await sendOrUpdateDraftMessage(session, message.channel);
      await announceDraftResult(session, message);
      return;
    }
    await sendOrUpdateDraftMessage(session, message.channel);
    return;
  }

  await message.reply({ content: 'Commande draft inconnue. Utilise `!draft help`.', allowedMentions: { repliedUser: false } });
}

async function handleDraftFreeInput(message) {
  const channelId = message.channel.id;
  const session = draftSessions.get(channelId);
  if (!session) {
    return false;
  }

  const isAdmin = message.member?.permissions?.has(PermissionsBitField.Flags.Administrator);
  if (session.ownerId !== message.author.id && !isAdmin) {
    return false;
  }

  const brawler = draft.findBrawlerInText(message.content);
  if (!brawler) {
    return false;
  }

  if (session.phase === 'BAN') {
    const result = draft.applyUserBan(session, brawler);
    if (!result.ok) {
      await message.reply({ content: 'Impossible de bannir ce brawler maintenant.', allowedMentions: { repliedUser: false } });
      return true;
    }
    if (session.phase === 'DRAFT') {
      draft.runAiPicks(session);
    }
    await sendOrUpdateDraftMessage(session, message.channel);
    return true;
  }

  if (session.phase === 'DRAFT') {
    if (draft.isDraftDone(session)) {
      await message.reply({ content: 'La draft est déjà terminée.', allowedMentions: { repliedUser: false } });
      return true;
    }
    if (draft.getTurn(session) !== 'USER') {
      await message.reply({ content: "Ce n'est pas encore ton tour.", allowedMentions: { repliedUser: false } });
      return true;
    }
    const result = draft.applyUserPick(session, brawler);
    if (!result.ok) {
      await message.reply({ content: 'Impossible de pick ce brawler maintenant.', allowedMentions: { repliedUser: false } });
      return true;
    }
    draft.runAiPicks(session);
    await sendOrUpdateDraftMessage(session, message.channel);
    if (draft.isDraftDone(session)) {
      await persistDraftResult(session, message);
      await announceDraftResult(session, message);
    }
    return true;
  }

  return false;
}

async function handleHelpCommand(message) {
  const commands = [
    '`!join` — Rejoindre la file de matchmaking',
    '`!leave` — Quitter la file d\'attente',
    '`!queue` — Voir la file PL avec le rang des joueurs',
    '`!lb [nombre]` — Voir le classement PL (Elo)',
    '`!tier [@joueur]` — Voir le tier Discord + description joueur',
    '`!tiercriteria` — Voir comment atteindre chaque tier',
    '`!tierlb [nombre]` — Voir le classement tiers du site (pagination)',
    '`!worldlb` — Voir le classement des pays par points',
    '`!lfn` — Présentation de la compétition + lien du site',
    '`!elo [@joueur]` — Afficher le classement Elo',
    '`!ranks` — Voir ta progression Elo vers Verdoyant',
    '`!last` — Afficher le joueur avec le moins d\'Elo',
    '`!maps` — Afficher la rotation des maps'
  ];

  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('Commandes du bot')
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

  await thread.join().catch(() => null);

  for (const discordId of participantIds) {
    await thread.members.add(discordId).catch(() => null);
    await thread.permissionOverwrites
      ?.edit(discordId, {
        ViewChannel: true,
        SendMessages: true,
        SendMessagesInThreads: true,
        ReadMessageHistory: true
      })
      .catch(() => null);
  }
}


async function ensureLobbyRoleThreadPermissions(channel, lobbyRole) {
  if (!channel?.permissionOverwrites || !lobbyRole?.id) {
    return;
  }

  await channel.permissionOverwrites
    .edit(lobbyRole.id, {
      ViewChannel: true,
      SendMessages: true,
      SendMessagesInThreads: true,
      ReadMessageHistory: true,
      CreatePublicThreads: true,
      CreatePrivateThreads: true
    }, { reason: 'Allow match participants to speak in match thread' })
    .catch((err) => {
      warn('Unable to grant thread permissions to lobby role:', err?.message || err);
    });
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

async function startMatch(participants, fallbackChannel, isPl = false) {
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

  const contentParts = [];
  if (lobbyRole?.id) {
    contentParts.push(`<@&${lobbyRole.id}>`);
  } else if (PING_ROLE_ID) {
    contentParts.push(`<@&${PING_ROLE_ID}>`);
  }

  const state = {
    matchId: insertedMatch.id,
    mapChoices,
    primaryMap,
    teams,
    bestOf,
    kFactor,
    isPl,
    createdAt: new Date(insertedMatch?.created_at || Date.now()),
    timeoutAt: isPl ? new Date(Date.now() + PL_MATCH_TIMEOUT_MS).toISOString() : null,
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
  await ensureLobbyRoleThreadPermissions(channel, lobbyRole);
  const matchThread = await createMatchThread(channel, state.matchId, lobbyRole, participantIds);
  if (matchThread) {
    state.threadId = matchThread.id;
  }
  activeMatches.set(state.matchId, state);

  const runtimePlayers = {
    ids: participantIds,
    teams: {
      blue: teams.blue.map((player) => player.discordId),
      red: teams.red.map((player) => player.discordId)
    },
    matchId: state.matchId,
    map: state.primaryMap
  };

  if (!isPl) {
    await saveRuntimeActiveMatch({
      message_id: state.messageId,
      guild_id: guildContext.id,
      players: runtimePlayers,
      is_pl: false,
      status: 'pending',
      created_at: new Date().toISOString(),
      timeout_at: null
    });
  }

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

  return state;
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

function runInBackground(taskName, task) {
  Promise.resolve()
    .then(task)
    .catch((error) => {
      errorLog(`${taskName} failed:`, error);
    });
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
  const shieldLogLines = [];

  for (const player of state.teams.blue) {
    const currentRating = normalizeRating(player.soloElo);
    const expected = calculateExpectedScore(currentRating, redAvg);
    const personalizedKFactor = getPersonalizedKFactor(player, matchKFactor, currentRating, redAvg);
    let newRating = Math.max(0, Math.round(currentRating + personalizedKFactor * (blueScore - expected)));
    const winStreakBonus = blueScore === 1 ? Math.min(MAX_WINSTREAK_ELO_BONUS, (player.winStreak || 0) + 1) : 0;
    if (winStreakBonus > 0) {
      newRating += winStreakBonus;
    }

    const crossedThreshold = RANK_THRESHOLDS.find(
      (threshold) => currentRating < threshold && newRating >= threshold
    );
    if (crossedThreshold) {
      player.shieldActive = true;
      player.shieldThreshold = crossedThreshold;
      shieldLogLines.push(`🛡️ Shield activé pour ${player.displayName} au seuil ${crossedThreshold} Elo`);
    }

    if (player.shieldActive && newRating < player.shieldThreshold) {
      const shieldedRating = player.shieldThreshold;
      shieldLogLines.push(`🛡️ Shield utilisé pour ${player.displayName} : ${newRating} → ${shieldedRating}`);
      newRating = shieldedRating;
      player.shieldActive = false;
      player.shieldThreshold = 0;
    }

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
      lose_streak: loseStreak,
      shield_active: player.shieldActive,
      shield_threshold: player.shieldThreshold
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
    const personalizedKFactor = getPersonalizedKFactor(player, matchKFactor, currentRating, blueAvg);
    let newRating = Math.max(0, Math.round(currentRating + personalizedKFactor * (redScore - expected)));
    const winStreakBonus = redScore === 1 ? Math.min(MAX_WINSTREAK_ELO_BONUS, (player.winStreak || 0) + 1) : 0;
    if (winStreakBonus > 0) {
      newRating += winStreakBonus;
    }

    const crossedThreshold = RANK_THRESHOLDS.find(
      (threshold) => currentRating < threshold && newRating >= threshold
    );
    if (crossedThreshold) {
      player.shieldActive = true;
      player.shieldThreshold = crossedThreshold;
      shieldLogLines.push(`🛡️ Shield activé pour ${player.displayName} au seuil ${crossedThreshold} Elo`);
    }

    if (player.shieldActive && newRating < player.shieldThreshold) {
      const shieldedRating = player.shieldThreshold;
      shieldLogLines.push(`🛡️ Shield utilisé pour ${player.displayName} : ${newRating} → ${shieldedRating}`);
      newRating = shieldedRating;
      player.shieldActive = false;
      player.shieldThreshold = 0;
    }

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
      lose_streak: loseStreak,
      shield_active: player.shieldActive,
      shield_threshold: player.shieldThreshold
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
    try {
      const payload = {
        solo_elo: update.solo_elo,
        wins: update.wins,
        losses: update.losses,
        games_played: update.games_played,
        win_streak: update.win_streak,
        lose_streak: update.lose_streak
      };

      if (supportsShieldColumns) {
        payload.shield_active = update.shield_active;
        payload.shield_threshold = update.shield_threshold;
      }

      const { error: playerError } = await supabase
        .from('players')
        .update(payload)
        .eq('id', update.id);

      if (playerError) {
        if (supportsShieldColumns && isMissingShieldColumnError(playerError.message)) {
          supportsShieldColumns = false;
          warn('Shield columns are missing in `players`; continuing without shield persistence.');

          const { error: fallbackError } = await supabase
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

          if (!fallbackError) {
            continue;
          }

          throw new Error(fallbackError.message);
        }

        throw new Error(playerError.message);
      }
    } catch (error) {
      throw new Error(`Unable to update player ${update.id}: ${error.message}`);
    }
  }

  performanceStores.playerStore.invalidatePlayers(changes.map((entry) => entry?.player?.discordId).filter(Boolean));

  await updateMatchRecord(state.matchId, {
    status: 'completed',
    winner: outcome,
    completed_at: new Date().toISOString()
  });

  if (shieldLogLines.length > 0) {
    runInBackground('Shield logging', () => sendLogMessage(shieldLogLines.join('\n')));
  }

  runInBackground('Rank-up notifications', async () => {
    await Promise.all(
      changes.map((change) => sendRankUpNotification(change.player, change.oldRating, change.newRating))
    );
  });

  if (guild) {
    runInBackground('Rank role synchronization', async () => {
      await Promise.all(
        changes.map((change) => syncMemberRankRole(guild, change.player.discordId, change.newRating))
      );
    });
  }

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
  if (
    (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) &&
    interaction.customId?.startsWith('room')
  ) {
    const replyPayload = {
      content:
        'Les rooms custom sont temporairement désactivées pour simplifier le système compétitif. / Custom rooms are temporarily disabled to simplify the competitive system.',
      flags: MessageFlags.Ephemeral
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(replyPayload);
    } else {
      await interaction.reply(replyPayload);
    }
    return;
  }

  if (await predictions.handleInteraction(interaction)) {
    return;
  }

  if (await handleAdminSlashCommand(interaction)) {
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'prisscup_info') {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [
          new EmbedBuilder()
            .setTitle('PrissCup 3v3 — Info')
            .setDescription(
              [
                'Competitive 3v3. Maps announced on the server.',
                'Be on time: 10 minutes late = DQ.',
                'Check Discord for maps and schedule.'
              ].join('\n')
            )
            .setColor(0x0b132b)
        ]
      });
      return;
    }

    if (interaction.customId === 'prisscup_register') {
      if (!interaction.guild || interaction.guild.id !== DISCORD_GUILD_ID) {
        return;
      }

      const row = new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder()
          .setCustomId('prisscup_select_mates')
          .setMinValues(2)
          .setMaxValues(2)
          .setPlaceholder('Select 2 teammates')
      );

      await interaction.reply({
        content: 'Pick your 2 teammates for PrissCup 3v3.',
        components: [row],
        flags: MessageFlags.Ephemeral
      });
      return;
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'pl_queue_join') {
      if (!interaction.guild || interaction.guild.id !== DISCORD_GUILD_ID) {
        return;
      }

      const joinResult = await addPlayerToPLQueue(interaction.user.id, interaction.guild, { queueIndex: 1 });
      if (joinResult.added) {
        await processPLQueue();
      }

      if (joinResult.blockedByRankGap) {
        await interaction.reply({
          embeds: [buildRankGapErrorEmbed()],
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await interaction.reply({
        content: buildPLJoinReplyContent(joinResult),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (interaction.customId === 'pl_queue_leave') {
      if (!interaction.guild || interaction.guild.id !== DISCORD_GUILD_ID) {
        return;
      }

      const leaveResult = await removePlayerFromPLQueue(interaction.user.id, interaction.guild);
      if (!leaveResult.removed) {
        await interaction.reply({
          content: 'Tu n\'es pas dans la file PL. (You are not in the PL queue.)',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await interaction.reply({
        content: leaveResult.queueIndex === 2
          ? 'Tu as quitté la file 2. (You left queue 2.)'
          : 'Tu as quitté la file PL. (You left the PL queue.)',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (interaction.customId === 'prisscup_team_name') {
      // Handled in modal submit branch
      return;
    }

    const [prefix, action, requestId] = interaction.customId.split(':');

    if (prefix === 'room' && action === 'open') {
      const pending = pendingRoomForms.get(requestId);

      if (!pending) {
        await interaction.reply({
          content: localizeText({
            fr: 'Ce formulaire a expiré ou est introuvable. Demandez à rouvrir une nouvelle demande.',
            en: 'This form expired or no longer exists. Please ask for a new request to be opened.'
          }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (pending.leaderId !== interaction.user.id) {
        await interaction.reply({
          content: localizeText({
            fr: 'Seul le créateur de la room peut remplir ce formulaire.',
            en: 'Only the room creator can complete this form.'
          }),
          flags: MessageFlags.Ephemeral
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
        .setLabel(localizeText({ fr: 'Format (bo3 uniquement)', en: 'Format (bo3 only)' }))
        .setPlaceholder(localizeText({ fr: 'bo3', en: 'bo3' }))
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
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (matchState.resolved) {
      await interaction.reply({
        content: localizeText({
          fr: 'Ce match a déjà été terminé.',
          en: 'This match has already been completed.'
        }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (matchResolutionLocks.has(matchState.messageId)) {
      await interaction.reply({
        content: localizeText({
          fr: 'Le résultat est en cours de validation, réessayez dans quelques secondes.',
          en: 'The result is currently being validated, please try again in a few seconds.'
        }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const isParticipant = matchState.participants.has(interaction.user.id);
    const hasPLAdminRole = hasPLAdminAccess(interaction);

    if (!isParticipant && !hasPLAdminRole) {
      await interaction.reply({
        content: localizeText({
          fr: 'Seuls les joueurs du match et les admins PL peuvent voter.',
          en: 'Only match participants and PL admins can vote.'
        }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    try {
      if (outcome === 'dodge') {
        await interaction.reply({
          content: localizeText({
            fr: 'Sélectionnez le joueur qui a dodge le match.',
            en: 'Select the player who dodged the match.'
          }),
          components: [buildDodgeSelectMenu(matchState)],
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (!['blue', 'red', 'cancel'].includes(outcome)) {
        await interaction.reply({
          content: localizeText({
            fr: 'Option de vote invalide.',
            en: 'Invalid vote option.'
          }),
          flags: MessageFlags.Ephemeral
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
      const shouldResolve = hasPLAdminRole || hasReachedThreshold;

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
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await interaction.deferUpdate();

      matchResolutionLocks.add(matchState.messageId);

      const summary = await applyMatchOutcome(matchState, outcome, interaction.user.id);
      if (!summary) {
        matchResolutionLocks.delete(matchState.messageId);
        await interaction.followUp({
          content: localizeText({
            fr: 'Le résultat a déjà été enregistré.',
            en: 'The result has already been recorded.'
          }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      matchState.resolved = true;
      activeMatches.delete(matchState.matchId);
      await handlePLMatchResolved(matchState.messageId);

      await interaction.editReply({
        embeds: [buildMatchEmbed(matchState, summary)],
        components: [buildResultButtons(true)]
      });

      runInBackground('Match resource cleanup', () => cleanupMatchResources(matchState));

      const mapLabel = matchState.primaryMap
        ? `${matchState.primaryMap.emoji} ${matchState.primaryMap.mode}`
        : localizeText({ fr: 'Map inconnue', en: 'Unknown map' });
      await sendLogMessage(
        [`✅ Match #${matchState.matchId} terminé (${mapLabel})`, summary.text].join('\n')
      );
      matchResolutionLocks.delete(matchState.messageId);
    } catch (err) {
      if (matchState?.messageId) {
        matchResolutionLocks.delete(matchState.messageId);
      }
      errorLog('Failed to process match result:', err);
      const errorResponse = {
        content: localizeText({
          fr: "Erreur lors de l'enregistrement du résultat.",
          en: 'Error while saving the result.'
        }),
        flags: MessageFlags.Ephemeral
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
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (matchState.resolved) {
      await interaction.reply({
        content: localizeText({ fr: 'Le match est déjà validé.', en: 'The match is already resolved.' }),
        flags: MessageFlags.Ephemeral
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
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const targetId = interaction.values?.[0];
    if (!targetId) {
      await interaction.reply({
        content: localizeText({ fr: 'Sélection invalide.', en: 'Invalid selection.' }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (!matchState.participants.has(targetId)) {
      await interaction.reply({
        content: localizeText({ fr: 'Ce joueur ne fait pas partie du match.', en: 'This player is not in the match.' }),
        flags: MessageFlags.Ephemeral
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
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    voterSet.add(interaction.user.id);
    matchState.dodgeVotes.set(targetId, voterSet);

    const voteCount = voterSet.size;
    const player = findPlayerInTeams(matchState.teams, targetId);
    const remaining = Math.max(0, DODGE_VOTES_REQUIRED - voteCount);
    let penaltyMessage = '';
    const reachedThreshold = voteCount >= DODGE_VOTES_REQUIRED;

    if (reachedThreshold && !matchState.penalizedDodges.has(targetId)) {
      try {
        const result = await applyDodgePenalty(player);
        matchState.penalizedDodges.add(targetId);

        if (result.success) {
          penaltyMessage = localizeText(
            {
              fr: '{name} perd {penalty} Elo et prend un verrouillage de 1h pour dodge.',
              en: '{name} loses {penalty} Elo and receives a 1h lock for dodging.'
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

    let autoCancelled = false;

    if (reachedThreshold && !matchState.resolved) {
      const summaryText = localizeText(
        {
          fr: 'Match annulé automatiquement suite à 4 votes dodge contre {name}. Aucun changement de score Elo.',
          en: 'Match automatically cancelled after 4 dodge votes against {name}. No Elo changes applied.'
        },
        {
          name: player?.displayName || `<@${targetId}>`
        }
      );

      const summary = await finalizeMatchOutcome(
        matchState,
        'cancel',
        interaction.user.id,
        interaction.client,
        { summaryText }
      );

      autoCancelled = Boolean(summary);
    }

    if (!autoCancelled) {
      await refreshMatchMessage(matchState, interaction.client);
    }

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
    }

    if (autoCancelled) {
      followupLines.push(
        localizeText(
          {
            fr: '⚪ Match #{matchId} annulé automatiquement (4/4 votes dodge).',
            en: '⚪ Match #{matchId} automatically cancelled (4/4 dodge votes).'
          },
          { matchId: matchState.matchId }
        )
      );
    } else if (remaining > 0) {
      followupLines.push(
        localizeText(
          { fr: '{remaining} vote(s) restants.', en: '{remaining} vote(s) remaining.' },
          { remaining }
        )
      );
    }

    await interaction.reply({ content: followupLines.join('\n'), flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.isUserSelectMenu() && interaction.customId === 'prisscup_select_mates') {
    if (!interaction.guild || interaction.guild.id !== DISCORD_GUILD_ID) {
      return;
    }

    if (!Array.isArray(interaction.values) || interaction.values.length !== 2) {
      await interaction.reply({
        content: 'Merci de sélectionner exactement 2 joueurs. / Please select exactly 2 players.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const leaderId = interaction.user.id;
    const mateIds = interaction.values;
    const uniqueIds = new Set([leaderId, ...mateIds]);

    if (uniqueIds.size < 3) {
      await interaction.reply({
        content:
          'Chaque joueur doit être unique. Merci de choisir 2 mates différents. / Each player must be unique, please pick two different teammates.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const participantProfiles = [];
    for (const participantId of uniqueIds) {
      const profile = await fetchPlayerByDiscordId(participantId).catch((err) => {
        warn('Unable to load participant profile for PrissCup validation:', err?.message || err);
        return null;
      });

      participantProfiles.push({
        majorRankLevel: getEloMajorRankLevel(profile?.solo_elo)
      });
    }

    const sortedByLevel = participantProfiles.slice().sort((a, b) => a.majorRankLevel - b.majorRankLevel);
    const lowestRank = sortedByLevel[0];
    const highestRank = sortedByLevel[sortedByLevel.length - 1];

    if (lowestRank && highestRank && highestRank.majorRankLevel - lowestRank.majorRankLevel > 3) {
      await interaction.reply({
        content:
          'Écart de rang trop élevé: maximum 3 rangs entre joueurs (ex: Mythique↔Silver autorisé, Mythique↔Bronze interdit). / Rank gap too high: max 3 ranks between players (ex: Mythic↔Silver allowed, Mythic↔Bronze blocked).',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    for (const participantId of uniqueIds) {
      if (await isUserRegisteredForPrisscup(interaction.guild.id, PRISSCUP_EVENT_NAME, participantId)) {
        await interaction.reply({
          content:
            'Un des joueurs est déjà inscrit dans une autre équipe. (One of the players is already registered in another team.)',
          flags: MessageFlags.Ephemeral
        });
        return;
      }
    }

    pendingPrisscupTeams.set(leaderId, {
      guildId: interaction.guild.id,
      leaderId,
      mateIds,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    const modal = new ModalBuilder()
      .setCustomId('prisscup_team_name')
      .setTitle("Nom de l'équipe / Team name")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('team_name')
            .setLabel("Nom de l'équipe (Team name)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(20)
        )
      );

    await interaction.showModal(modal);
    return;
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'prisscup_team_name') {
      const pending = pendingPrisscupTeams.get(interaction.user.id);

      if (!pending || pending.expiresAt < Date.now()) {
        pendingPrisscupTeams.delete(interaction.user.id);
        await interaction.reply({
          content:
            'Sélection expirée ou introuvable. Merci de recommencer. / Selection expired or not found, please start again.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (interaction.guild?.id !== pending.guildId) {
        await interaction.reply({
          content: 'Cette demande ne correspond pas à ce serveur. / This request does not match this server.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const teamName = interaction.fields.getTextInputValue('team_name');
      const participantIds = [pending.leaderId, ...pending.mateIds];

      for (const participantId of participantIds) {
        if (await isUserRegisteredForPrisscup(interaction.guild.id, PRISSCUP_EVENT_NAME, participantId)) {
          await interaction.reply({
            content:
              'Un des joueurs est déjà inscrit dans une autre équipe. (One of the players is already registered in another team.)',
            flags: MessageFlags.Ephemeral
          });
          pendingPrisscupTeams.delete(interaction.user.id);
          return;
        }
      }

      const registration = await registerPrisscupTeam(interaction.guild, pending.leaderId, pending.mateIds, teamName);
      pendingPrisscupTeams.delete(interaction.user.id);

      if (!registration.success) {
        await interaction.reply({
          content:
            "Erreur lors de l'inscription de l'équipe. Merci de réessayer. / Error while registering the team. Please try again.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await sendPrisscupEmbed(interaction.guild);

      const matesMention = pending.mateIds.map((id) => `<@${id}>`).join(', ');

      await interaction.reply({
        content: `Ton équipe **${sanitizePrisscupTeamName(teamName)}** est inscrite à la PrissCup 3v3 ! (Your team **${sanitizePrisscupTeamName(teamName)}** is registered for PrissCup 3v3!)\n${matesMention}`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

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
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (pending.leaderId !== interaction.user.id) {
      await interaction.reply({
        content: localizeText({
          fr: 'Seul le créateur de la room peut valider ce formulaire.',
          en: 'Only the room creator can submit this form.'
        }),
        flags: MessageFlags.Ephemeral
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
        flags: MessageFlags.Ephemeral
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
        flags: MessageFlags.Ephemeral
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
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (!bestOf) {
      pendingRoomForms.delete(requestId);
      await interaction.reply({
        content: localizeText({
          fr: 'Le format doit être bo3.',
          en: 'The format must be bo3.'
        }),
        flags: MessageFlags.Ephemeral
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
  warn(
    'Synchronisation des tiers désactivée : cette routine est mise en pause pour éviter les surcharges mémoire.'
  );
  return;

  if (!guild) {
    warn('Cannot sync tiers: guild not resolved yet.');
    return;
  }

  let players;
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, discord_id, name, solo_elo, active')
      .order('solo_elo', { ascending: false });

    if (error) {
      throw error;
    }

    players = (data || [])
      .filter((player) => player.discord_id)
      .map((player) => {
        const soloElo = normalizeRating(player.solo_elo);
        return {
          ...player,
          solo_elo: soloElo,
          weightedScore: soloElo
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
    plQueueChannel = await readyClient.channels.fetch(PL_QUEUE_CHANNEL_ID);
    if (!plQueueChannel?.isTextBased()) {
      warn(`Configured PL queue channel ${PL_QUEUE_CHANNEL_ID} is not text-based.`);
      plQueueChannel = null;
    }
  } catch (err) {
    warn(`Unable to fetch PL queue channel ${PL_QUEUE_CHANNEL_ID}:`, err.message);
    plQueueChannel = null;
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

  await predictions.registerCommands(buildAdminSlashCommands());

  warn('Système de tiers désactivé : aucune synchronisation automatique ne sera lancée.');

  // ⚠️ Synchronisation des tiers désactivée (évite la boucle infinie + la charge mémoire).
  // await syncTiersWithRoles();
  // tierSyncInterval = setInterval(() => {
  //   syncTiersWithRoles().catch((err) => errorLog('Tier sync failed:', err));
  // }, TIER_SYNC_INTERVAL_MS);

  await syncWorstPlayerRole(guild).catch((err) => warn('Initial worst player role sync failed:', err?.message || err));
  if (worstPlayerRoleInterval) {
    clearInterval(worstPlayerRoleInterval);
  }
  worstPlayerRoleInterval = setInterval(() => {
    syncWorstPlayerRole(guild).catch((err) => warn('Worst player role sync failed:', err?.message || err));
  }, WORST_PLAYER_ROLE_SYNC_INTERVAL_MS);

  await restorePLState();
  await processPLQueue();
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
    const handledDraft = await handleDraftFreeInput(message);
    if (handledDraft) {
      return;
    }
    return;
  }

  const [commandName, ...args] = content.slice(1).split(/\s+/);
  const command = commandName.toLowerCase();
  commandUsageCounter += 1;

  // === COMMANDES TEMPORAIREMENT DÉSACTIVÉES POUR SIMPLIFICATION ===
  const disabledCommands = new Set(['teams']);

  if (disabledCommands.has(command)) {
    await message.reply({
      content:
        'Ces commandes sont temporairement désactivées pour simplifier le système compétitif. / These commands are temporarily disabled to simplify the competitive flow.',
      allowedMentions: { repliedUser: false }
    });
    await sendPeriodicPromotionEmbed(message);
    return;
  }

  try {
    switch (command) {
      case 'join':
        await handleJoinCommand(message, args);
        break;
      case 'leave':
        await handleLeaveCommand(message, args);
        break;
      case 'queue':
      case 'file':
        await handleQueueCommand(message, args);
        break;
      case 'cleanqueue':
        await handleCleanQueueCommand(message, args);
        break;
      case 'elo':
        await handleEloCommand(message, args);
        break;
      case 'last':
      case 'dernier':
        await handleLastCommand(message, args);
        break;
      case 'ranks':
        await handleRanksCommand(message, args);
        break;
      case 'lb':
      case 'leaderboard':
        await handlePLLeaderboardCommand(message, args);
        break;
      case 'tierlb':
      case 'tierleaderboard':
        await handleLeaderboardCommand(message, args);
        break;
      case 'worldlb':
      case 'worldleaderboard':
        await handleWorldLeaderboardCommand(message, args);
        break;
      case 'maps':
        await handleMapsCommand(message, args);
        break;
      case 'prisscupdel':
      case 'prisscupdelete':
        await handlePrisscupDeleteTeamCommand(message, args);
        break;
      case 'tiers':
        await handleTierSyncCommand(message, args);
        break;
      case 'tier':
      case 'ier':
        await handleTierCommand(message, args);
        break;
      case 'tiercriteria':
      case 'tiercrit':
      case 'criteriatier':
        await handleTierCriteriaCommand(message, args);
        break;
      case 'lfn':
        await handleLfnCommand(message, args);
        break;
      case 'teams':
        await handleTeamsCommand(message, args);
        break;
      case 'draft':
        await handleDraftCommand(message, args);
        break;
      case 'aide':
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

  await sendPeriodicPromotionEmbed(message);
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

  predictions.initPredictionContext({
    client,
    guildId: DISCORD_GUILD_ID,
    supabase: createSupabaseClient(),
    localizeText,
    log,
    warn,
    error: errorLog
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
