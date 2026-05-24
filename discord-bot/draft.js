'use strict';

const META_DEFAULT = 'BUFFIES';

// Mise à jour de la Meta selon tes indications (valeur de 1 pour les BUFFIES)
const META_POWER = {
  BUFFIES: {
    Shelly: 1,
    Mortis: 1,
    Spike: 1,
    Colt: 1,
    Frank: 1,
    Emz: 1,
    Bull: 1,     // Upgradé à 1
    Edgar: 1,    // Ajouté
    Colette: 1,  // Ajouté
    Griff: 1,    // Ajouté
    Crow: 1,     // Ajouté
    Leon: 1,     // Ajouté
    Nita: 1,     // Ajouté
    Bo: 1,       // Ajouté
    Bibi: 1      // Ajouté
  }
};

const ALL = [
  'Shelly', 'Colt', 'Brock', 'Nita', 'Jessie', 'Bull', 'Rosa', 'El Primo', 'Poco', 'Darryl',
  'Piper', 'Belle', 'Gene', 'Spike', 'Crow', 'Leon', 'Max', 'Sandy', 'Mortis', 'Frank',
  'Buster', 'Tara', 'Pam', 'Gus', 'Juju', 'Ruffs', 'Carl', 'Mina', 'Otis', 'Alli',
  'Griff', 'Meeple', 'Squeak', 'Surge', 'Trunk', 'Shade', 'Sam', 'Cordelius', 'Emz', 'Maisie',
  'Penny', 'Gale', 'Janet', 'Amber', 'Charlie', 'Lily', 'Hank', 'Moe', 'Chester', 'Finx',
  'Kenji', 'Ash', 'Rico', 'Melodie', 'Byron', 'Draco', 'Lumi',
  'Glowy', 'Kit', 'Najia', 'Gray', 'Damian', 'Sirius', 'Colette', 'Ziggy',
  'Berry', 'Dynamike', 'Bo', 'Stu', 'Bolt',
  'Pierce', 'Angelo', 'Bibi', 'Pearl', 'Edgar' // Ajouts des nouveaux venus et manquants
];

const MAP_PRIORITY = {
  Piper: 2, Belle: 2, Tara: 2, Juju: 2, Mina: 2, Cordelius: 2, Moe: 2, Finx: 2, Lumi: 2,
  Kit: 2, Najia: 2, Gray: 2, Damian: 2, Sirius: 2, Colt: 2, Spike: 2, Bull: 2, Emz: 2,
  Shelly: 2, Dynamike: 2, Chester: 2, Crow: 2, Gene: 2, Bolt: 2, Pierce: 2, Angelo: 2, // Pierce et Angelo prioritaires
  Bo: 1, Berry: 1, Stu: 1, Brock: 1, Sandy: 1, Rosa: 1, Mortis: 1, Buster: 1, Pam: 1, Gus: 1, Ruffs: 1,
  Carl: 1, Otis: 1, Alli: 1, Griff: 1, Meeple: 1, Squeak: 1, Surge: 1, Sam: 1, Maisie: 1,
  Penny: 1, Gale: 1, Janet: 1, Amber: 1, Charlie: 1, Lily: 1, Rico: 1, Pearl: 1, Edgar: 1, Nita: 1, Leon: 1,
  Kenji: 1, Melodie: 1, Byron: 1, Poco: 1, Draco: 1, Glowy: 1, Colette: 1, Ziggy: 1, Bibi: 1,
  Trunk: 0, Hank: 0, Ash: 0, Frank: 0, Shade: 0
};

