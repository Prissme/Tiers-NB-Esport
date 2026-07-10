'use strict';

const META_DEFAULT = 'STANDARD';

// META_POWER supprimé (plus de bonus BUFFIES)
const META_POWER = {};

const ALL = [
  'Shelly', 'Colt', 'Brock', 'Nita', 'Jessie', 'Bull', 'Rosa', 'El Primo', 'Poco', 'Darryl',
  'Piper', 'Belle', 'Gene', 'Spike', 'Crow', 'Leon', 'Max', 'Sandy', 'Mortis', 'Frank',
  'Buster', 'Tara', 'Pam', 'Gus', 'Juju', 'Ruffs', 'Carl', 'Mina', 'Otis', 'Alli',
  'Griff', 'Meeple', 'Squeak', 'Surge', 'Trunk', 'Shade', 'Sam', 'Cordelius', 'Emz', 'Maisie',
  'Penny', 'Gale', 'Janet', 'Amber', 'Charlie', 'Lily', 'Hank', 'Moe', 'Chester', 'Finx',
  'Kenji', 'Ash', 'Rico', 'Melodie', 'Byron', 'Draco', 'Lumi',
  'Glowy', 'Kit', 'Najia', 'Gray', 'Damian', 'Sirius', 'Colette', 'Ziggy',
  'Berry', 'Dynamike', 'Bo', 'Stu', 'Bolt',
  'Pierce', 'Angelo', 'Bibi', 'Pearl', 'Edgar', 'Lou', 'Fang', 'Nova', 'Meg', 'Clancy',
  'Barley', 'Doug', 'Sprout', 'Nani', 'Tick', 'Grom', 'Willow'
];

// BASE_PRIORITY = priorité par défaut, valable pour toute map sans données spécifiques.
// MAP_PRIORITY_OVERRIDES permet de surcharger ces valeurs pour une map donnée dès qu'on a
// assez de recul (retours communautaires, résultats de matchs) sans devoir tout redéfinir.
// Clé = buildMapKey(mode, mapName), ex: "gemgrab|hard rock mine".
const MAP_PRIORITY_OVERRIDES = {
  // "gemgrab|hard rock mine": { Tara: 2, Frank: 1 },
};

function buildMapKey(mode, name) {
  const m = String(mode || 'unknown').trim().toLowerCase();
  const n = String(name || 'unknown').trim().toLowerCase();
  return `${m}|${n}`;
}

function getMapPriority(brawler, mapKey) {
  const overrides = mapKey ? MAP_PRIORITY_OVERRIDES[mapKey] : null;
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, brawler)) {
    return overrides[brawler];
  }
  return MAP_PRIORITY[brawler] || 0;
}

const MAP_PRIORITY = {
  // Priorité 2 — top picks
  Piper: 2, Belle: 2, Tara: 2, Juju: 2, Mina: 2, Cordelius: 2, Moe: 2, Finx: 2, Lumi: 2,
  Kit: 2, Najia: 2, Gray: 2, Damian: 2, Sirius: 2, Colt: 2, Spike: 2, Bull: 2, Emz: 2,
  Shelly: 2, Dynamike: 2, Chester: 2, Crow: 2, Gene: 2, Bolt: 2, Pierce: 2, Angelo: 2, Charlie: 2, Nani: 2,

  // Priorité 1 — picks solides
  Bo: 1, Berry: 1, Stu: 1, Brock: 1, Sandy: 1, Rosa: 1, Mortis: 1, Buster: 1, Pam: 1,
  Gus: 1, Ruffs: 1, Carl: 1, Otis: 1, Alli: 1, Griff: 1, Meeple: 1, Squeak: 1, Surge: 1,
  Sam: 1, Maisie: 1, Penny: 1, Gale: 1, Janet: 1, Amber: 1, Lily: 1, Rico: 1, Pearl: 1,
  Edgar: 1, Nita: 1, Leon: 1, Kenji: 1, Melodie: 1, Byron: 1, Poco: 1, Draco: 1, Glowy: 1,
  Colette: 1, Ziggy: 1, Bibi: 1, Lou: 1, Fang: 1, Ash: 1, Nova: 1, Meg: 1, Shade: 1,
  Clancy: 1, Max: 1,
  // Ajouts manquants
  Jessie: 1, 'El Primo': 1, Darryl: 1, Barley: 1, Doug: 1, Sprout: 1, Tick: 1, Grom: 1, Willow: 1,

  // Priorité 0 — sous-optimaux
  Trunk: 0, Hank: 0, Frank: 0
};

