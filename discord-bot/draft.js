'use strict';

const META_DEFAULT = 'BUFFIES';

const META_POWER = {
  BUFFIES: {
    Shelly: 1,
    Mortis: 1,
    Spike: 1,
    Colt: 1,
    Frank: 1,
    Emz: 1
  }
};

const ALL = [
  'Shelly',
  'Colt',
  'Brock',
  'Nita',
  'Jessie',
  'Bull',
  'Rosa',
  'El Primo',
  'Poco',
  'Darryl',
  'Piper',
  'Belle',
  'Gene',
  'Spike',
  'Crow',
  'Leon',
  'Max',
  'Sandy',
  'Mortis',
  'Frank',
  'Buster',
  'Tara',
  'Pam',
  'Gus',
  'Juju',
  'Ruffs',
  'Carl',
  'Mina',
  'Otis',
  'Alli',
  'Griff',
  'Meeple',
  'Squeak',
  'Surge',
  'Trunk',
  'Sam',
  'Cordelius',
  'Emz',
  'Maisie',
  'Penny',
  'Gale',
  'Janet',
  'Amber',
  'Charlie',
  'Lily',
  'Hank',
  'Moe',
  'Chester',
  'Finx',
  'Kenji',
  'Ash',
  'Rico',
  'Melodie',
  'Byron',
  'Draco',
  'Lumi'
];

const MAP_PRIORITY = {
  Piper: 2,
  Belle: 2,
  Tara: 2,
  Juju: 2,
  Mina: 2,
  Cordelius: 2,
  Moe: 2,
  Finx: 2,
  Lumi: 2,
  Brock: 1,
  Colt: 1,
  Gene: 1,
  Spike: 1,
  Sandy: 1,
  Rosa: 1,
  Bull: 1,
  Mortis: 1,
  Buster: 1,
  Pam: 1,
  Gus: 1,
  Ruffs: 1,
  Carl: 1,
  Otis: 1,
  Alli: 1,
  Griff: 1,
  Meeple: 1,
  Squeak: 1,
  Surge: 1,
  Sam: 1,
  Emz: 1,
  Maisie: 1,
  Penny: 1,
  Gale: 1,
  Janet: 1,
  Amber: 1,
  Charlie: 1,
  Lily: 1,
  Rico: 1,
  Chester: 1,
  Kenji: 1,
  Melodie: 1,
  Byron: 1,
  Poco: 1,
  Draco: 1,
  Trunk: 0,
  Hank: 0,
  Ash: 0,
  Frank: 0
};

const COUNTER_BY_USER_PICK = {
  Bull: ['Shelly', 'Spike'],
  Rosa: ['Shelly', 'Spike'],
  'El Primo': ['Shelly', 'Spike'],
  Darryl: ['Shelly'],
  Jessie: ['Belle'],
  Nita: ['Belle'],
  Poco: ['Spike', 'Emz'],
  Piper: ['Gene'],
  Brock: ['Gene'],
  Mortis: ['Shelly', 'Spike', 'Nita'],
  Frank: ['Shelly', 'Spike', 'Colt'],
  Buster: ['Spike', 'Colt', 'Belle'],
  Tara: ['Gene', 'Belle'],
  Pam: ['Spike', 'Belle'],
  Gus: ['Mortis', 'Leon'],
  Juju: ['Gene', 'Belle'],
  Ruffs: ['Spike', 'Belle'],
  Carl: ['Shelly', 'Spike'],
  Mina: ['Gene', 'Belle'],
  Otis: ['Gene', 'Belle'],
  Alli: ['Shelly', 'Spike', 'Nita'],
  Griff: ['Belle', 'Gene'],
  Meeple: ['Belle', 'Gene'],
  Squeak: ['Gene', 'Belle'],
  Surge: ['Otis', 'Belle', 'Gene'],
  Trunk: ['Colt', 'Spike', 'Emz'],
  Sam: ['Shelly', 'Spike', 'Otis'],
  Cordelius: ['Belle', 'Gene', 'Otis'],
  Emz: ['Gene', 'Piper'],
  Maisie: ['Belle', 'Gene'],
  Penny: ['Mortis', 'Gale', 'Gene'],
  Gale: ['Gene', 'Belle', 'Mortis'],
  Janet: ['Belle', 'Gene', 'Piper'],
  Amber: ['Spike', 'Otis', 'Gene'],
  Charlie: ['Gene', 'Belle', 'Spike'],
  Lily: ['Shelly', 'Spike', 'Emz'],
  Hank: ['Spike', 'Otis', 'Colt'],
  Moe: ['Belle', 'Gene', 'Piper'],
  Chester: ['Gene', 'Belle'],
  Finx: ['Belle', 'Gene', 'Piper'],
  Kenji: ['Shelly', 'Spike', 'Otis'],
  Ash: ['Shelly', 'Emz', 'Spike'],
  Rico: ['Piper', 'Gene', 'Spike'],
  Melodie: ['Gene', 'Belle', 'Otis'],
  Byron: ['Mortis', 'Crow'],
  Draco: ['Spike', 'Otis'],
  Lumi: ['Gene', 'Belle']
};

