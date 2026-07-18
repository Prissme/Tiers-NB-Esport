'use strict';

// ============================================================
// tier-leaderboard.js
// Module autonome — classement Tier dans un channel dédié
// Fetch direct Supabase (pas de HTTP vers le site externe)
// Stratégie : édition des messages existants (pas delete/resend)
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

// ── État interne ────────────────────────────────────────────
let _client = null;
let _guild = null;
let _supabase = null;
let _leaderboardChannel = null;
let _intervalRef = null;

// IDs des messages actuellement postés dans le channel (persistés en mémoire)
// Permet d'éditer plutôt que delete+resend, et d'éviter les messages > 14 jours
let _postedMessageIds = [];
let _isUpdating = false; // verrou pour éviter les runs simultanés

// ── Helpers ─────────────────────────────────────────────────

function toCountryFlag(countryCode) {
  const normalized = String(countryCode || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return '🏳️';
  try {
    return String.fromCodePoint(
      ...Array.from(normalized).map((c) => 0x1f1e6 - 65 + c.charCodeAt(0))
    );
  } catch {
    return '🏳️';
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Fetch Supabase ───────────────────────────────────────────

async function fetchTierPlayers() {
  if (!_supabase) throw new Error('[TierLeaderboard] Supabase client non initialisé.');

  // 1. Saison active
  const { data: seasonData, error: seasonError } = await _supabase
    .from('lfn_seasons')
    .select('id')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (seasonError) console.warn('[TierLeaderboard] Erreur saison:', seasonError.message);

  const activeSeasonId = seasonData?.id || null;
  console.log('[TierLeaderboard] Saison active:', activeSeasonId || 'aucune');

  // 2. Points + player + profile via join embed
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
        players!inner(
          id, name, discord_id, active,
          lfn_player_profiles(player_id, country_code, team_id)
        )
      `)
      .order('points', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (activeSeasonId) query = query.eq('season_id', activeSeasonId);

    const { data, error } = await query;

    if (error) {
      console.warn('[TierLeaderboard] Join embed échoué, fallback requêtes séparées:', error.message);
      return fetchTierPlayersFallback(activeSeasonId);
    }

    const rows = data || [];
    allRows = allRows.concat(rows);
    keepFetching = rows.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  console.log(`[TierLeaderboard] ${allRows.length} lignes récupérées via join embed.`);

  const filtered = allRows.filter((row) => Number(row.points || 0) > 0);
  console.log(`[TierLeaderboard] ${filtered.length} avec points > 0`);

  if (!filtered.length) return [];

  const { data: teams, error: teamsError } = await _supabase
    .from('lfn_teams')
    .select('id, name, tag')
    .eq('is_active', true);

  if (teamsError) console.warn('[TierLeaderboard] Erreur teams:', teamsError.message);

  const teamMap = new Map((teams || []).map((t) => [String(t.id), t]));

  let debugProfilesFound = 0;
  let debugProfilesMissing = 0;

  const result = filtered
    .map((row) => {
      const player = row.players;
      if (!player || player.active === false) return null;

      const profileRaw = player.lfn_player_profiles;
      const profile = Array.isArray(profileRaw) ? profileRaw[0] || null : profileRaw || null;

      if (profile && profile.country_code) debugProfilesFound++;
      else debugProfilesMissing++;

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

  console.log(`[TierLeaderboard] Profils pays: ${debugProfilesFound} trouvés, ${debugProfilesMissing} manquants (join embed).`);

  const tierRank = { 'Tier S': 6, 'Tier A': 5, 'Tier B': 4, 'Tier C': 3, 'Tier D': 2, 'Tier E': 1 };

  result.sort(
    (a, b) =>
      b.points - a.points ||
      (tierRank[b.tier] ?? 0) - (tierRank[a.tier] ?? 0) ||
      a.name.localeCompare(b.name, 'fr')
  );

  const top = result.slice(0, TIER_LEADERBOARD_MAX_PLAYERS);
  console.log(`[TierLeaderboard] ${result.length} joueurs éligibles, ${top.length} affichés.`);
  return top;
}

// ── Fallback requêtes séparées ───────────────────────────────

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

    if (activeSeasonId) query = query.eq('season_id', activeSeasonId);

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
      const { data, error } = await _supabase.from(table).select(selectCols).in(filterCol, batch);
      if (error) console.warn(`[TierLeaderboard] Erreur ${table}:`, error.message);
      results = results.concat(data || []);
    }
    return results;
  }

  const [players, profiles, teams] = await Promise.all([
    fetchAllPages('players', 'id, name, discord_id, active', 'id', playerIds),
    fetchAllPages('lfn_player_profiles', 'player_id, country_code, team_id', 'player_id', playerIds),
    _supabase.from('lfn_teams').select('id, name, tag').eq('is_active', true).then((r) => r.data || []),
  ]);

  const playerMap = new Map(players.map((p) => [String(p.id), p]));
  const profileMap = new Map(profiles.map((p) => [String(p.player_id), p]));
  const teamMap = new Map(teams.map((t) => [String(t.id), t]));

  console.log(
    `[TierLeaderboard] Fallback: ${playerIds.length} playerIds, ${profiles.length} lignes profils récupérées, ${profileMap.size} dans la map.`
  );
  if (profiles.length > 0) {
    console.log('[TierLeaderboard] Exemple profil brut:', JSON.stringify(profiles[0]));
  }

  let debugProfilesFound = 0;
  let debugProfilesMissing = 0;

  const result = filtered
    .map((row) => {
      const pid = String(row.player_id);
      const player = playerMap.get(pid);
      if (!player || player.active === false) return null;

      const profile = profileMap.get(pid);
      if (profile && profile.country_code) debugProfilesFound++;
      else debugProfilesMissing++;

      const rawCountry = String(profile?.country_code || '').trim().toUpperCase();
      const countryCode = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null;
      const team = profile?.team_id ? teamMap.get(String(profile.team_id)) : null;
      const points = Number(row.points || 0);

      if (points <= 0) return null;

      return {
        id: pid,
        name: player.name || 'Joueur',
        discordId: player.discord_id || null,
        tier: row.tier || 'Tier E',
        points,
        countryCode,
        teamTag: team?.tag || null,
      };
    })
    .filter(Boolean);

  console.log(`[TierLeaderboard] Profils pays: ${debugProfilesFound} trouvés, ${debugProfilesMissing} manquants (fallback).`);

  const tierRank = { 'Tier S': 6, 'Tier A': 5, 'Tier B': 4, 'Tier C': 3, 'Tier D': 2, 'Tier E': 1 };

  result.sort(
    (a, b) =>
      b.points - a.points ||
      (tierRank[b.tier] ?? 0) - (tierRank[a.tier] ?? 0) ||
      a.name.localeCompare(b.name, 'fr')
  );

  const top = result.slice(0, TIER_LEADERBOARD_MAX_PLAYERS);
  console.log(`[TierLeaderboard] Fallback: ${result.length} éligibles, ${top.length} affichés.`);
  return top;
}

// ── Construction des embeds ──────────────────────────────────

function buildTierEmbed(tier, players, startRank, totalPlayers, isFirstTier = false) {
  const tierEmoji = TIER_EMOJIS[tier] || '🏷️';
  const embedColor = TIER_COLOR_MAP[tier] || 0xf1c40f;

  const embedTitle = isFirstTier
    ? "🏆 TOP 100 BEST NULL'S BRAWL PLAYERS 🏆"
    : `${tierEmoji} ${tier}`;

  const embed = new EmbedBuilder().setTitle(embedTitle).setColor(embedColor);

  if (isFirstTier) {
    embed.setDescription(`**${totalPlayers} joueurs classés** — mis à jour toutes les 5 minutes`);
  }

  const lines = [];
  let currentRank = startRank;

  for (const player of players) {
    const flag = toCountryFlag(player.countryCode);
    const pts = Math.round(player.points);
    const teamTag = player.teamTag ? ` \`[${player.teamTag}]\`` : '';
    const medal =
      currentRank === 1 ? ' 🏆' : currentRank === 2 ? ' 🥈' : currentRank === 3 ? ' 🥉' : '';

    lines.push(`**#${currentRank}**${medal} ${flag} **${player.name}**${teamTag} • **${pts} pts**`);
    currentRank++;
  }

  const maxFieldLength = 1000;
  let currentFieldValue = '';
  let fieldIndex = 0;

  for (const line of lines) {
    const nextValue = currentFieldValue ? `${currentFieldValue}\n${line}` : line;
    if (nextValue.length > maxFieldLength && currentFieldValue) {
      const fieldName =
        fieldIndex === 0
          ? `${tierEmoji} ${tier} — ${players.length} joueur${players.length > 1 ? 's' : ''}`
          : '\u200b';
      embed.addFields({ name: fieldName, value: currentFieldValue, inline: false });
      currentFieldValue = line;
      fieldIndex++;
    } else {
      currentFieldValue = nextValue;
    }
  }

  if (currentFieldValue) {
    const fieldName =
      fieldIndex === 0
        ? `${tierEmoji} ${tier} — ${players.length} joueur${players.length > 1 ? 's' : ''}`
        : '\u200b';
    embed.addFields({ name: fieldName, value: currentFieldValue, inline: false });
  }

  return embed;
}

// ── Nettoyage complet du channel ─────────────────────────────
// Supprime TOUS les messages du bot dans le channel, par batch de 100,
// en ignorant les erreurs sur les messages > 14 jours (non supprimables).

async function purgeChannelMessages() {
  if (!_leaderboardChannel) return;

  let deleted = 0;
  let hasMore = true;

  while (hasMore) {
    let messages;
    try {
      messages = await _leaderboardChannel.messages.fetch({ limit: 100 });
    } catch (err) {
      console.warn('[TierLeaderboard] Erreur fetch messages pour purge:', err.message);
      break;
    }

    const botMessages = messages.filter((m) => m.author.id === _client.user?.id);

    if (botMessages.size === 0) {
      hasMore = false;
      break;
    }

    for (const m of botMessages.values()) {
      const ageMs = Date.now() - m.createdTimestamp;
      const tooOld = ageMs > 13 * 24 * 60 * 60 * 1000; // > 13 jours

      if (tooOld) {
        // Impossible à supprimer via l'API Discord (limite 14 jours)
        // On écrase le contenu à la place
        await m.edit({ content: '\u200b', embeds: [] }).catch(() => null);
      } else {
        await m.delete().catch(() => null);
        await sleep(300); // évite le rate limit sur les suppressions
      }
      deleted++;
    }

    // Si tous les messages fetchés étaient du bot, il peut en rester
    hasMore = botMessages.size === messages.size && messages.size === 100;
  }

  console.log(`[TierLeaderboard] Purge terminée : ${deleted} message(s) traités.`);
  _postedMessageIds = [];
}

// ── Envoi initial (post fresh) ───────────────────────────────

async function postFreshEmbeds(embeds) {
  _postedMessageIds = [];

  for (const embed of embeds) {
    try {
      const sent = await _leaderboardChannel.send({ embeds: [embed] });
      _postedMessageIds.push(sent.id);
      await sleep(500); // petit délai entre les envois
    } catch (err) {
      console.error('[TierLeaderboard] Échec envoi embed:', err.message);
      // On continue quand même pour les autres tiers
    }
  }

  console.log(`[TierLeaderboard] ${_postedMessageIds.length}/${embeds.length} embed(s) postés.`);
}

// ── Mise à jour par édition ──────────────────────────────────

async function editExistingEmbeds(embeds) {
  // Si le nombre de tiers a changé, on repart de zéro
  if (_postedMessageIds.length !== embeds.length) {
    console.log(
      `[TierLeaderboard] Nombre d'embeds changé (${_postedMessageIds.length} → ${embeds.length}), purge et repost.`
    );
    await purgeChannelMessages();
    await postFreshEmbeds(embeds);
    return;
  }

  let allEdited = true;

  for (let i = 0; i < embeds.length; i++) {
    const msgId = _postedMessageIds[i];

    try {
      const msg = await _leaderboardChannel.messages.fetch(msgId);
      await msg.edit({ embeds: [embeds[i]] });
      await sleep(300);
    } catch (err) {
      console.warn(`[TierLeaderboard] Impossible d'éditer le message ${msgId}:`, err.message);
      allEdited = false;
      break;
    }
  }

  if (!allEdited) {
    // Un message a disparu (supprimé manuellement, etc.) → repost complet
    console.log('[TierLeaderboard] Édition échouée sur au moins un message, purge et repost.');
    await purgeChannelMessages();
    await postFreshEmbeds(embeds);
  } else {
    console.log(`[TierLeaderboard] ${embeds.length} embed(s) mis à jour par édition.`);
  }
}

// ── Point d'entrée principal ─────────────────────────────────

async function sendOrUpdateTierLeaderboardEmbed() {
  if (!_client || !_guild) return;

  // Verrou : évite les exécutions simultanées (ex: init + premier interval)
  if (_isUpdating) {
    console.log('[TierLeaderboard] Mise à jour déjà en cours, skip.');
    return;
  }
  _isUpdating = true;

  try {
    if (!_leaderboardChannel) {
      _leaderboardChannel = await _guild.channels.fetch(TIER_LEADERBOARD_CHANNEL_ID).catch(() => null);
    }

    if (!_leaderboardChannel?.isTextBased()) {
      console.warn('[TierLeaderboard] Channel introuvable ou non textuel.');
      return;
    }

    // Récupération des joueurs
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

    // Construction des embeds par tier
    const playersByTier = new Map(TIER_ORDER.map((t) => [t, []]));

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

      embeds.push(buildTierEmbed(tier, tierPlayers, currentRank, totalPlayers, isFirstTier));
      currentRank += tierPlayers.length;
      isFirstTier = false;
    }

    // Édition si on a déjà des messages, sinon post initial
    if (_postedMessageIds.length > 0) {
      await editExistingEmbeds(embeds);
    } else {
      // Première fois ou après un redémarrage : cherche les messages existants du bot
      await recoverExistingMessages(embeds);
    }
  } finally {
    _isUpdating = false;
  }
}

// ── Récupération des messages existants après redémarrage ────
// Tente de retrouver les messages déjà postés pour les éditer
// plutôt que de repartir d'un post + suppression systématique.

async function recoverExistingMessages(embeds) {
  let fetchedMessages;
  try {
    fetchedMessages = await _leaderboardChannel.messages.fetch({ limit: 50 });
  } catch (err) {
    console.warn('[TierLeaderboard] Impossible de fetch les messages existants:', err.message);
    await postFreshEmbeds(embeds);
    return;
  }

  const botMessages = fetchedMessages
    .filter(
      (m) =>
        m.author.id === _client.user?.id &&
        m.embeds?.length > 0 &&
        (m.embeds[0]?.title?.includes("BEST NULL'S BRAWL PLAYERS") ||
          m.embeds[0]?.title?.includes('Tier'))
    )
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp); // du plus ancien au plus récent

  if (botMessages.size === embeds.length) {
    // On a exactement le bon nombre de messages → on récupère leurs IDs
    _postedMessageIds = botMessages.map((m) => m.id);
    console.log(`[TierLeaderboard] ${_postedMessageIds.length} message(s) récupérés, édition directe.`);
    await editExistingEmbeds(embeds);
  } else {
    // Nombre différent (tiers ajoutés/supprimés, redémarrage après bug, etc.)
    console.log(
      `[TierLeaderboard] Mauvais nombre de messages existants (${botMessages.size} vs ${embeds.length} attendus), purge et repost.`
    );
    await purgeChannelMessages();
    await postFreshEmbeds(embeds);
  }
}