const COUNTER_BY_USER_PICK = {
  Bull: ['Shelly', 'Spike', 'Edgar'],
  Rosa: ['Shelly', 'Spike'],
  'El Primo': ['Shelly', 'Spike'],
  Darryl: ['Shelly'],
  Jessie: ['Belle'],
  Nita: ['Belle'],
  Poco: ['Spike', 'Emz', 'Shade'],
  Piper: ['Gene', 'Angelo'],
  Brock: ['Gene', 'Moe', 'Sirius', 'Angelo', 'Pierce'],
  Mortis: ['Shelly', 'Spike', 'Nita', 'Charlie', 'Sam', 'Chester'],
  Frank: ['Shelly', 'Spike', 'Colt', 'Bull', 'Edgar', 'Colette'],
  Buster: ['Spike', 'Colt', 'Belle'],
  Tara: ['Gene', 'Belle'],
  Pam: ['Spike', 'Belle'],
  Gus: ['Mortis', 'Leon'],
  Juju: ['Gene', 'Belle'],
  Ruffs: ['Spike', 'Belle', 'Gene', 'Glowy', 'Pierce'],
  Carl: ['Shelly', 'Spike'],
  Mina: ['Gene', 'Belle', 'Crow'],
  Otis: ['Gene', 'Belle', 'Spike', 'Colt', 'Crow', 'Chester'],
  Alli: ['Shelly', 'Spike', 'Nita', 'Kit', 'Bull', 'Otis', 'Crow'],
  Griff: ['Belle', 'Gene', 'Moe', 'Finx', 'Pierce'],
  Meeple: ['Belle', 'Gene', 'Mortis', 'Emz', 'Crow', 'Shade', 'Griff'],
  Squeak: ['Gene', 'Belle', 'Kenji'],
  Surge: ['Otis', 'Belle', 'Gene'],
  Trunk: ['Colt', 'Spike', 'Emz'],
  Sam: ['Shelly', 'Spike', 'Otis'],
  Cordelius: ['Belle', 'Gene', 'Otis'],
  Emz: ['Gene', 'Piper', 'Moe'],
  Maisie: ['Belle', 'Gene'],
  Penny: ['Mortis', 'Gale', 'Gene'],
  Gale: ['Gene', 'Belle', 'Mortis'],
  Janet: ['Belle', 'Gene', 'Piper', 'Spike', 'Colt'],
  Amber: ['Spike', 'Otis', 'Gene', 'Ash'],
  Charlie: ['Gene', 'Belle', 'Spike'],
  Lily: ['Shelly', 'Spike', 'Emz', 'Ash'],
  Hank: ['Spike', 'Otis', 'Colt'],
  Moe: ['Belle', 'Gene', 'Piper', 'Kenji'],
  Chester: ['Gene', 'Belle', 'Glowy', 'Pierce', 'Bolt', 'Ash', 'Otis', 'Griff', 'Najia'],
  Finx: ['Belle', 'Gene', 'Piper', 'Ash', 'Crow'],
  Kenji: ['Shelly', 'Spike', 'Otis', 'Dynamike'],
  Ash: ['Shelly', 'Emz', 'Spike', 'Shade', 'Griff'],
  Rico: ['Piper', 'Gene', 'Spike'],
  Melodie: ['Gene', 'Belle', 'Otis'],
  Byron: ['Mortis', 'Crow', 'Dynamike', 'Gene', 'Glowy', 'Angelo'],
  Berry: ['Dynamike', 'Mortis', 'Byron'],
  Draco: ['Spike', 'Otis'],
  Lumi: ['Gene', 'Belle'],
  Shade: ['Mortis', 'Frank', 'Emz', 'Kit', 'Najia', 'Damian'],
  Glowy: ['Kit', 'Bull', 'Najia', 'Sirius', 'Bolt'],
  Kit: ['Gray', 'Damian', 'Sirius'],
  Colette: ['Gray', 'Damian', 'Sirius', 'Crow', 'Moe', 'Ash', 'Shade', 'Najia'],
  Ziggy: ['Gray', 'Damian', 'Sirius'],
  Stu: ['Crow', 'Meeple'],
  Colt: ['Gene', 'Glowy'],
  Bolt: ['Gene', 'Chester', 'Glowy', 'Shelly'],
  Najia: ['Pierce', 'Crow', 'Moe'],
  Pearl: ['Angelo', 'Pierce', 'Otis'],
  Pierce: ['Sirius', 'Glowy', 'Mortis', 'Bolt', 'Edgar'],
  Angelo: ['Leon', 'Sirius'],
  Leon: ['Charlie', 'Angelo', 'Crow'],
  Dynamike: ['Edgar', 'Mortis'],
  Fang: ['Surge', 'Shelly'],
  Bo: ['Nova', 'Colette', 'Emz'],
  Meg: ['Crow', 'Leon'],
  Edgar: ['Gale', 'Clancy', 'Shelly'],
  Max: ['Shelly', 'Crow'],
  Sandy: ['Gene', 'Otis'],
  Darryl: ['Shelly', 'Spike'],
  Jessie: ['Belle', 'Mortis'],
  Barley: ['Gene', 'Belle', 'Mortis', 'Edgar'],
  Doug: ['Mortis', 'Crow', 'Dynamike', 'Gene', 'Angelo'],
  Sprout: ['Gene', 'Belle', 'Mortis', 'Crow'],
  Nani: ['Gene', 'Angelo', 'Leon', 'Mortis'],
  Tick: ['Edgar', 'Mortis', 'Leon'],
  Grom: ['Edgar', 'Mortis', 'Gene'],
  Willow: ['Mortis', 'Leon', 'Angelo'],
};