const COUNTER_BY_USER_PICK = {
  Bull: ['Shelly', 'Spike'],
  Rosa: ['Shelly', 'Spike'],
  'El Primo': ['Shelly', 'Spike'],
  Darryl: ['Shelly'],
  Jessie: ['Belle'],
  Nita: ['Belle'],
  Poco: ['Spike', 'Emz'],
  Piper: ['Gene', 'Angelo'],
  Brock: ['Gene', 'Moe', 'Sirius', 'Angelo', 'Pierce'],
  Mortis: ['Shelly', 'Spike', 'Nita'],
  Frank: ['Shelly', 'Spike', 'Colt', 'Bull'],
  Buster: ['Spike', 'Colt', 'Belle'],
  Tara: ['Gene', 'Belle'],
  Pam: ['Spike', 'Belle'],
  Gus: ['Mortis', 'Leon'],
  Juju: ['Gene', 'Belle'],
  Ruffs: ['Spike', 'Belle', 'Gene', 'Glowy'],
  Carl: ['Shelly', 'Spike'],
  Mina: ['Gene', 'Belle'],
  Otis: ['Gene', 'Belle', 'Spike', 'Colt', 'Crow', 'Chester'],
  Alli: ['Shelly', 'Spike', 'Nita', 'Kit', 'Bull'],
  Griff: ['Belle', 'Gene', 'Moe', 'Finx', 'Pierce'],
  Meeple: ['Belle', 'Gene', 'Mortis', 'Emz'],
  Squeak: ['Gene', 'Belle'],
  Surge: ['Otis', 'Belle', 'Gene'],
  Trunk: ['Colt', 'Spike', 'Emz'],
  Sam: ['Shelly', 'Spike', 'Otis'],
  Cordelius: ['Belle', 'Gene', 'Otis'],
  Emz: ['Gene', 'Piper'],
  Maisie: ['Belle', 'Gene'],
  Penny: ['Mortis', 'Gale', 'Gene'],
  Gale: ['Gene', 'Belle', 'Mortis'],
  Janet: ['Belle', 'Gene', 'Piper', 'Spike', 'Colt'],
  Amber: ['Spike', 'Otis', 'Gene'],
  Charlie: ['Gene', 'Belle', 'Spike'],
  Lily: ['Shelly', 'Spike', 'Emz'],
  Hank: ['Spike', 'Otis', 'Colt'],
  Moe: ['Belle', 'Gene', 'Piper'],
  Chester: ['Gene', 'Belle', 'Glowy', 'Pierce'],
  Finx: ['Belle', 'Gene', 'Piper'],
  Kenji: ['Shelly', 'Spike', 'Otis', 'Dynamike'],
  Ash: ['Shelly', 'Emz', 'Spike'],
  Rico: ['Piper', 'Gene', 'Spike'],
  Melodie: ['Gene', 'Belle', 'Otis'],
  Byron: ['Mortis', 'Crow', 'Dynamike', 'Gene', 'Glowy', 'Angelo'],
  Berry: ['Dynamike', 'Mortis'],
  Draco: ['Spike', 'Otis'],
  Lumi: ['Gene', 'Belle'],
  Shade: ['Mortis', 'Frank', 'Emz', 'Kit', 'Najia', 'Damian'],
  Glowy: ['Kit', 'Bull', 'Najia', 'Sirius'],
  Alli: ['Kit', 'Bull', 'Najia'],
  Kit: ['Gray', 'Damian', 'Sirius'],
  Colette: ['Gray', 'Damian', 'Sirius', 'Crow', 'Moe'],
  Ziggy: ['Gray', 'Damian', 'Sirius'],
  Stu: ['Crow', 'Meeple'],
  Colt: ['Gene', 'Glowy'],
  Bolt: ['Gene', 'Chester', 'Glowy', 'Shelly'],
  // Nouveaux contres
  Najia: ['Pierce', 'Crow'],
  Pearl: ['Angelo', 'Pierce'],
  Pierce: ['Sirius', 'Glowy', 'Mortis'],
  Angelo: ['Leon', 'Sirius']
};

const USER_FIRST_TURN = ['USER', 'AI', 'AI', 'USER', 'USER', 'AI'];
const AI_FIRST_TURN = ['AI', 'USER', 'USER', 'AI', 'AI', 'USER'];
const TURN = USER_FIRST_TURN;

// =========================================================================
// RÔLES STRATÉGIQUES
// =========================================================================
const SUPPORTS = new Set(['Gus', 'Pam', 'Ruffs', 'Poco', 'Byron', 'Lumi', 'Kit', 'Gray', 'Berry']); 

const MELEES = new Set([
  'Frank', 'Bull', 'Hank', 'Ash', 'El Primo', 'Mortis', 'Sam', 'Kenji', 'Lily', 'Rosa', 'Darryl', 'Draco', 'Trunk',
  'Shade', 'Damian', 'Bolt', 'Bibi', 'Edgar' // Ajout de Bibi et Edgar
]); 

const SNIPERS_POKE = new Set(['Piper', 'Belle', 'Brock', 'Colt', 'Rico', 'Maisie', 'Janet', 'Najia', 'Colette', 'Dynamike', 'Bo', 'Griff', 'Pierce', 'Angelo', 'Pearl']); // Ajout de Pierce, Angelo, Pearl

const DIVE_UNITS = new Set(['Mortis', 'Alli', 'Crow', 'Lily', 'Kenji', 'Melodie', 'Glowy', 'Sirius', 'Ziggy', 'Stu', 'Bolt', 'Edgar']); 

