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

// Emojis custom Discord (depuis unified-bot.js)
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

  // 1. Récupérer la saison active
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

  // 2. Récupérer les points de tier
  let pointsQuery = _supabase
    .from('lfn_player_tier_points')
    .select('player_id, points, tier, updated_at, created_at')
    .order('points', { ascending: false });

  if (activeSeasonId) {
    pointsQuery = pointsQuery.eq('season_id', activeSeasonId);
  }

  const { data: pointsRows, error: pointsError } = await pointsQuery;

  if (pointsError) {
    throw new Error(`[TierLeaderboard] Erreur points: ${pointsError.message}`);
  }

  const allRows = pointsRows || [];
  const filtered = allRows.filter((row) => Number(row.points || 0) > 0);

  console.log(`[TierLeaderboard] ${allRows.length} lignes points, ${filtered.length} avec points > 0`);

  if (!filtered.length) return [];

  const playerIds = [...new Set(filtered.map((r) => String(r.player_id)))];

  // 3. Fetch players + profiles + teams en parallèle
  const [playersResult, profilesResult, teamsResult] = await Promise.all([
    _supabase
      .from('players')
      .select('id, name, discord_id, active')
      .in('id', playerIds),
    _supabase
      .from('lfn_player_profiles')
      .select('player_id, country_code, team_id')
      .in('player_id', playerIds),
    _supabase
      .from('lfn_teams')
      .select('id, name, tag')
      .eq('is_active', true),
  ]);

  if (playersResult.error) {
    console.warn('[TierLeaderboard] Erreur players:', playersResult.error.message);
  }
  if (profilesResult.error) {
    console.warn('[TierLeaderboard] Erreur profiles:', profilesResult.error.message);
  }
  if (teamsResult.error) {
    console.warn('[TierLeaderboard] Erreur teams:', teamsResult.error.message);
  }

  const players = playersResult.data || [];
  const profiles = profilesResult.data || [];
  const teams = teamsResult.data || [];

  console.log(`[TierLeaderboard] ${players.length} players, ${profiles.length} profiles, ${teams.length} teams`);

  // Maps avec String() sur toutes les clés pour éviter les problèmes de type UUID
  const playerMap = new Map(players.map((p) => [String(p.id), p]));
  const profileMap = new Map(profiles.map((p) => [String(p.player_id), p]));
  const teamMap = new Map(teams.map((t) => [String(t.id), t]));

  // 4. Calcul de la pénalité d'inactivité (identique à l'API site)
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

  // 5. Assembler les joueurs
  const result = filtered
    .map((row) => {
      const pid = String(row.player_id);
      const player = playerMap.get(pid);

      if (!player) {
        console.warn(`[TierLeaderboard] Player introuvable pour player_id=${pid}`);
        return null;
      }

      // Exclure les joueurs inactifs
      if (player.active === false) return null;

      const profile = profileMap.get(pid);

      // Validation stricte du country_code
      const rawCountry = String(profile?.country_code || '').trim().toUpperCase();
      const countryCode = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : 'FR';

      const team = profile?.team_id ? teamMap.get(String(profile.team_id)) : null;

      const basePoints = Number(row.points || 0);
      const lastUpdate = row.updated_at || row.created_at || null;
      const penalty = computeInactivityPenalty(lastUpdate);
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

  // Tri : points décroissants, puis tier, puis nom
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
      const flag = toCountryFlag(player.countryCode);
      const pts = Math.round(player.points);
      const teamTag = player.teamTag ? ` \`[${player.teamTag}]\`` : '';
      const medal =
        globalRank === 1 ? ' 🏆' :
        globalRank === 2 ? ' 🥈' :
        globalRank === 3 ? ' 🥉' : '';

      // Emoji tier + drapeau pays + nom + team + points
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

  // Résolution du channel
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

  // Tentative d'édition du message existant
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

  // Nettoyage des anciens messages du bot
  try {
    const recent = await _leaderboardChannel.messages.fetch({ limit: 20 });
    const oldMessages = recent.filter(
      (m) =>
        m.author.id === _client.user?.id &&
        m.embeds?.[0]?.title?.includes('Classement Tier')
    );
    await Promise.all(oldMessages.map((m) => m.delete().catch(() => null)));
  } catch (_) {}

  // Envoi du nouveau message
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

  // siteBaseUrl gardé pour compatibilité de signature mais non utilisé
  console.log('[TierLeaderboard] Initialisation (mode Supabase direct)...');

  // Premier envoi
  sendOrUpdateTierLeaderboardEmbed().catch((err) =>
    console.error('[TierLeaderboard] Erreur initiale:', err)
  );

  // Mise à jour périodique
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
