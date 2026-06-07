'use strict';

const path = require('path');

function normalizeBestOfEnvInput(value) {
  const parsed = Number.parseInt(value, 10);
  return [3].includes(parsed) ? parsed : null;
}

const LOG_PREFIX = '[UnifiedBot]';
const DRAFT_RESULTS_PATH = path.join(__dirname, '..', 'data', 'draft-results.json');
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
const DEFAULT_MATCH_BEST_OF = normalizeBestOfEnvInput(process.env.DEFAULT_MATCH_BEST_OF) || 3;
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
const PL_ROLE_CHANNEL_ID = '1267617798658457732';
const PL_LEADERBOARD_PAGE_SIZE = 10;

const ROLE_TIER_S = process.env.ROLE_TIER_S || '1482720508813512814';
const ROLE_TIER_A = process.env.ROLE_TIER_A || '1482720488529727498';
const ROLE_TIER_B = process.env.ROLE_TIER_B || '1482720438751723621';
const ROLE_TIER_C = process.env.ROLE_TIER_C || '1482720402428924047';
const ROLE_TIER_D = process.env.ROLE_TIER_D || '1482720374713094164';
const ROLE_TIER_E = process.env.ROLE_TIER_E || '1482720350004449302';

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
  { roleId: '1482720350004449302', tier: 'Tier E', emoji: '<:TierE:1482723920309260439>' }
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

module.exports = {
  LOG_PREFIX,
  DRAFT_RESULTS_PATH,
  TEAM_SIZE,
  MATCH_SIZE,
  DEFAULT_ELO,
  ELO_DIVISOR,
  TIER_SYNC_INTERVAL_MS,
  WORST_PLAYER_ROLE_SYNC_INTERVAL_MS,
  MIN_VOTES_TO_RESOLVE,
  MAP_CHOICES_COUNT,
  DODGE_VOTES_REQUIRED,
  DODGE_ELO_PENALTY,
  DODGE_QUEUE_LOCK_MS,
  ROOM_TIER_ORDER,
  BEST_OF_VALUES,
  DEFAULT_MATCH_BEST_OF,
  MAX_QUEUE_ELO_DIFFERENCE,
  MAX_MATCHMAKING_MAJOR_RANK_GAP,
  PL_QUEUE_CHANNEL_ID,
  PL_MATCH_TIMEOUT_MS,
  SIMPLE_LOBBY_CHANNEL_ID,
  SIMPLE_LOBBY_SIZE,
  SIMPLE_LOBBY_TEAM_SIZE,
  PRISSCUP_ANNOUNCE_CHANNEL_ID,
  PRISSCUP_EVENT_URL,
  PRISSCUP_EVENT_NAME,
  RANK_UP_CHANNEL_ID,
  PRISSCUP_TEAM_BADGES,
  DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID,
  SUPABASE_URL,
  SUPABASE_KEY,
  SITE_BASE_URL,
  TROPHY_EMOJI,
  MATCH_CHANNEL_ID,
  LOG_CHANNEL_ID,
  PING_ROLE_ID,
  UNKNOWN_PING_ROLE_NAME,
  WORST_PLAYER_ROLE_NAME,
  PL_ADMIN_ROLE_ID,
  SECONDARY_PL_ADMIN_ROLE_ID,
  PL_PLAYER_ROLE_ID,
  PL_ROLE_CHANNEL_ID,
  PL_LEADERBOARD_PAGE_SIZE,
  ROLE_TIER_S,
  ROLE_TIER_A,
  ROLE_TIER_B,
  ROLE_TIER_C,
  ROLE_TIER_D,
  ROLE_TIER_E,
  ELO_RANK_ROLE_IDS,
  TIER_DISTRIBUTION,
  TIER_EMOJIS,
  PUBLIC_TIER_ROLE_LOOKUP,
  PUBLIC_TIER_COLORS,
  BRONZE_EMOJI,
  SILVER_EMOJI,
  GOLD_EMOJI,
  DIAMOND_EMOJI,
  MYTHIC_EMOJI,
  LEGENDARY_EMOJI,
  MASTER_EMOJI,
  GRANDMASTER_EMOJI,
  VERDOYANT_EMOJI,
  WISHED_EMOJI,
  VOLATILITY_MULTIPLIERS,
  MAX_STREAK_K_BONUS,
  MAX_WINSTREAK_ELO_BONUS,
  RANK_THRESHOLDS,
  ELO_RANKS,
  ELO_MAJOR_RANK_ORDER,
  PRISSCUP_RULES_EN,
  TEAMS,
  MAP_ROTATION
};