const DISABLES = new Set(['Spike', 'Otis', 'Rico', 'Cordelius', 'Bo', 'Gene', 'Chester', 'Mina']);

const NAME_LOOKUP = ALL.reduce((acc, name) => {
  acc.set(normalizeName(name), name);
  return acc;
}, new Map());

const NORMALIZED_BRAWLERS = ALL.map((name) => ({ name, normalized: normalizeName(name) })).sort(
  (a, b) => b.normalized.length - a.normalized.length
);

function normalizeName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function resolveBrawler(input) {
  const normalized = normalizeName(input);
  return NAME_LOOKUP.get(normalized) || null;
}

function findBrawlerInText(text) {
  const normalized = normalizeName(text);
  if (!normalized) return null;
  for (const entry of NORMALIZED_BRAWLERS) {
    if (normalized.includes(entry.normalized)) return entry.name;
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
    frankPenalty: 0.8,
    defeatCompositionPenalty: 1.5
  };
}

// Calcule la puissance de la meta (prend désormais en compte les gros buffs)
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

// =========================================================================
// ÉVALUATION DE LA STRATÉGIE
// =========================================================================
function evaluateDraft(picks, metaProfile = META_DEFAULT) {
  const cfg = getMetaConfig(metaProfile);
  let score = 0;

  for (const b of picks) {
    score += (MAP_PRIORITY[b] || 0) + metaPowerOf(b, metaProfile) + metaHpBonusOf(b);
  }

  const has = (x) => picks.includes(x);

  // --- ANALYSE MÉCANIQUE DES TRIOS HISTORIQUES ---
  
  // 1. Kit/Bull/Najia vs Glowy/Shade/Alli
  if (has('Kit') && has('Bull') && has('Najia')) score += 2.0;
  if (has('Glowy') && has('Shade') && has('Alli')) score -= cfg.defeatCompositionPenalty;

  // 2. Gray/Damian/Sirius vs Kit/Colette/Ziggy
  if (has('Gray') && has('Damian') && has('Sirius')) score += 2.0;
  if (has('Kit') && has('Colette') && has('Ziggy')) score -= cfg.defeatCompositionPenalty;

  // 3. Shelly/Dynamike/Bo vs Byron/Berry/Kenji
  if (has('Shelly') && has('Dynamike') && has('Bo')) score += 2.0;
  if (has('Byron') && has('Berry') && has('Kenji')) score -= 1.8;

  // 4. Crow/Chester/Meeple vs Otis/Stu/Colette
  if (has('Crow') && has('Chester') && has('Meeple')) score += 2.0;
  if (has('Otis') && has('Stu') && has('Colette')) score -= cfg.defeatCompositionPenalty;

  // 5. Glowy/Gene/Chester vs Bolt/Byron/Ruffs
  if (has('Glowy') && has('Gene') && has('Chester')) score += 2.0;
  if (has('Bolt') && has('Byron') && has('Ruffs')) score -= cfg.defeatCompositionPenalty;

  // 6. Moe/Finx/Sirius vs Colette/Brock/Griff
  if (has('Moe') && has('Finx') && has('Sirius')) score += 2.0;
  if (has('Colette') && has('Brock') && has('Griff')) score -= cfg.defeatCompositionPenalty;

  // 7. Crow/Pierce/Alli vs Najia/Chester/Griff (Pression à mi-distance + Ouverture de Dive)
  if (has('Crow') && has('Pierce') && has('Alli')) {
    score += 2.2;
  }
  if (has('Najia') && has('Chester') && has('Griff')) {
    score -= cfg.defeatCompositionPenalty; // Trop vulnérable à l'étouffement par poison + poke continu
  }

  // 8. Angelo/Pierce/Mina vs Byron/Pearl/Brock (Out-range chirurgical & burst)
  if (has('Angelo') && has('Pierce') && has('Mina')) {
    score += 2.2;
  }
  if (has('Byron') && has('Pearl') && has('Brock')) {
    score -= cfg.defeatCompositionPenalty; // Manque de mobilité face à du lourd poke à distance
  }

  // --- LOGIQUE GÉNÉRALE DES ARCHÉTYPES ---
  if (
    has('Tara') || has('Gene') || has('Belle') || has('Juju') || has('Mina') || has('Otis') ||
    has('Griff') || has('Meeple') || has('Squeak') || has('Spike') || has('Cordelius') ||
    has('Emz') || has('Maisie') || has('Moe') || has('Finx') || has('Rico') || has('Lumi') ||
    has('Charlie') || has('Najia') || has('Colette') || has('Dynamike') || has('Chester') || has('Pierce') || has('Angelo')
  ) {
    score += 1;
  }

  // Équilibre des rôles
  const diveCount = [...DIVE_UNITS].filter((d) => has(d)).length;
  const hasDive = diveCount > 0;
  if (hasDive) score += 1;

  if (diveCount >= 2) {
    const hasHardStop = has('Otis') || has('Spike') || has('Rico') || has('Cordelius') || has('Shelly') || has('Chester');
    if (!hasHardStop) score -= cfg.doubleDiveNoStopPenalty;
  }

  const supportCount = [...SUPPORTS].filter((s) => has(s)).length;
  if (supportCount > 0) score += 0.5;
  if (supportCount >= 2) score -= cfg.supportPressurePenalty; 

  const hasDisable = has('Spike') || has('Otis') || has('Rico') || has('Bo') || has('Gene') || has('Chester') || has('Mina');
  if (hasDisable) score += 1;
  if (hasDive && hasDisable) score += cfg.comebackBonus;

  if (has('Bull')) score += 0.2; // Remonté grâce aux buffs meta
  if (has('Hank')) score -= cfg.hankPenalty;
  if (has('Frank')) score -= cfg.frankPenalty;
  if (has('Kenji')) score -= cfg.kenjiPenalty;

  const meleeCount = [...MELEES].filter((m) => has(m)).length;
  if (meleeCount >= 2) score -= 1.5;

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

function createSession(ownerId, metaProfile = META_DEFAULT, options = {}) {
  const firstPick = options.firstPick || (Math.random() < 0.5 ? 'USER' : 'AI');
  const turnOrder = firstPick === 'AI' ? AI_FIRST_TURN : USER_FIRST_TURN;
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    ownerId, metaProfile, firstPick, turnOrder,
    isAIDraft: options.isAIDraft ?? true,
    phase: 'BAN', userBans: [], userPicks: [], aiPicks: [], step: 0,
    resultSaved: false, resultAnnounced: false
  };
}