const TURN = ['USER', 'AI', 'AI', 'USER', 'USER', 'AI'];

const SUPPORTS = new Set(['Gus', 'Pam', 'Ruffs', 'Poco', 'Byron', 'Lumi']);
const MELEES = new Set([
  'Frank',
  'Bull',
  'Hank',
  'Ash',
  'El Primo',
  'Mortis',
  'Sam',
  'Kenji',
  'Lily',
  'Rosa',
  'Darryl',
  'Draco',
  'Trunk'
]);
const SNIPERS_POKE = new Set(['Piper', 'Belle', 'Brock', 'Colt', 'Rico', 'Maisie', 'Janet']);

const NAME_LOOKUP = ALL.reduce((acc, name) => {
  acc.set(normalizeName(name), name);
  return acc;
}, new Map());

const NORMALIZED_BRAWLERS = ALL.map((name) => ({ name, normalized: normalizeName(name) })).sort(
  (a, b) => b.normalized.length - a.normalized.length
);

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function resolveBrawler(input) {
  const normalized = normalizeName(input);
  return NAME_LOOKUP.get(normalized) || null;
}

function findBrawlerInText(text) {
  const normalized = normalizeName(text);
  if (!normalized) return null;
  for (const entry of NORMALIZED_BRAWLERS) {
    if (normalized.includes(entry.normalized)) {
      return entry.name;
    }
  }
  return null;
}

function getMetaConfig() {
  return {
    comebackBonus: 1.5,
    doubleDiveNoStopPenalty: 1.0,
    supportPressurePenalty: 2.0,
    hankPenalty: 1.0,
    kenjiPenalty: 0.5,
    frankPenalty: 0.8
  };
}

function metaPowerOf(brawler, metaProfile) {
  return (META_POWER[metaProfile] && META_POWER[metaProfile][brawler]) || 0;
}

function metaHpBonusOf(brawler) {
  if (brawler === 'Mina') return 0;
  if (MELEES.has(brawler)) return 0.6;
  if (SUPPORTS.has(brawler)) return 0.4;
  if (SNIPERS_POKE.has(brawler)) return 0.2;
  return 0.3;
}

