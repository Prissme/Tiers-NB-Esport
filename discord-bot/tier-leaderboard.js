'use strict';

// ============================================================
//  tier-leaderboard.js
//  Module autonome — classement Tier dans un channel dédié
//  Intégration : voir les instructions tout en bas du fichier
// ============================================================

const { EmbedBuilder } = require('discord.js');

const TIER_LEADERBOARD_CHANNEL_ID = '1505250882231468102';
const TIER_LEADERBOARD_UPDATE_INTERVAL_MS = 5 * 60 * 1000; // toutes les 5 minutes

const TIER_ORDER = ['Tier S', 'Tier A', 'Tier B', 'Tier C', 'Tier D', 'Tier E'];

const TIER_EMOJI_UNICODE = {
  'Tier S': '💎',
  'Tier A': '🥇',
  'Tier B': '🥈',
  'Tier C': '🥉',
  'Tier D': '🛡️',
  'Tier E': '⚔️',
};

const TIER_COLOR_MAP = {
  'Tier S': 0xf1c40f,
  'Tier A': 0xe74c3c,
  'Tier B': 0xe67e22,
  'Tier C': 0x9b59b6,
  'Tier D': 0x3498db,
  'Tier E': 0x2ecc71,
};

// État interne du module
let _client = null;
let _guild = null;
let _siteBaseUrl = 'https://www.lfn-esports.fr';
let _leaderboardChannel = null;
let _leaderboardMessageId = null;
let _intervalRef = null;

// ── helpers ────────────────────────────────────────────────

function toCountryFlag(countryCode) {
  const normalized = String(countryCode || 'FR').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return '🏳️';
  return String.fromCodePoint(...Array.from(normalized).map((c) => 127397 + c.charCodeAt(0)));
}

async function fetchTierPlayers() {
  const url = `${_siteBaseUrl}/api/site/player-standings`;
  const response = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!response.ok) throw new Error(`player-standings request failed (${response.status})`);
  const payload = await response.json();
  const players = Array.isArray(payload?.players) ? payload.players : [];
  return players.filter((p) => Number(p?.points || 0) > 0);
}

