'use strict';

// ============================================================
// tier-leaderboard.js
// Module autonome — classement Tier dans un channel dédié
// Fetch direct Supabase (pas de HTTP vers le site externe)
// ============================================================

const { EmbedBuilder } = require('discord.js');

const TIER_LEADERBOARD_CHANNEL_ID = '1505250882231468102';
const TIER_LEADERBOARD_UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const TIER_LEADERBOARD_MAX_PLAYERS = 100;

const TIER_ORDER = ['Tier S', 'Tier A', 'Tier B', 'Tier C', 'Tier D', 'Tier E'];

const TIER_EMOJIS = {
  'Tier S': '<:TierS:1482724565657321594>',
  'Tier A': '<:TierA:1482724563874877592>',
  'Tier B': '<:TierB:1482724560993259651>',
  'Tier C': '<:TierC:1482724558015299706>',
  'Tier D': '<:TierD:1482724568387817484>',
  'Tier E': '<:TierE:1482723920309260439>',
};

const TIER_COLOR_MAP = {
  'Tier S': 0xf1c40f,
  'Tier A': 0xe74c3c,
  'Tier B': 0xe67e22,
  'Tier C': 0x9b59b6,
  'Tier D': 0x3498db,
  'Tier E': 0x2ecc71,
};

// État interne
let _client = null;
let _guild = null;
let _supabase = null;
let _leaderboardChannel = null;
let _intervalRef = null;

// ── Helpers ────────────────────────────────────────────────

