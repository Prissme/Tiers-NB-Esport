'use strict';

// ============================================================
// tier-leaderboard.js
// Module autonome — classement Tier dans un channel dédié
// Fetch direct Supabase (pas de HTTP vers le site externe)
// ============================================================

const { EmbedBuilder } = require('discord.js');

const TIER_LEADERBOARD_CHANNEL_ID = '1505250882231468102';
const TIER_LEADERBOARD_UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

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
let _leaderboardMessageId = null;
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
  //    On utilise les foreign key relationships pour tout récupérer d'un coup
  //    et on paginait avec range() pour dépasser la limite de 1000
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
        updated_at,
        created_at,
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
      // Si le join embed échoue (pas de FK déclarée), on fallback sur requêtes séparées
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

  // Pénalité inactivité
  const INACTIVITY_RULES = [
    { days: 60, penalty: 10 },
    { days: 30, penalty: 5 },
    { days: 14, penalty: 2 },
  ];

  function computeInactivityPenalty(lastUpdate) {
    if (!lastUpdate) return 0;
    const parsed = new Date(lastUpdate);
    if (isNaN(parsed.getTime())) return 0;
    const daysSince = Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
    const rule = INACTIVITY_RULES.find((r) => daysSince >= r.days);
    return rule?.penalty ?? 0;
  }

  const result = filtered
    .map((row) => {
      const player = row.players;
      if (!player || player.active === false) return null;

      // lfn_player_profiles peut être null ou un tableau (selon la relation)
      const profileRaw = row.lfn_player_profiles;
      const profile = Array.isArray(profileRaw)
        ? profileRaw[0] || null
        : profileRaw || null;

      const rawCountry = String(profile?.country_code || '').trim().toUpperCase();
      const countryCode = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null;

      const team = profile?.team_id ? teamMap.get(String(profile.team_id)) : null;

      const basePoints = Number(row.points || 0);
      const lastUpdate = row.updated_at || row.created_at || null;
      const penalty = computeInactivityPenalty(lastUpdate);
      const adjustedPoints = Math.max(0, basePoints - penalty);

      if (adjustedPoints <= 0) return null;

      return {
        id: String(row.player_id),
        name: player.name || 'Joueur',
        discordId: player.discord_id || null,
        tier: row.tier || 'Tier E',
        points: adjustedPoints,
        countryCode, // null si pas de profil → pas de drapeau fallback FR
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

  console.log(`[TierLeaderboard] ${result.length} joueurs prêts à afficher.`);
  return result;
}

// ── Fallback : requêtes séparées avec pagination ───────────

async function fetchTierPlayersFallback(activeSeasonId) {
  console.log('[TierLeaderboard] Utilisation du fallback requêtes séparées...');

  const PAGE_SIZE = 1000;

  // Fetch tous les points avec pagination
  let allPointsRows = [];
  let from = 0;
  let keepFetching = true;

  while (keepFetching) {
    let query = _supabase
      .from('lfn_player_tier_points')
      .select('player_id, points, tier, updated_at, created_at')
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

  // Fetch players + profiles + teams en parallèle (avec pagination si besoin)
  async function fetchAllPages(table, selectCols, filterCol, filterVals) {
    const BATCH = 500; // IN() limité en URL
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

  const INACTIVITY_RULES = [
    { days: 60, penalty: 10 },
    { days: 30, penalty: 5 },
    { days: 14, penalty: 2 },
  ];

  function computeInactivityPenalty(lastUpdate) {
    if (!lastUpdate) return 0;
    const parsed = new Date(lastUpdate);
    if (isNaN(parsed.getTime())) return 0;
    const daysSince = Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
    const rule = INACTIVITY_RULES.find((r) => daysSince >= r.days);
    return rule?.penalty ?? 0;
  }

  const result = filtered
    .map((row) => {
      const pid = String(row.player_id);
      const player = playerMap.get(pid);
      if (!player || player.active === false) return null;

      const profile = profileMap.get(pid);
      const rawCountry = String(profile?.country_code || '').trim().toUpperCase();
      const countryCode = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null;

      const team = null;

      const basePoints = Number(row.points || 0);
      const penalty = computeInactivityPenalty(row.updated_at || row.created_at);
      const adjustedPoints = Math.max(0, basePoints - penalty);

      if (adjustedPoints <= 0) return null;

      return {
        id: pid,
        name: player.name || 'Joueur',
        discordId: player.discord_id || null,
        tier: row.tier || 'Tier E',
        points: adjustedPoints,
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

  console.log(`[TierLeaderboard] Fallback: ${result.length} joueurs prêts.`);
  return result;
}

// ── Construction de l'embed ────────────────────────────────

function buildTierLeaderboardEmbed(players) {
  const byTier = new Map();
  for (const tier of TIER_ORDER) byTier.set(tier, []);

  for (const player of players) {
    const tier = player.tier || 'Tier E';
    if (!byTier.has(tier)) byTier.set(tier, []);
    byTier.get(tier).push(player);
  }

  const topTier = players[0]?.tier || 'Tier S';
  const embedColor = TIER_COLOR_MAP[topTier] || 0xf1c40f;

  const embed = new EmbedBuilder()
    .setTitle('🏆 Classement Tier — LFN Esports')
    .setDescription(
      `**${players.length} joueurs classés** — mis à jour toutes les 5 minutes\n` +
      `[Voir le classement complet](https://www.lfn-esports.fr/classement)`
    )
    .setColor(embedColor)
    .setTimestamp(new Date())
    .setFooter({ text: 'LFN Esports • lfn-esports.fr' });

  let globalRank = 0;

  for (const tier of TIER_ORDER) {
    const tierPlayers = byTier.get(tier) || [];
    if (!tierPlayers.length) continue;

    const tierEmoji = TIER_EMOJIS[tier] || '🏷️';
    const fieldTitle = `${tierEmoji} ${tier} — ${tierPlayers.length} joueur${tierPlayers.length > 1 ? 's' : ''}`;

    const lines = tierPlayers.map((player) => {
      globalRank += 1;
      const flag = player.countryCode ? toCountryFlag(player.countryCode) : '';
      const pts = Math.round(player.points);
      const teamTag = player.teamTag ? ` \`[${player.teamTag}]\`` : '';
      const medal =
        globalRank === 1 ? ' 🏆' :
        globalRank === 2 ? ' 🥈' :
        globalRank === 3 ? ' 🥉' : '';

      return `**#${globalRank}**${medal} ${tierEmoji} ${flag} **${player.name}**${teamTag} • **${pts} pts**`;
    });

    // Split si le field dépasse 1000 chars
    const chunks = [];
    let current = '';
    for (const line of lines) {
      const next = current ? `${current}\n${line}` : line;
      if (next.length > 1000) {
        chunks.push(current);
        current = line;
      } else {
        current = next;
      }
    }
    if (current) chunks.push(current);

    chunks.forEach((chunk, idx) => {
      embed.addFields({
        name: idx === 0 ? fieldTitle : `↳ ${tier} (suite)`,
        value: chunk,
        inline: false,
      });
    });
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

  const embed = buildTierLeaderboardEmbed(players);

  if (_leaderboardMessageId) {
    try {
      const existing = await _leaderboardChannel.messages.fetch(_leaderboardMessageId);
      await existing.edit({ embeds: [embed] });
      console.log('[TierLeaderboard] Embed mis à jour avec succès.');
      return;
    } catch {
      console.warn('[TierLeaderboard] Message existant introuvable, création d\'un nouveau.');
      _leaderboardMessageId = null;
    }
  }

  // Nettoyage anciens messages du bot
  try {
    const recent = await _leaderboardChannel.messages.fetch({ limit: 20 });
    const old = recent.filter(
      (m) => m.author.id === _client.user?.id && m.embeds?.[0]?.title?.includes('Classement Tier')
    );
    await Promise.all(old.map((m) => m.delete().catch(() => null)));
  } catch (_) {}

  const sent = await _leaderboardChannel.send({ embeds: [embed] }).catch((err) => {
    console.error('[TierLeaderboard] Échec envoi:', err);
    return null;
  });

  if (sent) {
    _leaderboardMessageId = sent.id;
    console.log('[TierLeaderboard] Nouveau message posté - ID:', sent.id);
  }
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

module.exports = { initTierLeaderboard };
