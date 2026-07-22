'use strict';

// ============================================================
// world-country-leaderboard.js
// Classement des pays (Null's Brawl) dans un channel dédié.
// Réutilise fetchTierPlayers() de tier-leaderboard.js (déjà fiable)
// et agrège les points par pays, comme la commande !worldlb.
// Séparé en 2 embeds : Top 16 (qualifiés Worlds) + le reste.
// Stratégie : édition des messages existants (pas delete/resend).
// ============================================================

const { EmbedBuilder } = require('discord.js');
// IMPORTANT : on utilise fetchSiteTierLeaderboard (unified-bot.js) et non fetchTierPlayers
// (tier-leaderboard.js), car fetchTierPlayers est plafonné à TIER_LEADERBOARD_MAX_PLAYERS (100)
// et exclut les pays inconnus au lieu de fallback sur 'FR'. Ça causait un écart de data
// entre l'embed auto-refresh et la commande !worldlb, qui utilise fetchSiteTierLeaderboard.
let _fetchSiteTierLeaderboard = null;

function setFetchSiteTierLeaderboard(fn) {
  _fetchSiteTierLeaderboard = fn;
}

const WORLD_LEADERBOARD_CHANNEL_ID = '1528195571096096844';
const WORLD_LEADERBOARD_UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const WORLDS_QUALIFIED_COUNT = 16;

const REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });

// ── État interne ────────────────────────────────────────────
let _client = null;
let _guild = null;
let _leaderboardChannel = null;
let _intervalRef = null;

let _postedMessageIds = [];
let _isUpdating = false;

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

