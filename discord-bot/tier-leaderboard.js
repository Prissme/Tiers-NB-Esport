'use strict';
// ============================================================
// tier-leaderboard.js
// Module autonome — classement Tier dans un channel dédié
// ============================================================
const { EmbedBuilder } = require('discord.js');

const TIER_LEADERBOARD_CHANNEL_ID = '1505250882231468102';
const TIER_LEADERBOARD_UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

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

// État interne
let _client = null;
let _guild = null;
let _siteBaseUrl = 'https://www.lfn-esports.fr';
let _leaderboardChannel = null;
let _leaderboardMessageId = null;
let _intervalRef = null;

// ── Helpers ────────────────────────────────────────────────
function toCountryFlag(countryCode) {
  const normalized = String(countryCode || 'FR').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return '🏳️';
  return String.fromCodePoint(...Array.from(normalized).map((c) => 127397 + c.charCodeAt(0)));
}

// Version améliorée avec retry + meilleure gestion d'erreur
async function fetchTierPlayers() {
  const url = `${_siteBaseUrl}/api/site/player-standings`;
  
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, { 
        method: 'GET', 
        cache: 'no-store',
        headers: { 
          'User-Agent': 'LFN-DiscordBot/1.0',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }

      const payload = await response.json();
      const players = Array.isArray(payload?.players) ? payload.players : [];
      
      const filtered = players.filter((p) => Number(p?.points || 0) > 0);
      console.log(`[TierLeaderboard] ${filtered.length} joueurs chargés avec succès.`);
      
      return filtered;

    } catch (err) {
      console.warn(`[TierLeaderboard] Tentative ${attempt}/4 échouée: ${err.message}`);
      
      if (attempt < 4) {
        const delay = attempt * 2000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  console.error('[TierLeaderboard] Échec total du fetch après 4 tentatives.');
  throw new Error('Impossible de charger le classement tier après plusieurs tentatives.');
}

function buildTierLeaderboardEmbed(players) {
  const TROPHY = '🏆';

  const byTier = new Map();
  for (const tier of TIER_ORDER) byTier.set(tier, []);
  
  for (const player of players) {
    const tier = player.tier || 'Tier E';
    if (!byTier.has(tier)) byTier.set(tier, []);
    byTier.get(tier).push(player);
  }

  // Couleur basée sur le tier du leader
  const topTier = players[0]?.tier || 'Tier S';
  const embedColor = TIER_COLOR_MAP[topTier] || 0xf1c40f;

  const embed = new EmbedBuilder()
    .setTitle(`${TROPHY} Classement Tier — LFN Esports`)
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

    const tierEmoji = TIER_EMOJI_UNICODE[tier] || '🏷️';
    const fieldTitle = `${tierEmoji} ${tier} — ${tierPlayers.length} joueur${tierPlayers.length > 1 ? 's' : ''}`;

    const lines = tierPlayers.map((player) => {
      globalRank += 1;
      const flag = toCountryFlag(player.countryCode);
      const pts = Math.round(Number(player.points || 0));
      const teamTag = player.teamTag ? ` \`[${player.teamTag}]\`` : '';
      const medal = globalRank === 1 ? ' 🏆' : globalRank === 2 ? ' 🥈' : globalRank === 3 ? ' 🥉' : '';

      return `**#${globalRank}**${medal} ${flag} **${player.name}**${teamTag} • **${pts} pts**`;
    });

    // Gestion du split si trop long
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

// ── Fonction principale ─────────────────────────────────────
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
    } catch (err) {
      console.warn('[TierLeaderboard] Message existant introuvable, création d’un nouveau.');
      _leaderboardMessageId = null;
    }
  }

  // Nettoyage des anciens messages du bot
  try {
    const recent = await _leaderboardChannel.messages.fetch({ limit: 20 });
    const oldMessages = recent.filter(m => 
      m.author.id === _client.user?.id && 
      m.embeds?.[0]?.title?.includes('Classement Tier')
    );
    await Promise.all(oldMessages.map(m => m.delete().catch(() => null)));
  } catch (_) {}

  // Envoi du nouveau message
  const sent = await _leaderboardChannel.send({ embeds: [embed] }).catch(err => {
    console.error('[TierLeaderboard] Échec envoi:', err);
    return null;
  });

  if (sent) {
    _leaderboardMessageId = sent.id;
    console.log('[TierLeaderboard] Nouveau message posté - ID:', sent.id);
  }
}

// ── Initialisation ──────────────────────────────────────────
function initTierLeaderboard(client, guild, siteBaseUrl = null) {
  _client = client;
  _guild = guild;
  
  if (siteBaseUrl) {
    _siteBaseUrl = siteBaseUrl.replace(/\/+$/, '');
  }

  console.log('[TierLeaderboard] Initialisation...');

  // Premier envoi
  sendOrUpdateTierLeaderboardEmbed().catch(err => 
    console.error('[TierLeaderboard] Erreur initiale:', err)
  );

  // Mise à jour périodique
  if (_intervalRef) clearInterval(_intervalRef);
  
  _intervalRef = setInterval(() => {
    sendOrUpdateTierLeaderboardEmbed().catch(err => 
      console.error('[TierLeaderboard] Erreur pendant mise à jour:', err)
    );
  }, TIER_LEADERBOARD_UPDATE_INTERVAL_MS);

  console.log(`[TierLeaderboard] ✅ Initialisé (mise à jour toutes les ${TIER_LEADERBOARD_UPDATE_INTERVAL_MS / 60000} minutes)`);
}

module.exports = { initTierLeaderboard };