const USER_FIRST_TURN = ['USER', 'AI', 'AI', 'USER', 'USER', 'AI'];
const AI_FIRST_TURN = ['AI', 'USER', 'USER', 'AI', 'AI', 'USER'];
const TURN = USER_FIRST_TURN;

// =========================================================================
// RÔLES STRATÉGIQUES & CONFIG
// =========================================================================
const SUPPORTS = new Set(['Gus', 'Pam', 'Ruffs', 'Poco', 'Byron', 'Lumi', 'Kit', 'Gray', 'Berry', 'Doug']);
const MELEES = new Set(['Frank', 'Bull', 'Hank', 'Ash', 'El Primo', 'Mortis', 'Sam', 'Kenji', 'Lily', 'Rosa', 'Darryl', 'Draco', 'Trunk', 'Shade', 'Damian', 'Bolt', 'Bibi', 'Edgar', 'Fang', 'Nova', 'Meg']);
const SNIPERS_POKE = new Set(['Piper', 'Belle', 'Brock', 'Colt', 'Rico', 'Maisie', 'Janet', 'Najia', 'Colette', 'Dynamike', 'Bo', 'Griff', 'Pierce', 'Angelo', 'Pearl', 'Charlie', 'Penny', 'Lou', 'Amber', 'Barley', 'Sprout', 'Nani', 'Tick', 'Grom']);
const DIVE_UNITS = new Set(['Mortis', 'Alli', 'Crow', 'Lily', 'Kenji', 'Melodie', 'Glowy', 'Sirius', 'Ziggy', 'Stu', 'Bolt', 'Edgar', 'Leon', 'Fang', 'Shade']);
const DISABLES = new Set(['Spike', 'Otis', 'Rico', 'Cordelius', 'Bo', 'Gene', 'Chester', 'Mina', 'Charlie', 'Lou', 'Emz', 'Gale', 'Sprout', 'Willow']);

// Structure : { byMap: Map<mapKey, {pairs, trios}>, global: {pairs, trios} }
// "global" agrège TOUTES les maps confondues et sert de repli quand une paire/trio n'a pas
// encore assez d'échantillons sur la map précise (cold start par map).
let COMMUNITY_DRAFTS_CACHE = { byMap: new Map(), global: { trios: new Map(), pairs: new Map() } };

const MIN_SAMPLES = { pairs: 2, trios: 3 };

// Cherche d'abord la stat sur la map précise (si assez d'échantillons), sinon retombe sur
// l'agrégat global toutes maps confondues. Retourne aussi la "source" pour debug/monitoring.
function getSynergyStat(kind, key, mapKey) {
  const mapBucket = mapKey ? COMMUNITY_DRAFTS_CACHE.byMap.get(mapKey) : null;
  const mapStat = mapBucket ? mapBucket[kind].get(key) : null;
  if (mapStat && mapStat.total >= MIN_SAMPLES[kind]) {
    return { stat: mapStat, source: 'map' };
  }
  const globalStat = COMMUNITY_DRAFTS_CACHE.global[kind].get(key);
  if (globalStat && globalStat.total >= MIN_SAMPLES[kind]) {
    return { stat: globalStat, source: 'global' };
  }
  return null;
}

const NAME_LOOKUP = ALL.reduce((acc, name) => { acc.set(normalizeName(name), name); return acc; }, new Map());
const NORMALIZED_BRAWLERS = ALL.map((name) => ({ name, normalized: normalizeName(name) })).sort((a, b) => b.normalized.length - a.normalized.length);