// ── Refresh des pseudos Discord ──────────────────────────────

async function refreshDiscordNames() {
  if (!_guild || !_supabase) throw new Error('[TierLeaderboard] Module non initialisé.');

  const players = await fetchTierPlayers();
  const summary = {
    total: players.length,
    updated: 0,
    unchanged: 0,
    notFound: 0,
    noDiscordId: 0,
    errors: 0,
  };

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
      console.warn(`[TierLeaderboard] Échec pseudo ${player.id}:`, error.message);
      summary.errors++;
      continue;
    }

    summary.updated++;
  }

  if (summary.updated > 0) {
    await sendOrUpdateTierLeaderboardEmbed().catch((err) =>
      console.error('[TierLeaderboard] Erreur repost après refresh pseudos:', err)
    );
  }

  console.log(
    `[TierLeaderboard] Refresh pseudos: ${summary.updated} mis à jour, ${summary.unchanged} inchangés, ` +
      `${summary.notFound} introuvables, ${summary.noDiscordId} sans discordId, ${summary.errors} erreurs.`
  );

  return summary;
}

// ── Initialisation ───────────────────────────────────────────

function initTierLeaderboard(client, guild, supabase) {
  _client = client;
  _guild = guild;
  _supabase = supabase;
  _postedMessageIds = [];
  _isUpdating = false;

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