function getCountryName(countryCode) {
  const normalized = String(countryCode || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return 'Unknown';
  try {
    return REGION_NAMES.of(normalized) || normalized;
  } catch {
    return normalized;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Agrégation par pays (même formule que !worldlb) ──────────
// Points d'un pays = Top1 * (1/2)^0 + Top2 * (1/2)^1 + Top3 * (1/2)^2 + ...

function computeCountryRanking(players) {
  const countries = new Map();

  for (const player of players) {
    const rawCountryCode = String(player?.countryCode || '').trim().toUpperCase();
    // Même fallback que fetchSiteTierLeaderboard (unified-bot.js) : 'FR' si code invalide/absent,
    // pour rester cohérent avec !worldlb.
    const countryCode = /^[A-Z]{2}$/.test(rawCountryCode) ? rawCountryCode : 'FR';

    const points = Number(player?.points || 0);
    const entry = countries.get(countryCode) || {
      countryCode,
      playerPoints: [],
      players: 0,
    };

    entry.playerPoints.push(Number.isFinite(points) ? points : 0);
    entry.players += 1;
    countries.set(countryCode, entry);
  }

  for (const entry of countries.values()) {
    const sorted = entry.playerPoints.slice().sort((a, b) => b - a);
    const weightedTotal = sorted.reduce((sum, pts, idx) => sum + pts * Math.pow(0.5, idx), 0);
    entry.points = Math.round(weightedTotal * 100) / 100;
  }

  return Array.from(countries.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.players !== a.players) return b.players - a.players;
    return a.countryCode.localeCompare(b.countryCode);
  });
}

// ── Construction des embeds ──────────────────────────────────

function buildCountryEmbed(title, countries, startRank, color, footerText) {
  const embed = new EmbedBuilder().setTitle(title).setColor(color).setTimestamp(new Date());
  if (footerText) embed.setFooter({ text: footerText });

  const lines = countries.map((entry, idx) => {
    const rank = startRank + idx;
    const medal = rank === 1 ? ' 🏆' : rank === 2 ? ' 🥈' : rank === 3 ? ' 🥉' : '';
    const flag = toCountryFlag(entry.countryCode);
    const name = getCountryName(entry.countryCode);
    return `**#${rank}**${medal} ${flag} **${name}** • **${entry.points.toFixed(2)} pts** (${entry.players} player${entry.players > 1 ? 's' : ''})`;
  });

  const maxFieldLength = 1000;
  let currentFieldValue = '';
  let fieldIndex = 0;

  for (const line of lines) {
    const nextValue = currentFieldValue ? `${currentFieldValue}\n${line}` : line;
    if (nextValue.length > maxFieldLength && currentFieldValue) {
      embed.addFields({
        name: fieldIndex === 0 ? '\u200b' : '\u200b',
        value: currentFieldValue,
        inline: false,
      });
      currentFieldValue = line;
      fieldIndex++;
    } else {
      currentFieldValue = nextValue;
    }
  }

  if (currentFieldValue) {
    embed.addFields({ name: '\u200b', value: currentFieldValue, inline: false });
  }

  if (!lines.length) {
    embed.setDescription('No ranked countries yet.');
  }

  return embed;
}

function buildWorldEmbeds(countryRanking) {
  const qualified = countryRanking.slice(0, WORLDS_QUALIFIED_COUNT);
  const rest = countryRanking.slice(WORLDS_QUALIFIED_COUNT);

  const qualifiedEmbed = buildCountryEmbed(
    '🌍🏆 WORLD COUNTRY RANKING — WORLDS QUALIFIED (TOP 16) 🏆🌍',
    qualified,
    1,
    0xf1c40f,
    `Top ${WORLDS_QUALIFIED_COUNT} countries qualified for the Worlds — updated every 5 minutes`
  );

  const restEmbed = buildCountryEmbed(
    '🌍 WORLD COUNTRY RANKING — REMAINING COUNTRIES',
    rest,
    WORLDS_QUALIFIED_COUNT + 1,
    0x3498db,
    `${rest.length} more ranked countr${rest.length === 1 ? 'y' : 'ies'} — updated every 5 minutes`
  );

  return [qualifiedEmbed, restEmbed];
}

// ── Nettoyage complet du channel ─────────────────────────────

async function purgeChannelMessages() {
  if (!_leaderboardChannel) return;

  let deleted = 0;
  let hasMore = true;

  while (hasMore) {
    let messages;
    try {
      messages = await _leaderboardChannel.messages.fetch({ limit: 100 });
    } catch (err) {
      console.warn('[WorldLeaderboard] Erreur fetch messages pour purge:', err.message);
      break;
    }

    const botMessages = messages.filter((m) => m.author.id === _client.user?.id);

    if (botMessages.size === 0) {
      hasMore = false;
      break;
    }

    for (const m of botMessages.values()) {
      const ageMs = Date.now() - m.createdTimestamp;
      const tooOld = ageMs > 13 * 24 * 60 * 60 * 1000;

      if (tooOld) {
        await m.edit({ content: '\u200b', embeds: [] }).catch(() => null);
      } else {
        await m.delete().catch(() => null);
        await sleep(300);
      }
      deleted++;
    }

    hasMore = botMessages.size === messages.size && messages.size === 100;
  }

  console.log(`[WorldLeaderboard] Purge terminée : ${deleted} message(s) traités.`);
  _postedMessageIds = [];
}

async function postFreshEmbeds(embeds) {
  _postedMessageIds = [];

  for (const embed of embeds) {
    try {
      const sent = await _leaderboardChannel.send({ embeds: [embed] });
      _postedMessageIds.push(sent.id);
      await sleep(500);
    } catch (err) {
      console.error('[WorldLeaderboard] Échec envoi embed:', err.message);
    }
  }

  console.log(`[WorldLeaderboard] ${_postedMessageIds.length}/${embeds.length} embed(s) postés.`);
}

async function editExistingEmbeds(embeds) {
  if (_postedMessageIds.length !== embeds.length) {
    console.log(
      `[WorldLeaderboard] Nombre d'embeds changé (${_postedMessageIds.length} → ${embeds.length}), purge et repost.`
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
      console.warn(`[WorldLeaderboard] Impossible d'éditer le message ${msgId}:`, err.message);
      allEdited = false;
      break;
    }
  }

  if (!allEdited) {
    console.log('[WorldLeaderboard] Édition échouée sur au moins un message, purge et repost.');
    await purgeChannelMessages();
    await postFreshEmbeds(embeds);
  } else {
    console.log(`[WorldLeaderboard] ${embeds.length} embed(s) mis à jour par édition.`);
  }
}

async function recoverExistingMessages(embeds) {
  let fetchedMessages;
  try {
    fetchedMessages = await _leaderboardChannel.messages.fetch({ limit: 50 });
  } catch (err) {
    console.warn('[WorldLeaderboard] Impossible de fetch les messages existants:', err.message);
    await postFreshEmbeds(embeds);
    return;
  }

  const botMessages = fetchedMessages
    .filter(
      (m) =>
        m.author.id === _client.user?.id &&
        m.embeds?.length > 0 &&
        (m.embeds[0]?.title?.includes('WORLD COUNTRY RANKING'))
    )
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  if (botMessages.size === embeds.length) {
    _postedMessageIds = botMessages.map((m) => m.id);
    console.log(`[WorldLeaderboard] ${_postedMessageIds.length} message(s) récupérés, édition directe.`);
    await editExistingEmbeds(embeds);
  } else {
    console.log(
      `[WorldLeaderboard] Mauvais nombre de messages existants (${botMessages.size} vs ${embeds.length} attendus), purge et repost.`
    );
    await purgeChannelMessages();
    await postFreshEmbeds(embeds);
  }
}

// ── Point d'entrée principal ─────────────────────────────────

async function sendOrUpdateWorldLeaderboardEmbed() {
  if (!_client || !_guild) {
    return { updated: false, reason: 'not_initialized' };
  }

  if (_isUpdating) {
    console.log('[WorldLeaderboard] Mise à jour déjà en cours, skip.');
    return { updated: false, reason: 'already_updating' };
  }
  _isUpdating = true;

  try {
    if (!_leaderboardChannel) {
      _leaderboardChannel = await _guild.channels.fetch(WORLD_LEADERBOARD_CHANNEL_ID).catch(() => null);
    }

    if (!_leaderboardChannel?.isTextBased()) {
      console.warn('[WorldLeaderboard] Channel introuvable ou non textuel.');
      return { updated: false, reason: 'channel_not_found' };
    }

    if (!_fetchSiteTierLeaderboard) {
      console.warn('[WorldLeaderboard] fetchSiteTierLeaderboard non injecté (setFetchSiteTierLeaderboard jamais appelé).');
      return { updated: false, reason: 'fetch_fn_not_set' };
    }

    let players = [];
    try {
      players = await _fetchSiteTierLeaderboard();
    } catch (err) {
      console.warn('[WorldLeaderboard] Impossible de charger les joueurs:', err.message);
      return { updated: false, reason: `fetch_players_failed: ${err.message}` };
    }

    if (!players.length) {
      console.warn('[WorldLeaderboard] Aucun joueur avec des points.');
      return { updated: false, reason: 'no_players' };
    }

    const countryRanking = computeCountryRanking(players);

    if (!countryRanking.length) {
      console.warn('[WorldLeaderboard] Aucun pays classé.');
      return { updated: false, reason: 'no_countries' };
    }

    const embeds = buildWorldEmbeds(countryRanking);

    if (_postedMessageIds.length > 0) {
      await editExistingEmbeds(embeds);
    } else {
      await recoverExistingMessages(embeds);
    }

    return { updated: true, reason: 'ok' };
  } finally {
    _isUpdating = false;
  }
}

// ── Initialisation ───────────────────────────────────────────

function initWorldCountryLeaderboard(client, guild) {
  _client = client;
  _guild = guild;
  _postedMessageIds = [];
  _isUpdating = false;

  console.log('[WorldLeaderboard] Initialisation...');

  sendOrUpdateWorldLeaderboardEmbed().catch((err) =>
    console.error('[WorldLeaderboard] Erreur initiale:', err)
  );

  if (_intervalRef) clearInterval(_intervalRef);

  _intervalRef = setInterval(() => {
    sendOrUpdateWorldLeaderboardEmbed().catch((err) =>
      console.error('[WorldLeaderboard] Erreur pendant mise à jour:', err)
    );
  }, WORLD_LEADERBOARD_UPDATE_INTERVAL_MS);

  console.log(
    `[WorldLeaderboard] ✅ Initialisé (mise à jour toutes les ${WORLD_LEADERBOARD_UPDATE_INTERVAL_MS / 60000} minutes)`
  );
}

module.exports = {
  initWorldCountryLeaderboard,
  sendOrUpdateWorldLeaderboardEmbed, // Export pour permettre un refresh manuel (ex: !refreshworldlb)
  setFetchSiteTierLeaderboard // À appeler une fois au démarrage depuis unified-bot.js
};