function normalizeName(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function resolveBrawler(input) { const normalized = normalizeName(input); return NAME_LOOKUP.get(normalized) || null; }

function findBrawlerInText(text) {
  const normalized = normalizeName(text);
  if (!normalized) return null;
  for (const entry of NORMALIZED_BRAWLERS) {
    if (normalized.includes(entry.normalized)) return entry.name;
  }
  return null;
}

// Cache communautaire Supabase
// Remplace ta fonction existante dans draft.js
// =========================================================================
// CACHE COMMUNAUTAIRE & INTELLIGENCE EN TEMPS RÉEL
// =========================================================================

// Cache mis à jour à la volée
async function refreshCommunityDraftsCache(supabaseClient) {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('draft_community_evals')
      .select('brawler_1, brawler_2, brawler_3, upvotes, downvotes, mid_votes, map_mode, map_name');
    if (error) throw error;

    const byMap = new Map();
    const global = { trios: new Map(), pairs: new Map() };

    const ensureMapBucket = (mapKey) => {
      if (!byMap.has(mapKey)) byMap.set(mapKey, { trios: new Map(), pairs: new Map() });
      return byMap.get(mapKey);
    };
    const accumulate = (bucket, kind, key, up, down, total) => {
      const current = bucket[kind].get(key) || { up: 0, down: 0, total: 0 };
      current.up += up;
      current.down += down;
      current.total += total;
      bucket[kind].set(key, current);
    };

    for (const row of data) {
      const up = row.upvotes || 0;
      const down = row.downvotes || 0;
      const mid = row.mid_votes || 0;
      const total = up + down + mid;

      if (total === 0) continue;

      const brawlers = [row.brawler_1, row.brawler_2, row.brawler_3].filter(Boolean);
      // Toutes les lignes ont une map (map_mode/map_name par défaut 'unknown' côté insertion),
      // donc "unknown|unknown" existe aussi comme une map à part entière dans byMap — ce n'est
      // pas grave, elle est simplement peu utile et se fera dépasser par le fallback global.
      const mapKey = buildMapKey(row.map_mode, row.map_name);
      const mapBucket = ensureMapBucket(mapKey);

      // 1. Enregistrement du Trio strict (par map + global)
      if (brawlers.length === 3) {
        const sortedTrio = [...brawlers].sort();
        const trioKey = `${sortedTrio[0]}_${sortedTrio[1]}_${sortedTrio[2]}`;
        accumulate(mapBucket, 'trios', trioKey, up, down, total);
        accumulate(global, 'trios', trioKey, up, down, total);
      }

      // 2. Décomposition en Duos (Paires) pour l'apprentissage en temps réel (par map + global)
      for (let i = 0; i < brawlers.length; i++) {
        for (let j = i + 1; j < brawlers.length; j++) {
          const sortedPair = [brawlers[i], brawlers[j]].sort();
          const pairKey = `${sortedPair[0]}_${sortedPair[1]}`;
          accumulate(mapBucket, 'pairs', pairKey, up, down, total);
          accumulate(global, 'pairs', pairKey, up, down, total);
        }
      }
    }

    COMMUNITY_DRAFTS_CACHE = { byMap, global };
    console.log(`[Draft AI] Cerveau temps réel synchronisé : ${byMap.size} maps, ${global.trios.size} trios et ${global.pairs.size} synergies de duos (global toutes maps).`);
  } catch (err) {
    console.error("[Draft AI] Erreur de synchronisation du cache:", err);
  }
}

function getMetaConfig() {
  return {
    comebackBonus: 1.5, doubleDiveNoStopPenalty: 1.0, supportPressurePenalty: 2.0,
    hankPenalty: 1.0, kenjiPenalty: 0.5, frankPenalty: 0.8, defeatCompositionPenalty: 1.5
  };
}