function evaluateDraft(picks, metaProfile = META_DEFAULT) {
  const cfg = getMetaConfig(metaProfile);

  let score = 0;
  for (const b of picks) {
    score += (MAP_PRIORITY[b] || 0) + metaPowerOf(b, metaProfile) + metaHpBonusOf(b);
  }

  const has = (x) => picks.includes(x);

  if (
    has('Tara') ||
    has('Gene') ||
    has('Belle') ||
    has('Juju') ||
    has('Mina') ||
    has('Otis') ||
    has('Griff') ||
    has('Meeple') ||
    has('Squeak') ||
    has('Spike') ||
    has('Cordelius') ||
    has('Emz') ||
    has('Maisie') ||
    has('Moe') ||
    has('Finx') ||
    has('Rico') ||
    has('Lumi') ||
    has('Charlie')
  ) {
    score += 1;
  }

  if (has('Colt') || has('Spike') || has('Carl') || has('Emz') || has('Rico') || has('Chester')) {
    score += 1;
  }

  if (has('Squeak')) score += 1;

  if (has('Colt') && has('Squeak')) score += 1;
  if (has('Meeple') && has('Squeak')) score += 0.5;
  if (has('Surge') && has('Trunk')) score -= 1;

  if (has('Spike') && has('Frank') && has('Lily')) score += 1.5;
  if (has('Emz') && has('Maisie') && has('Rico')) score -= 1;
  if (has('Frank') && has('Alli') && has('Carl')) score += 1.2;
  if (has('Rico') && has('Byron') && has('Lily')) score -= 1.2;

  if (has('Penny') && has('Mortis')) score += 0.5;
  if (has('Penny') && has('Tara')) score += 0.5;
  if (has('Mortis') && has('Tara')) score += 0.5;
  if (has('Penny') && has('Mortis') && has('Tara')) score += 0.7;
  if (has('Moe') && has('Byron') && has('Gale')) score -= 0.8;

  if (has('Shelly') && has('Janet')) score += 0.6;
  if (has('Janet') && has('Ruffs')) score += 0.4;
  if (has('Shelly') && has('Janet') && has('Ruffs')) score += 0.8;
  if (has('Meeple') && has('Amber') && has('Ash')) score -= 0.8;

  if (has('Mortis') && has('Tara')) score += 0.6;
  if (has('Pam') && has('Tara')) score += 0.3;
  if (has('Pam') && has('Mortis')) score += 0.2;
  if (has('Mortis') && has('Tara') && has('Pam')) score += 0.7;
  if (has('Hank') && has('Charlie') && has('Gus')) score -= 0.8;

  if (has('Buster') || has('Rosa') || has('Sam') || has('Ash') || has('Draco')) score += 1;

  const DIVE_UNITS = ['Mortis', 'Alli', 'Crow', 'Lily', 'Kenji', 'Melodie'];
  const diveCount = DIVE_UNITS.filter((d) => has(d)).length;
  const hasDive = diveCount > 0;
  if (hasDive) score += 1;

  if (diveCount >= 2) {
    const hasHardStop = has('Otis') || has('Spike') || has('Rico') || has('Cordelius');
    if (!hasHardStop) score -= cfg.doubleDiveNoStopPenalty;
  }

  if (has('Gus') || has('Pam') || has('Ruffs') || has('Poco') || has('Byron') || has('Lumi')) score += 0.5;

  const hasDisable = has('Spike') || has('Otis') || has('Rico');
  if (hasDisable) score += 1;

  if (hasDive && hasDisable) score += cfg.comebackBonus;

  const hasZone =
    has('Emz') ||
    has('Chester') ||
    has('Finx') ||
    has('Melodie') ||
    has('Lumi') ||
    has('Squeak') ||
    has('Maisie') ||
    has('Amber');
  if (hasZone && hasDive) score += 1;

  if (has('Bull')) score -= 1.5;
  if (has('Hank')) score -= cfg.hankPenalty;
  if (has('Frank')) score -= cfg.frankPenalty;
  if (has('Ash')) score -= 0.5;
  if (has('Kenji')) score -= cfg.kenjiPenalty;

  const supports = ['Gus', 'Ruffs', 'Pam', 'Poco', 'Byron', 'Lumi'].filter((s) => has(s)).length;
  if (supports >= 2) score -= cfg.supportPressurePenalty;

  const melees = ['Frank', 'Bull', 'Hank', 'Ash', 'El Primo', 'Mortis', 'Sam', 'Kenji', 'Lily', 'Trunk'].filter((m) => has(m)).length;
  if (melees >= 2) score -= 1.5;

  return score;
}

function pickAI({ available, lastUserPick, aiPicks = [], metaProfile = META_DEFAULT }) {
  if (!available.length) return '';

  let bestPick = available[0];
  let bestScore = -Infinity;

  for (const candidate of available) {
    let score = (MAP_PRIORITY[candidate] || 0) + metaPowerOf(candidate, metaProfile) + metaHpBonusOf(candidate);

    if (lastUserPick) {
      const counters = COUNTER_BY_USER_PICK[lastUserPick] || [];
      if (counters.includes(candidate)) score += 2;
    }

    score += evaluateDraft([...aiPicks, candidate], metaProfile);

    if (score > bestScore) {
      bestScore = score;
      bestPick = candidate;
    }
  }

  return bestPick;
}