function getAIBans(session) { return computeAIBans(session.metaProfile, new Set(session.userBans)); }
function getGlobalBans(session) { const aiBans = getAIBans(session); return new Set([...aiBans, ...session.userBans]); }
function getAvailable(session) { const bans = getGlobalBans(session); const taken = new Set([...session.userPicks, ...session.aiPicks]); return ALL.filter((b) => !bans.has(b) && !taken.has(b)); }
function getTurn(session) { const order = session.turnOrder || TURN; if (session.step >= order.length) return null; return order[session.step]; }
function isDraftDone(session) { const order = session.turnOrder || TURN; return session.step >= order.length; }

function applyUserBan(session, brawler) {
  if (session.phase !== 'BAN') return { ok: false, reason: 'phase' };
  if (session.userBans.length >= 3) return { ok: false, reason: 'limit' };
  const aiBans = getAIBans(session);
  if (aiBans.includes(brawler)) return { ok: false, reason: 'ai-ban' };
  if (session.userBans.includes(brawler)) return { ok: false, reason: 'duplicate' };
  session.userBans.push(brawler);
  if (session.userBans.length >= 3) { session.phase = 'DRAFT'; session.step = 0; }
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
    const pick = pickAI({ available, lastUserPick, aiPicks: session.aiPicks, metaProfile: session.metaProfile });
    if (!pick) break;
    session.aiPicks.push(pick);
    session.step += 1;
  }
}

function summarizeResult(session) {
  if (session.phase !== 'DRAFT' || !isDraftDone(session)) return null;
  const userScore = evaluateDraft(session.userPicks, session.metaProfile);
  const aiScore = evaluateDraft(session.aiPicks, session.metaProfile);
  let winner = 'draw';
  if (userScore > aiScore) winner = 'user';
  if (aiScore > userScore) winner = 'ai';
  return { userScore, aiScore, winner };
}

function estimateWinChance(userScore, aiScore) {
  const diff = userScore - aiScore;
  return Math.round((1 / (1 + Math.exp(-diff))) * 100);
}

function analyzePicks(picks, metaProfile) {
  return {
    mapPriority: picks.reduce((sum, b) => sum + (MAP_PRIORITY[b] || 0), 0),
    metaPower: picks.reduce((sum, b) => sum + metaPowerOf(b, metaProfile), 0),
    hpBonus: picks.reduce((sum, b) => sum + metaHpBonusOf(b), 0),
    supports: picks.filter((b) => SUPPORTS.has(b)).length,
    melees: picks.filter((b) => MELEES.has(b)).length,
    snipers: picks.filter((b) => SNIPERS_POKE.has(b)).length,
    disables: picks.filter((b) => DISABLES.has(b)).length,
    dives: picks.filter((b) => DIVE_UNITS.has(b)).length
  };
}