function metaPowerOf(brawler, metaProfile) { return 0; }

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
function evaluateDraft(picks, metaProfile = META_DEFAULT, mapKey = null) {
  const cfg = getMetaConfig(metaProfile);
  let score = 0;

  for (const b of picks) {
    score += getMapPriority(b, mapKey) + metaPowerOf(b, metaProfile) + metaHpBonusOf(b);
  }

  const has = (x) => picks.includes(x);

  // --- TRIOS HISTORIQUES MANUELS ---
  if (has('Kit') && has('Bull') && has('Najia')) score += 2.0;
  if (has('Glowy') && has('Shade') && has('Alli')) score -= cfg.defeatCompositionPenalty;
  if (has('Gray') && has('Damian') && has('Sirius')) score += 2.0;
  if (has('Kit') && has('Colette') && has('Ziggy')) score -= cfg.defeatCompositionPenalty;
  if (has('Shelly') && has('Dynamike') && has('Bo')) score += 2.0;
  if (has('Byron') && has('Berry') && has('Kenji')) score -= 1.8;
  if (has('Crow') && has('Chester') && has('Meeple')) score += 2.0;
  if (has('Otis') && has('Stu') && has('Colette')) score -= cfg.defeatCompositionPenalty;
  if (has('Glowy') && has('Gene') && has('Chester')) score += 2.0;
  if (has('Bolt') && has('Byron') && has('Ruffs')) score -= cfg.defeatCompositionPenalty;
  if (has('Moe') && has('Finx') && has('Sirius')) score += 2.0;
  if (has('Colette') && has('Brock') && has('Griff')) score -= cfg.defeatCompositionPenalty;
  if (has('Angelo') && has('Pierce') && has('Mina')) score += 2.2;
  if (has('Byron') && has('Pearl') && has('Brock')) score -= cfg.defeatCompositionPenalty;
  if (has('Edgar') && has('Crow') && has('Chester')) score += 2.5;
  if (has('Mina') && has('Stu') && has('Meeple')) score -= cfg.defeatCompositionPenalty;
  if (has('Bolt') && has('Penny') && has('Crow')) score += 2.5;
  if (has('Pierce') && has('Lou') && has('Chester')) score -= cfg.defeatCompositionPenalty;
  if (has('Charlie') && has('Leon') && has('Angelo')) score += 2.2;
  if (has('Gene') && has('Mortis') && has('Belle')) score -= cfg.defeatCompositionPenalty;
  if (has('Edgar') && has('Colette') && has('Surge')) score += 2.7;
  if (has('Dynamike') && has('Frank') && has('Fang')) score -= cfg.defeatCompositionPenalty;
  if (has('Ash') && has('Moe') && has('Najia')) score += 2.8;
  if (has('Colette') && has('Chester') && has('Lily')) score -= cfg.defeatCompositionPenalty;
  if (has('Ash') && has('Ruffs') && has('Otis')) score += 2.9;
  if (has('Chester') && has('Amber') && has('Finx')) score -= cfg.defeatCompositionPenalty;
  if (has('Kenji') && has('Crow') && has('Otis')) score += 2.8;
  if (has('Pearl') && has('Chester') && has('Alli')) score -= cfg.defeatCompositionPenalty;
  if (has('Shade') && has('Lumi') && has('Colette')) score += 2.6;
  if (has('Ash') && has('Poco') && has('Chester')) score -= cfg.defeatCompositionPenalty;
  if (has('Ash') && has('Griff') && has('Chester')) score += 2.7;
  if (has('Edgar') && has('Colette') && has('Meeple')) score -= cfg.defeatCompositionPenalty;
  if (has('Chester') && has('Shade') && has('Pierce')) score += 2.6;
  if (has('Colette') && has('Meeple') && has('Ruffs')) score -= cfg.defeatCompositionPenalty;
  if (has('Nova') && has('Crow') && has('Leon')) score += 2.8;
  if (has('Edgar') && has('Bo') && has('Meg')) score -= cfg.defeatCompositionPenalty;
  if (has('Kenji') && has('Colette') && has('Chester')) score += 2.6;
  if (has('Moe') && has('Bo') && has('Leon')) score -= cfg.defeatCompositionPenalty;
  if (has('Najia') && has('Emz') && has('Edgar')) score += 2.7;
  if (has('Chester') && has('Meeple') && has('Pierce')) score -= cfg.defeatCompositionPenalty;
  if (has('Moe') && has('Crow') && has('Finx')) score += 2.7;
  if (has('Najia') && has('Emz') && has('Chester')) score -= cfg.defeatCompositionPenalty;
  if (has('Sam') && has('Nova') && has('Crow')) score += 2.8;
  if (has('Sirius') && has('Najia') && has('Mortis')) score -= cfg.defeatCompositionPenalty;
  if (has('Chester') && has('Najia') && has('Kenji')) score += 2.6;
  if (has('Colette') && has('Mortis') && has('Squeak')) score -= cfg.defeatCompositionPenalty;
  if (has('Clancy') && has('Gale') && has('Byron')) score += 2.9;
  if (has('Edgar') && has('Berry') && has('Charlie')) score -= cfg.defeatCompositionPenalty;

  // --- CONNECTIVITÉ SUPABASE EN TEMPS RÉEL (DYNAMIC SYNERGIES) ---
  // Priorité aux stats de la map précise ; repli automatique sur le global toutes maps
  // confondues si la map n'a pas encore assez d'échantillons (cf. getSynergyStat).
  for (let i = 0; i < picks.length; i++) {
    for (let j = i + 1; j < picks.length; j++) {
      const sortedPair = [picks[i], picks[j]].sort();
      const pairKey = `${sortedPair[0]}_${sortedPair[1]}`;
      const found = getSynergyStat('pairs', pairKey, mapKey);
      if (found) {
        const ratio = found.stat.up / found.stat.total;
        if (ratio >= 0.65) score += 1.5;
        if (ratio <= 0.35) score -= 1.5;
      }
    }
  }

  if (picks.length === 3) {
    const sortedTrio = [...picks].sort();
    const trioKey = `${sortedTrio[0]}_${sortedTrio[1]}_${sortedTrio[2]}`;
    const found = getSynergyStat('trios', trioKey, mapKey);
    if (found) {
      const ratio = found.stat.up / found.stat.total;
      if (ratio >= 0.70) score += 2.0;
      if (ratio <= 0.35) score -= 2.5;
    }
  }

  // --- LOGIQUE ARCHÉTYPES ---
  if (has('Tara') || has('Gene') || has('Belle') || has('Juju') || has('Mina') || has('Otis') || has('Griff') || has('Meeple') || has('Squeak') || has('Spike') || has('Cordelius') || has('Emz') || has('Maisie') || has('Moe') || has('Finx') || has('Rico') || has('Lumi') || has('Charlie') || has('Najia') || has('Colette') || has('Dynamike') || has('Chester') || has('Pierce') || has('Angelo') || has('Amber')) {
    score += 1;
  }

  const diveCount = [...DIVE_UNITS].filter((d) => has(d)).length;
  if (diveCount > 0) score += 1;
  if (diveCount >= 2 && !['Otis', 'Spike', 'Rico', 'Cordelius', 'Shelly', 'Chester', 'Charlie', 'Lou', 'Emz', 'Gale'].some(x => has(x))) {
    score -= cfg.doubleDiveNoStopPenalty;
  }

  const supportCount = [...SUPPORTS].filter((s) => has(s)).length;
  if (supportCount > 0) score += 0.5;
  if (supportCount >= 2) score -= cfg.supportPressurePenalty;

  const hasDisable = ['Spike', 'Otis', 'Rico', 'Bo', 'Gene', 'Chester', 'Mina', 'Charlie', 'Lou', 'Emz', 'Gale'].some(x => has(x));
  if (hasDisable) score += 1;
  if (diveCount > 0 && hasDisable) score += cfg.comebackBonus;

  if (has('Bull')) score += 0.2;
  if (has('Hank')) score -= cfg.hankPenalty;
  if (has('Frank')) score -= cfg.frankPenalty;
  if (has('Kenji')) score -= cfg.kenjiPenalty;
  if (has('Ash') && !(has('Moe') && has('Najia')) && !(has('Ruffs') && has('Otis')) && !(has('Griff') && has('Chester'))) score -= 1.0;

  if ([...MELEES].filter((m) => has(m)).length >= 2) score -= 1.5;

  return score;
}