function firstPickScore(brawler, metaProfile = META_DEFAULT) {
  return (MAP_PRIORITY[brawler] || 0) + metaPowerOf(brawler, metaProfile) + metaHpBonusOf(brawler) + evaluateDraft([brawler], metaProfile);
}

function computeAIBans(metaProfile, bannedByUser) {
  const candidates = ALL.filter((b) => !bannedByUser.has(b));
  const ranked = [...candidates]
    .map((b) => ({ b, s: firstPickScore(b, metaProfile) }))
    .sort((x, y) => y.s - x.s);
  return ranked.slice(0, 3).map((x) => x.b);
}

function createSession(ownerId, metaProfile = META_DEFAULT) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    ownerId,
    metaProfile,
    phase: 'BAN',
    userBans: [],
    userPicks: [],
    aiPicks: [],
    step: 0,
    resultSaved: false,
    resultAnnounced: false
  };
}

function getAIBans(session) {
  return computeAIBans(session.metaProfile, new Set(session.userBans));
}

function getGlobalBans(session) {
  const aiBans = getAIBans(session);
  return new Set([...aiBans, ...session.userBans]);
}

function getAvailable(session) {
  const bans = getGlobalBans(session);
  const taken = new Set([...session.userPicks, ...session.aiPicks]);
  return ALL.filter((b) => !bans.has(b) && !taken.has(b));
}

function getTurn(session) {
  if (session.step >= TURN.length) return null;
  return TURN[session.step];
}

function isDraftDone(session) {
  return session.step >= TURN.length;
}

function applyUserBan(session, brawler) {
  if (session.phase !== 'BAN') return { ok: false, reason: 'phase' };
  if (session.userBans.length >= 3) return { ok: false, reason: 'limit' };
  const aiBans = getAIBans(session);
  if (aiBans.includes(brawler)) return { ok: false, reason: 'ai-ban' };
  if (session.userBans.includes(brawler)) return { ok: false, reason: 'duplicate' };
  session.userBans.push(brawler);
  if (session.userBans.length >= 3) {
    session.phase = 'DRAFT';
    session.step = 0;
  }
  return { ok: true };
}

function applyUserPick(session, brawler) {
  if (session.phase !== 'DRAFT') return { ok: false, reason: 'phase' };
  if (isDraftDone(session)) return { ok: false, reason: 'done' };
  if (getTurn(session) !== 'USER') return { ok: false, reason: 'turn' };
  if (session.userPicks.length >= 3) return { ok: false, reason: 'limit' };
  const available = getAvailable(session);
  if (!available.includes(brawler)) return { ok: false, reason: 'taken' };
  session.userPicks.push(brawler);
  session.step += 1;
  return { ok: true };
}

function runAiPicks(session) {
  while (session.phase === 'DRAFT' && !isDraftDone(session) && getTurn(session) === 'AI') {
    if (session.aiPicks.length >= 3) break;
    const available = getAvailable(session);
    if (!available.length) break;
    const lastUserPick = session.userPicks[session.userPicks.length - 1];
    const pick = pickAI({
      available,
      lastUserPick,
      aiPicks: session.aiPicks,
      metaProfile: session.metaProfile
    });
    if (!pick) break;
    session.aiPicks.push(pick);
    session.step += 1;
  }
}

function summarizeResult(session) {
  if (session.phase !== 'DRAFT' || !isDraftDone(session)) {
    return null;
  }
  const userScore = evaluateDraft(session.userPicks, session.metaProfile);
  const aiScore = evaluateDraft(session.aiPicks, session.metaProfile);
  let winner = 'draw';
  if (userScore > aiScore) winner = 'user';
  if (aiScore > userScore) winner = 'ai';
  return { userScore, aiScore, winner };
}

function estimateWinChance(userScore, aiScore) {
  const diff = userScore - aiScore;
  const probability = 1 / (1 + Math.exp(-diff));
  return Math.round(probability * 100);
}

module.exports = {
  ALL,
  META_DEFAULT,
  TURN,
  resolveBrawler,
  findBrawlerInText,
  createSession,
  getAIBans,
  getAvailable,
  getTurn,
  isDraftDone,
  applyUserBan,
  applyUserPick,
  runAiPicks,
  summarizeResult,
  estimateWinChance
};