// =========================================================================
// EXPLICATIONS DE VICTOIRE STRUCTURÉES
// =========================================================================
function buildVictoryArguments(session) {
  const summary = summarizeResult(session);
  if (!summary) return null;

  if (summary.winner === 'draw') {
    return ['Scores très proches, aucun avantage net.', 'Compositions globalement équilibrées.'];
  }

  const winnerKey = summary.winner === 'user' ? 'user' : 'ai';
  const winnerPicks = winnerKey === 'user' ? session.userPicks : session.aiPicks;
  const loserPicks = winnerKey === 'user' ? session.aiPicks : session.userPicks;
  const winnerMetrics = analyzePicks(winnerPicks, session.metaProfile);
  const loserMetrics = analyzePicks(loserPicks, session.metaProfile);

  const reasons = [];
  const addReason = (score, text) => { if (score > 0) reasons.push({ score, text }); };

  // --- NOUVELLES RAISONS SÉQUENCES DUELS ---
  if (winnerPicks.includes('Crow') && winnerPicks.includes('Pierce') && winnerPicks.includes('Alli')) {
    addReason(2.5, 'Victoire par Étouffement : La pression de Crow et Pierce à mi-distance force le recul adverse, libérant l’espace pour le dive d’Alli.');
  }
  if (winnerPicks.includes('Angelo') && winnerPicks.includes('Pierce') && winnerPicks.includes('Mina')) {
    addReason(2.5, 'Victoire par Sniper Burst : Angelo et Pierce détruisent les lignes de vue adverses à très longue portée sous la protection de Mina.');
  }
  if (loserPicks.includes('Byron') && loserPicks.includes('Pearl') && loserPicks.includes('Brock')) {
    addReason(2.5, 'Faiblesse de portée/mobilité : Composition trop prévisible et linéaire, incapable de rivaliser avec des snipers à lourd burst.');
  }

  // Raisons historiques précédentes
  if (winnerPicks.includes('Glowy') && winnerPicks.includes('Gene') && winnerPicks.includes('Chester')) {
    addReason(2.5, 'Victoire par Rupture de Stratégie : Le Grab de Gene intercepte la cible clé ou brise les formations fermées.');
  }
  if (winnerPicks.includes('Shelly') && winnerPicks.includes('Dynamike') && winnerPicks.includes('Bo')) {
    addReason(2.5, 'Victoire par Équilibre & Anti-Dive : Shelly bloque l’assassin, Dynamike détruit les lignes arrières à couvert, Bo contrôle la zone.');
  }

  // Arguments liés aux Buffs Meta
  const winnerMetaCount = winnerPicks.filter(b => metaPowerOf(b, session.metaProfile) === 1).length;
  const loserMetaCount = loserPicks.filter(b => metaPowerOf(b, session.metaProfile) === 1).length;
  if (winnerMetaCount > loserMetaCount) {
    addReason(1.8, 'Avantage Meta substantiel : L’équipe profite pleinement des brawlers lourdement buffés (BUFFIES) sur cette version.');
  }

  addReason(winnerMetrics.mapPriority - loserMetrics.mapPriority, 'Priorité de map et de portée plus forte.');
  addReason(winnerMetrics.metaPower - loserMetrics.metaPower, 'Valeur intrinsèque des brawlers supérieure.');
  addReason(winnerMetrics.hpBonus - loserMetrics.hpBonus, 'Meilleure robustesse globale de l’équipe.');

  for (const loserPick of loserPicks) {
    const counters = COUNTER_BY_USER_PICK[loserPick] || [];
    for (const counter of counters) {
      if (winnerPicks.includes(counter)) {
        addReason(1.5, `${counter} neutralise mécaniquement le gameplay de ${loserPick}.`);
      }
    }
  }

  const sorted = reasons.sort((a, b) => b.score - a.score).map((item) => item.text);
  while (sorted.length < 3) sorted.push('Meilleure cohérence d’équipe sur la draft.');
  return sorted.slice(0, 3);
}

module.exports = {
  ALL, META_DEFAULT, TURN, resolveBrawler, findBrawlerInText, createSession,
  getAIBans, getAvailable, getTurn, isDraftDone, applyUserBan, applyUserPick,
  runAiPicks, summarizeResult, estimateWinChance, buildVictoryArguments
};