function pickAI({ available, lastUserPick, aiPicks = [], userPicks = [], metaProfile = META_DEFAULT, mapKey = null }) {
  if (!available.length) return '';

  let bestPick = available[0];
  let bestDelta = -Infinity;

  for (const candidate of available) {
    let currentAiPicks = [...aiPicks, candidate];
    let aiScore = evaluateDraft(currentAiPicks, metaProfile, mapKey);

    if (lastUserPick && (COUNTER_BY_USER_PICK[lastUserPick] || []).includes(candidate)) {
      aiScore += 2.5;
    }

    if (currentAiPicks.length < 3) {
      const remaining = available.filter(b => b !== candidate && !aiPicks.includes(b));
      let bestTrioBonus = 0;
      for (const b2 of remaining.slice(0, 15)) {
        const simulatedTrio = [...currentAiPicks, b2].slice(0, 3);
        if (simulatedTrio.length === 3) {
          const sorted = [...simulatedTrio].sort();
          const cacheKey = `${sorted[0]}_${sorted[1]}_${sorted[2]}`;
          const found = getSynergyStat('trios', cacheKey, mapKey);
          if (found) {
            const ratio = found.stat.up / found.stat.total;
            if (ratio >= 0.70) bestTrioBonus = Math.max(bestTrioBonus, 2.0);
            if (ratio <= 0.35) bestTrioBonus = Math.min(bestTrioBonus, -2.5);
          }
        }
      }
      aiScore += bestTrioBonus;
    }

    let userScore = evaluateDraft(userPicks, metaProfile, mapKey);
    let delta = aiScore - userScore;

    if (delta > bestDelta) {
      bestDelta = delta;
      bestPick = candidate;
    }
  }

  return bestPick;
}

function firstPickScore(brawler, metaProfile = META_DEFAULT, mapKey = null) {
  return getMapPriority(brawler, mapKey) + metaPowerOf(brawler, metaProfile) + metaHpBonusOf(brawler) + evaluateDraft([brawler], metaProfile, mapKey);
}

/**
 * Calcule les bans IA selon qui pick en premier.
 *
 * - Si l'IA pick en premier (firstPick === 'AI') :
 *   Elle banne les meilleurs picks adverses (ce qui gênerait l'utilisateur pour contrer son ouverture).
 *   Stratégie offensive : bannir les counters potentiels de ses futurs picks.
 *
 * - Si l'IA pick en second (firstPick === 'USER') :
 *   Elle banne les meilleurs picks du pool (pour forcer l'utilisateur à se rabattre sur du sous-optimal).
 *   Stratégie défensive : bannir les meilleures options du pool global.
 */