function toCountryFlag(countryCode) {
  const normalized = String(countryCode || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return '🏳️';
  try {
    return String.fromCodePoint(
      ...Array.from(normalized).map((c) => 0x1F1E6 - 65 + c.charCodeAt(0))
    );
  } catch {
    return '🏳️';
  }
}

// ── Fetch direct Supabase ──────────────────────────────────

async function fetchTierPlayers() {
  if (!_supabase) {
    throw new Error('[TierLeaderboard] Supabase client non initialisé.');
  }

  // 1. Saison active
  const { data: seasonData, error: seasonError } = await _supabase
    .from('lfn_seasons')
    .select('id')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (seasonError) {
    console.warn('[TierLeaderboard] Erreur saison:', seasonError.message);
  }

  const activeSeasonId = seasonData?.id || null;
  console.log('[TierLeaderboard] Saison active:', activeSeasonId || 'aucune');

  // 2. Points + player + profile en UNE SEULE requête avec join embed Supabase
  const PAGE_SIZE = 1000;
  let allRows = [];
  let from = 0;
  let keepFetching = true;

  while (keepFetching) {
    let query = _supabase
      .from('lfn_player_tier_points')
      .select(`
        player_id,
        points,
        tier,
        players!inner(id, name, discord_id, active),
        lfn_player_profiles(player_id, country_code, team_id)
      `)
      .order('points', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (activeSeasonId) {
      query = query.eq('season_id', activeSeasonId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[TierLeaderboard] Join embed échoué, fallback requêtes séparées:', error.message);
      return fetchTierPlayersFallback(activeSeasonId);
    }

    const rows = data || [];
    allRows = allRows.concat(rows);

    if (rows.length < PAGE_SIZE) {
      keepFetching = false;
    } else {
      from += PAGE_SIZE;
    }
  }

  console.log(`[TierLeaderboard] ${allRows.length} lignes récupérées via join embed.`);

  const filtered = allRows.filter((row) => Number(row.points || 0) > 0);
  console.log(`[TierLeaderboard] ${filtered.length} avec points > 0`);

  if (!filtered.length) return [];

  // Teams séparément (peu de données, pas besoin de pagination)
  const { data: teams, error: teamsError } = await _supabase
    .from('lfn_teams')
    .select('id, name, tag')
    .eq('is_active', true);

  if (teamsError) {
    console.warn('[TierLeaderboard] Erreur teams:', teamsError.message);
  }

  const teamMap = new Map((teams || []).map((t) => [String(t.id), t]));

  const result = filtered
    .map((row) => {
      const player = row.players;
      if (!player || player.active === false) return null;

      const profileRaw = row.lfn_player_profiles;
      const profile = Array.isArray(profileRaw)
        ? profileRaw[0] || null
        : profileRaw || null;

      const rawCountry = String(profile?.country_code || '').trim().toUpperCase();
      const countryCode = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null;

      const team = profile?.team_id ? teamMap.get(String(profile.team_id)) : null;

      const points = Number(row.points || 0);

      if (points <= 0) return null;

      return {
        id: String(row.player_id),
        name: player.name || 'Joueur',
        discordId: player.discord_id || null,
        tier: row.tier || 'Tier E',
        points,
        countryCode,
        teamTag: team?.tag || null,
      };
    })
    .filter(Boolean);

  const tierRank = {
    'Tier S': 6, 'Tier A': 5, 'Tier B': 4,
    'Tier C': 3, 'Tier D': 2, 'Tier E': 1,
  };

  result.sort(
    (a, b) =>
      b.points - a.points ||
      (tierRank[b.tier] ?? 0) - (tierRank[a.tier] ?? 0) ||
      a.name.localeCompare(b.name, 'fr')
  );

  const top = result.slice(0, TIER_LEADERBOARD_MAX_PLAYERS);

  console.log(`[TierLeaderboard] ${result.length} joueurs éligibles, ${top.length} affichés (top ${TIER_LEADERBOARD_MAX_PLAYERS}).`);
  return top;
}

// ── Fallback : requêtes séparées avec pagination ───────────

async function fetchTierPlayersFallback(activeSeasonId) {
  console.log('[TierLeaderboard] Utilisation du fallback requêtes séparées...');

  const PAGE_SIZE = 1000;

  let allPointsRows = [];
  let from = 0;
  let keepFetching = true;

  while (keepFetching) {
    let query = _supabase
      .from('lfn_player_tier_points')
      .select('player_id, points, tier')
      .order('points', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (activeSeasonId) {
      query = query.eq('season_id', activeSeasonId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Erreur points fallback: ${error.message}`);

    const rows = data || [];
    allPointsRows = allPointsRows.concat(rows);
    keepFetching = rows.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  const filtered = allPointsRows.filter((row) => Number(row.points || 0) > 0);
  if (!filtered.length) return [];

  const playerIds = [...new Set(filtered.map((r) => String(r.player_id)))];

  async function fetchAllPages(table, selectCols, filterCol, filterVals) {
    const BATCH = 500;
    let results = [];
    for (let i = 0; i < filterVals.length; i += BATCH) {
      const batch = filterVals.slice(i, i + BATCH);
      const { data, error } = await _supabase
        .from(table)
        .select(selectCols)
        .in(filterCol, batch);
      if (error) console.warn(`[TierLeaderboard] Erreur ${table}:`, error.message);
      results = results.concat(data || []);
    }
    return results;
  }

  const [players, profiles, teams] = await Promise.all([
    fetchAllPages('players', 'id, name, discord_id, active', 'id', playerIds),
    fetchAllPages('lfn_player_profiles', 'player_id, country_code', 'player_id', playerIds),
    _supabase.from('lfn_teams').select('id, name, tag').eq('is_active', true).then(r => r.data || []),
  ]);

  console.log(`[TierLeaderboard] Fallback: ${players.length} players, ${profiles.length} profiles`);

  const playerMap = new Map(players.map((p) => [String(p.id), p]));
  const profileMap = new Map(profiles.map((p) => [String(p.player_id), p]));
  const teamMap = new Map(teams.map((t) => [String(t.id), t]));

  const result = filtered
    .map((row) => {
      const pid = String(row.player_id);
      const player = playerMap.get(pid);
      if (!player || player.active === false) return null;

      const profile = profileMap.get(pid);
      const rawCountry = String(profile?.country_code || '').trim().toUpperCase();
      const countryCode = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null;

      const points = Number(row.points || 0);

      if (points <= 0) return null;

      return {
        id: pid,
        name: player.name || 'Joueur',
        discordId: player.discord_id || null,
        tier: row.tier || 'Tier E',
        points,
        countryCode,
        teamTag: null,
      };
    })
    .filter(Boolean);

  const tierRank = {
    'Tier S': 6, 'Tier A': 5, 'Tier B': 4,
    'Tier C': 3, 'Tier D': 2, 'Tier E': 1,
  };

  result.sort(
    (a, b) =>
      b.points - a.points ||
      (tierRank[b.tier] ?? 0) - (tierRank[a.tier] ?? 0) ||
      a.name.localeCompare(b.name, 'fr')
  );

  const top = result.slice(0, TIER_LEADERBOARD_MAX_PLAYERS);

  console.log(`[TierLeaderboard] Fallback: ${result.length} joueurs éligibles, ${top.length} affichés (top ${TIER_LEADERBOARD_MAX_PLAYERS}).`);
  return top;
}

// ── Construction de l'embed ────────────────────────────────

/**
 * Construit un embed pour un tier spécifique
 */
function buildTierEmbed(tier, players, startRank, totalPlayers, isFirstTier = false) {
  const tierEmoji = TIER_EMOJIS[tier] || '🏷️';
  const embedColor = TIER_COLOR_MAP[tier] || 0xf1c40f;
  
  let embedTitle;
  if (isFirstTier) {
    embedTitle = "🏆 TOP 100 BEST NULL'S BRAWL PLAYERS 🏆";
  } else {
    embedTitle = `${tierEmoji} ${tier}`;
  }

  const embed = new EmbedBuilder()
    .setTitle(embedTitle)
    .setColor(embedColor);

  // Description uniquement sur le premier embed
  if (isFirstTier) {
    embed.setDescription(
      `**${totalPlayers} joueurs classés** — mis à jour toutes les 5 minutes`
    );
  }

  const lines = [];
  let currentRank = startRank;

  for (const player of players) {
    const flag = player.countryCode ? toCountryFlag(player.countryCode) : '';
    const pts = Math.round(player.points);
    const teamTag = player.teamTag ? ` \`[${player.teamTag}]\`` : '';
    const medal =
      currentRank === 1 ? ' 🏆' :
      currentRank === 2 ? ' 🥈' :
      currentRank === 3 ? ' 🥉' : '';

    lines.push(`**#${currentRank}**${medal} ${flag} **${player.name}**${teamTag} • **${pts} pts**`);
    currentRank++;
  }

  // Regrouper les lignes dans des fields de max 1000 caractères
  const maxFieldLength = 1000;
  let currentFieldValue = '';
  let fieldIndex = 0;

  for (const line of lines) {
    const nextValue = currentFieldValue ? `${currentFieldValue}\n${line}` : line;
    if (nextValue.length > maxFieldLength && currentFieldValue) {
      const fieldName = fieldIndex === 0 ? `${tierEmoji} ${tier} — ${players.length} joueur${players.length > 1 ? 's' : ''}` : '\u200b';
      embed.addFields({ name: fieldName, value: currentFieldValue, inline: false });
      currentFieldValue = line;
      fieldIndex++;
    } else {
      currentFieldValue = nextValue;
    }
  }

  if (currentFieldValue) {
    const fieldName = fieldIndex === 0 ? `${tierEmoji} ${tier} — ${players.length} joueur${players.length > 1 ? 's' : ''}` : '\u200b';
    embed.addFields({ name: fieldName, value: currentFieldValue, inline: false });
  }

  return embed;
}

// ── Envoi / mise à jour du message ─────────────────────────

async function sendOrUpdateTierLeaderboardEmbed() {
  if (!_client || !_guild) return;

  if (!_leaderboardChannel) {
    _leaderboardChannel = await _guild.channels.fetch(TIER_LEADERBOARD_CHANNEL_ID).catch(() => null);
  }

  if (!_leaderboardChannel?.isTextBased()) {
    console.warn('[TierLeaderboard] Channel introuvable ou non textuel');
    return;
  }

  let players = [];
  try {
    players = await fetchTierPlayers();
  } catch (err) {
    console.warn('[TierLeaderboard] Impossible de charger les joueurs:', err.message);
    return;
  }

  if (!players.length) {
    console.warn('[TierLeaderboard] Aucun joueur avec des points.');
    return;
  }

  // Regrouper les joueurs par tier
  const playersByTier = new Map();
  for (const tier of TIER_ORDER) {
    playersByTier.set(tier, []);
  }

  for (const player of players) {
    const tier = player.tier || 'Tier E';
    if (!playersByTier.has(tier)) playersByTier.set(tier, []);
    playersByTier.get(tier).push(player);
  }

  const totalPlayers = players.length;
  const embeds = [];
  let currentRank = 1;
  let isFirstTier = true;

  for (const tier of TIER_ORDER) {
    const tierPlayers = playersByTier.get(tier) || [];
    if (tierPlayers.length === 0) continue;

    const embed = buildTierEmbed(tier, tierPlayers, currentRank, totalPlayers, isFirstTier);
    embeds.push(embed);
    currentRank += tierPlayers.length;
    isFirstTier = false;
  }

  // Nettoyage anciens messages du bot
  try {
    const recent = await _leaderboardChannel.messages.fetch({ limit: 50 });
    const old = recent.filter(
      (m) =>
        m.author.id === _client.user?.id &&
        m.embeds?.length > 0 &&
        (
          m.embeds[0]?.title?.includes("BEST NULL'S BRAWL PLAYERS") ||
          m.embeds[0]?.title?.includes('Tier')
        )
    );
    await Promise.all(old.map((m) => m.delete().catch(() => null)));
  } catch (_) {}

  // Envoyer un embed par tier
  for (const embed of embeds) {
    await _leaderboardChannel.send({ embeds: [embed] }).catch((err) => {
      console.error('[TierLeaderboard] Échec envoi:', err.message);
    });
  }

  console.log(`[TierLeaderboard] ${embeds.length} embed(s) postés pour ${totalPlayers} joueurs (1 embed par tier).`);
}

// ── Refresh des pseudos Discord ────────────────────────────

/**
 * Resynchronise le nom des joueurs du classement (top TIER_LEADERBOARD_MAX_PLAYERS)
 * avec leur pseudo Discord actuel (surnom serveur ou nom d'utilisateur global),
 * puis republie l'embed avec les noms à jour.
 * Retourne un résumé { total, updated, unchanged, notFound, noDiscordId, errors }.
 */
async function refreshDiscordNames() {
  if (!_guild || !_supabase) {
    throw new Error('[TierLeaderboard] Module non initialisé.');
  }

  const players = await fetchTierPlayers();

  const summary = { total: players.length, updated: 0, unchanged: 0, notFound: 0, noDiscordId: 0, errors: 0 };

  for (const player of players) {
    if (!player.discordId) {
      summary.noDiscordId++;
      continue;
    }

    let member = null;
    try {
      member = await _guild.members.fetch(player.discordId);
    } catch (_) {
      member = null;
    }

    if (!member) {
      summary.notFound++;
      continue;
    }

    const freshName = member.displayName || member.user?.username || null;
    if (!freshName || freshName === player.name) {
      summary.unchanged++;
      continue;
    }

    const { error } = await _supabase
      .from('players')
      .update({ name: freshName })
      .eq('id', player.id);

    if (error) {
      console.warn(`[TierLeaderboard] Échec mise à jour pseudo pour ${player.id}:`, error.message);
      summary.errors++;
      continue;
    }

    summary.updated++;
  }

  if (summary.updated > 0) {
    await sendOrUpdateTierLeaderboardEmbed().catch((err) =>
      console.error('[TierLeaderboard] Erreur en republiant après refresh des pseudos:', err)
    );
  }

  console.log(
    `[TierLeaderboard] Refresh pseudos: ${summary.updated} mis à jour, ${summary.unchanged} inchangés, ${summary.notFound} introuvables, ${summary.noDiscordId} sans discordId, ${summary.errors} erreurs (sur ${summary.total}).`
  );

  return summary;
}

// ── Initialisation ──────────────────────────────────────────

function initTierLeaderboard(client, guild, supabase, siteBaseUrl = null) {
  _client = client;
  _guild = guild;
  _supabase = supabase;

  console.log('[TierLeaderboard] Initialisation (mode Supabase direct)...');

  sendOrUpdateTierLeaderboardEmbed().catch((err) =>
    console.error('[TierLeaderboard] Erreur initiale:', err)
  );

  if (_intervalRef) clearInterval(_intervalRef);

  _intervalRef = setInterval(() => {
    sendOrUpdateTierLeaderboardEmbed().catch((err) =>
      console.error('[TierLeaderboard] Erreur pendant mise à jour:', err)
    );
  }, TIER_LEADERBOARD_UPDATE_INTERVAL_MS);

  console.log(
    `[TierLeaderboard] ✅ Initialisé (mise à jour toutes les ${TIER_LEADERBOARD_UPDATE_INTERVAL_MS / 60000} minutes)`
  );
}

module.exports = { initTierLeaderboard, refreshDiscordNames };