function buildTierLeaderboardEmbed(players) {
  const TROPHY = '🏆';

  // Groupe par tier
  const byTier = new Map();
  for (const tier of TIER_ORDER) byTier.set(tier, []);
  for (const player of players) {
    const tier = player.tier || 'Tier E';
    if (!byTier.has(tier)) byTier.set(tier, []);
    byTier.get(tier).push(player);
  }

  // Couleur dominante = tier du #1
  const topTier = players[0]?.tier || 'Tier S';
  const embedColor = TIER_COLOR_MAP[topTier] || 0xf1c40f;

  const embed = new EmbedBuilder()
    .setTitle(`${TROPHY} Classement Tier — LFN Esports`)
    .setDescription(
      `**${players.length} joueurs classés** — mis à jour toutes les 5 minutes\n` +
      `[Voir sur le site](https://www.lfn-esports.fr/classement)`
    )
    .setColor(embedColor)
    .setTimestamp(new Date())
    .setFooter({ text: 'LFN Esports • lfn-esports.fr' });

  let globalRank = 0;

  for (const tier of TIER_ORDER) {
    const tierPlayers = byTier.get(tier) || [];
    if (!tierPlayers.length) continue;

    const tierEmoji = TIER_EMOJI_UNICODE[tier] || '🏷️';
    const fieldTitle = `${tierEmoji} ${tier} — ${tierPlayers.length} joueur${tierPlayers.length > 1 ? 's' : ''}`;

    const lines = tierPlayers.map((player) => {
      globalRank += 1;
      const flag = toCountryFlag(player.countryCode);
      const pts = Math.round(Number(player.points || 0));
      const teamTag = player.teamTag ? ` \`[${player.teamTag}]\`` : '';
      const medal =
        globalRank === 1 ? ' 🏆' :
        globalRank === 2 ? ' 🥈' :
        globalRank === 3 ? ' 🥉' : '';
      return `**#${globalRank}**${medal} ${flag} **${player.name}**${teamTag} • **${pts} pts**`;
    });

    // Split en chunks de 1000 chars max (limite Discord)
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

// ── fonction principale ─────────────────────────────────────

async function sendOrUpdateTierLeaderboardEmbed() {
  if (!_client || !_guild) return;

  // Résolution du channel
  if (!_leaderboardChannel) {
    _leaderboardChannel = await _guild.channels.fetch(TIER_LEADERBOARD_CHANNEL_ID).catch(() => null);
  }
  if (!_leaderboardChannel?.isTextBased()) {
    console.warn('[TierLeaderboard] Channel introuvable ou non textuel:', TIER_LEADERBOARD_CHANNEL_ID);
    return;
  }

  // Récupération des joueurs
  let players = [];
  try {
    players = await fetchTierPlayers();
  } catch (err) {
    console.warn('[TierLeaderboard] Impossible de charger les joueurs:', err?.message || err);
    return;
  }

  if (!players.length) {
    console.warn('[TierLeaderboard] Aucun joueur retourné, embed non mis à jour.');
    return;
  }

  const embed = buildTierLeaderboardEmbed(players);

  // Essayer d'éditer le message existant
  if (_leaderboardMessageId) {
    try {
      const existing = await _leaderboardChannel.messages.fetch(_leaderboardMessageId);
      await existing.edit({ embeds: [embed] });
      console.log('[TierLeaderboard] Embed mis à jour.');
      return;
    } catch (err) {
      console.warn('[TierLeaderboard] Impossible d\'éditer le message existant, nouveau message:', err?.message || err);
      _leaderboardMessageId = null;
    }
  }

  // Nettoyer les anciens messages du bot dans ce channel
  try {
    const recent = await _leaderboardChannel.messages.fetch({ limit: 20 });
    const old = recent.filter(
      (m) =>
        m.author.id === _client.user?.id &&
        m.embeds?.[0]?.title?.includes('Classement Tier')
    );
    await Promise.all(old.map((m) => m.delete().catch(() => null)));
  } catch (_) {}

  // Envoyer un nouveau message
  const sent = await _leaderboardChannel.send({ embeds: [embed] }).catch((err) => {
    console.error('[TierLeaderboard] Échec de l\'envoi:', err);
    return null;
  });
  if (sent) {
    _leaderboardMessageId = sent.id;
    console.log('[TierLeaderboard] Embed posté, message ID:', sent.id);
  }
}

// ── initialisation ──────────────────────────────────────────

/**
 * Appelle cette fonction dans onReady() de unified-bot.js
 * @param {Client} client   — le client Discord.js
 * @param {Guild}  guild    — le guild résolu
 * @param {string} siteBaseUrl — optionnel, ex: 'https://www.lfn-esports.fr'
 */
function initTierLeaderboard(client, guild, siteBaseUrl) {
  _client = client;
  _guild = guild;
  if (siteBaseUrl) _siteBaseUrl = siteBaseUrl.replace(/\/+$/, '');

  // Premier envoi immédiat
  sendOrUpdateTierLeaderboardEmbed().catch((err) =>
    console.error('[TierLeaderboard] Erreur initiale:', err)
  );

  // Mise à jour périodique
  if (_intervalRef) clearInterval(_intervalRef);
  _intervalRef = setInterval(() => {
    sendOrUpdateTierLeaderboardEmbed().catch((err) =>
      console.error('[TierLeaderboard] Erreur mise à jour:', err)
    );
  }, TIER_LEADERBOARD_UPDATE_INTERVAL_MS);

  console.log('[TierLeaderboard] Initialisé, mise à jour toutes les', TIER_LEADERBOARD_UPDATE_INTERVAL_MS / 60000, 'min.');
}

module.exports = { initTierLeaderboard };

// ============================================================
//  INSTRUCTIONS D'INTÉGRATION DANS unified-bot.js
//  (3 modifications, repère les lignes avec Ctrl+F)
// ============================================================
//
//  ① En haut du fichier, après les autres require() :
//
//      const { initTierLeaderboard } = require('./tier-leaderboard');
//
//
//  ② Dans onReady(), après la ligne :
//
//      await processPLQueue();
//
//  Ajoute :
//
//      initTierLeaderboard(readyClient, guild, SITE_BASE_URL);
//
//
//  C'est tout ! Le module gère le reste automatiquement.
// ============================================================