function computeAIBans(metaProfile, bannedByUser, firstPick = 'USER', mapKey = null) {
  const candidates = ALL.filter((b) => !bannedByUser.has(b));

  if (firstPick === 'AI') {
    // L'IA pick en premier : elle identifie ses 3 meilleurs picks potentiels,
    // puis banne les counters de ces picks parmi les brawlers disponibles.
    const topAIPicks = [...candidates]
      .map((b) => ({ b, s: firstPickScore(b, metaProfile, mapKey) }))
      .sort((x, y) => y.s - x.s)
      .slice(0, 5)
      .map((x) => x.b);

    // Collecter tous les counters potentiels des top picks IA
    const counterSet = new Set();
    for (const pick of topAIPicks) {
      for (const counter of (COUNTER_BY_USER_PICK[pick] || [])) {
        if (candidates.includes(counter)) counterSet.add(counter);
      }
    }

    // Parmi ces counters, bannir les 3 les mieux scorés
    const counterBans = [...counterSet]
      .map((b) => ({ b, s: firstPickScore(b, metaProfile, mapKey) }))
      .sort((x, y) => y.s - x.s)
      .slice(0, 3)
      .map((x) => x.b);

    // Si on a moins de 3 counters, compléter avec les meilleurs picks du pool
    if (counterBans.length < 3) {
      const alreadyBanned = new Set(counterBans);
      const fillers = [...candidates]
        .filter((b) => !alreadyBanned.has(b))
        .map((b) => ({ b, s: firstPickScore(b, metaProfile, mapKey) }))
        .sort((x, y) => y.s - x.s)
        .slice(0, 3 - counterBans.length)
        .map((x) => x.b);
      return [...counterBans, ...fillers];
    }

    return counterBans;
  }

  // firstPick === 'USER' : l'IA pick en second, stratégie défensive
  // Bannir les 3 meilleurs picks du pool pour affaiblir le choix adverse
  return [...candidates]
    .map((b) => ({ b, s: firstPickScore(b, metaProfile, mapKey) }))
    .sort((x, y) => y.s - x.s)
    .slice(0, 3)
    .map((x) => x.b);
}

function createSession(ownerId, metaProfile = META_DEFAULT, options = {}) {
  const firstPick = options.firstPick || (Math.random() < 0.5 ? 'USER' : 'AI');
  // La map (mode + nom) doit être connue AVANT le calcul des bans IA pour que ceux-ci
  // reflètent déjà le meta de cette map précise (fallback global si pas assez de données).
  const map = options.map || null;
  const mapKey = map ? buildMapKey(map.mode, map.name) : null;
  // Les bans IA sont calculés une seule fois, dès la création de la session,
  // AVANT que l'utilisateur ait banni quoi que ce soit. Ils ne dépendent donc
  // jamais des bans de l'utilisateur et ne doivent pas être affichés tant que
  // celui-ci n'a pas terminé ses 3 bans (voir unified-bot.js).
  const aiBans = computeAIBans(metaProfile, new Set(), firstPick, mapKey);
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    ownerId, metaProfile, firstPick, turnOrder: firstPick === 'AI' ? AI_FIRST_TURN : USER_FIRST_TURN,
    isAIDraft: options.isAIDraft ?? true,
    map, mapKey,
    phase: 'BAN', userBans: [], aiBans, userPicks: [], aiPicks: [], step: 0,
    resultSaved: false, resultAnnounced: false
  };
}

function getAIBans(session) {
  // Bans figés au moment de la création de la session (voir createSession).
  return session.aiBans || [];
}
function getGlobalBans(session) { return new Set([...getAIBans(session), ...session.userBans]); }
function getAvailable(session) { const bans = getGlobalBans(session); const taken = new Set([...session.userPicks, ...session.aiPicks]); return ALL.filter((b) => !bans.has(b) && !taken.has(b)); }
function getTurn(session) { const order = session.turnOrder || TURN; return session.step >= order.length ? null : order[session.step]; }
function isDraftDone(session) { return session.step >= (session.turnOrder || TURN).length; }

function applyUserBan(session, brawler) {
  // Un brawler banni côté IA peut aussi être banni côté joueur (ban commun
  // possible des deux côtés) : on ne bloque plus ce cas. On empêche
  // uniquement de bannir deux fois le même brawler soi-même.
  if (session.phase !== 'BAN' || session.userBans.length >= 3 || session.userBans.includes(brawler)) return { ok: false };
  session.userBans.push(brawler);
  if (session.userBans.length >= 3) { session.phase = 'DRAFT'; session.step = 0; }
  return { ok: true };
}

function applyUserPick(session, brawler) {
  if (session.phase !== 'DRAFT' || isDraftDone(session) || getTurn(session) !== 'USER' || !getAvailable(session).includes(brawler)) return { ok: false };
  session.userPicks.push(brawler);
  session.step += 1;
  return { ok: true };
}

function runAiPicks(session) {
  while (session.phase === 'DRAFT' && !isDraftDone(session) && getTurn(session) === 'AI') {
    const available = getAvailable(session);
    if (!available.length) break;
    const pick = pickAI({ available, lastUserPick: session.userPicks[session.userPicks.length - 1], aiPicks: session.aiPicks, userPicks: session.userPicks, metaProfile: session.metaProfile, mapKey: session.mapKey });
    if (!pick) break;
    session.aiPicks.push(pick);
    session.step += 1;
  }
}

function summarizeResult(session) {
  if (session.phase !== 'DRAFT' || !isDraftDone(session)) return null;
  const userScore = evaluateDraft(session.userPicks, session.metaProfile, session.mapKey);
  const aiScore = evaluateDraft(session.aiPicks, session.metaProfile, session.mapKey);
  return { userScore, aiScore, winner: userScore > aiScore ? 'user' : (aiScore > userScore ? 'ai' : 'draw') };
}

function estimateWinChance(userScore, aiScore) { return Math.round((1 / (1 + Math.exp(-(userScore - aiScore)))) * 100); }

function analyzePicks(picks, metaProfile, mapKey = null) {
  return {
    mapPriority: picks.reduce((sum, b) => sum + getMapPriority(b, mapKey), 0),
    metaPower: picks.reduce((sum, b) => sum + metaPowerOf(b, metaProfile), 0),
    hpBonus: picks.reduce((sum, b) => sum + metaHpBonusOf(b), 0),
    supports: picks.filter((b) => SUPPORTS.has(b)).length,
    melees: picks.filter((b) => MELEES.has(b)).length,
    snipers: picks.filter((b) => SNIPERS_POKE.has(b)).length,
    disables: picks.filter((b) => DISABLES.has(b)).length,
    dives: picks.filter((b) => DIVE_UNITS.has(b)).length
  };
}

function buildVictoryArguments(session) {
  const summary = summarizeResult(session);
  if (!summary || summary.winner === 'draw') return ['Compositions globalement équilibrées.'];

  const isUser = summary.winner === 'user';
  const winnerPicks = isUser ? session.userPicks : session.aiPicks;
  const loserPicks = isUser ? session.aiPicks : session.userPicks;
  const wM = analyzePicks(winnerPicks, session.metaProfile, session.mapKey);
  const lM = analyzePicks(loserPicks, session.metaProfile, session.mapKey);

  const reasons = [];
  const add = (score, text) => { if (score > 0) reasons.push({ score, text }); };

  if (winnerPicks.includes('Clancy') && winnerPicks.includes('Gale') && winnerPicks.includes('Byron')) add(2.9, 'Gale neutralise totalement les sauts d\'Edgar, tandis que Clancy monte en puissance sous les soins de Byron.');
  if (winnerPicks.includes('Sam') && winnerPicks.includes('Nova') && winnerPicks.includes('Crow')) add(2.8, 'Sam punit violemment le corps-à-corps tandis que le poison de Crow révèle les buissons.');
  if (winnerPicks.includes('Ash') && winnerPicks.includes('Ruffs') && winnerPicks.includes('Otis')) add(2.9, 'Les améliorations de Ruffs et le silence d\'Otis permettent à Ash (Carry) de détruire la frontline.');

  add(wM.mapPriority - lM.mapPriority, 'Meilleure priorité de map et contrôle des lignes à distance.');
  add(wM.metaPower - lM.metaPower, 'Valeur intrinsèque et puissance brute des brawlers supérieures.');
  add(wM.hpBonus - lM.hpBonus, 'Robustesse supérieure facilitant la tenue de zone.');

  for (const lp of loserPicks) {
    for (const wp of winnerPicks) {
      if ((COUNTER_BY_USER_PICK[lp] || []).includes(wp)) add(1.5, `${wp} neutralise mécaniquement le gameplay de ${lp}.`);
    }
  }

  return reasons.sort((a, b) => b.score - a.score).map(r => r.text).slice(0, 3);
}

module.exports = {
  ALL, META_DEFAULT, TURN, resolveBrawler, findBrawlerInText, createSession,
  getAIBans, getAvailable, getTurn, isDraftDone, applyUserBan, applyUserPick,
  runAiPicks, summarizeResult, estimateWinChance, buildVictoryArguments, refreshCommunityDraftsCache,
  buildMapKey
};
