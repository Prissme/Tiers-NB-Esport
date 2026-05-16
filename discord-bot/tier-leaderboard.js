'use strict';

// ============================================================
//  tier-leaderboard.js
//  Génère un classement Tier LFN en image SVG (2 colonnes, format paysage)
//  Optimisé pour Discord (affichage inline)
// ============================================================

const { AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');

// --- CONFIGURATION ---
const TIER_LEADERBOARD_CHANNEL_ID = '1505250882231468102';
const TIER_LEADERBOARD_UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const SITE_BASE_URL = 'https://www.lfn-esports.fr';

// --- CONSTANTES DE DESIGN ---
const TIER_ORDER = ['Tier S', 'Tier A', 'Tier B', 'Tier C', 'Tier D', 'Tier E'];
const TIER_COLORS = {
  'Tier S': '#FFD700', // Or
  'Tier A': '#FF4500', // Orange rougeâtre
  'Tier B': '#FF8C00', // Orange
  'Tier C': '#9932CC', // Violet
  'Tier D': '#4169E1', // Bleu royal
  'Tier E': '#2E8B57', // Vert
};

// --- VARIABLES GLOBALES ---
let _client = null;
let _guild = null;
let _leaderboardChannel = null;
let _leaderboardMessageId = null;
let _intervalRef = null;

// ============================================================
//  FETCH DES DONNÉES
// ============================================================
async function fetchTierPlayers() {
  const url = `${SITE_BASE_URL}/api/site/player-standings`;
  const res = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!res.ok) throw new Error(`Erreur HTTP ${res.status} lors de la récupération des joueurs.`);
  const payload = await res.json();
  if (!Array.isArray(payload?.players)) throw new Error('Format de données invalide.');
  return payload.players
    .filter((p) => Number(p?.points || 0) > 0)
    .sort((a, b) => Number(b.points) - Number(a.points)); // Tri par points (décroissant)
}

// ============================================================
//  UTILITAIRES
// ============================================================
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function trunc(str, maxLength) {
  if (!str) return '';
  return str.length > maxLength ? str.slice(0, maxLength - 1) + '…' : str;
}

// ============================================================
//  GÉNÉRATION DE L'IMAGE SVG
// ============================================================
async function generateLeaderboardImage(players) {
  // --- DIMENSIONS ---
  const W = 1920; // Largeur totale
  const PADDING = 30; // Marge générale
  const HEADER_H = 100; // Hauteur du header
  const ROW_H = 45; // Hauteur d'une ligne de joueur
  const TIER_H = 40; // Hauteur de la barre de tier
  const GAP = 8; // Espacement entre les éléments
  const DIVIDER_W = 4; // Épaisseur du séparateur de colonnes
  const COL_W = Math.floor((W - DIVIDER_W) / 2); // Largeur d'une colonne

  // --- GROUPER LES JOUEURS PAR TIER ---
  const byTier = {};
  for (const tier of TIER_ORDER) byTier[tier] = [];
  for (const player of players) {
    const tier = player.tier || 'Tier E';
    if (byTier[tier]) byTier[tier].push(player);
  }

  // Filtrer les tiers vides
  const activeTiers = TIER_ORDER.filter((tier) => byTier[tier].length > 0);
  if (activeTiers.length === 0) throw new Error('Aucun joueur classé.');

  // --- RÉPARTIR LES TIERS EN 2 COLONNES ---
  const col1 = [];
  const col2 = [];
  let rows1 = 0;
  let rows2 = 0;

  for (const tier of activeTiers) {
    const tierRowCount = byTier[tier].length + 1; // +1 pour l'en-tête du tier
    if (rows1 <= rows2) {
      col1.push(tier);
      rows1 += tierRowCount;
    } else {
      col2.push(tier);
      rows2 += tierRowCount;
    }
  }

  // --- CALCULER LA HAUTEUR TOTALE ---
  const maxRows = Math.max(rows1, rows2);
  const H = HEADER_H + PADDING + maxRows * ROW_H + (activeTiers.length * GAP) + PADDING;

  // --- RANG DE DÉPART POUR LA COLONNE 2 ---
  const col2RankStart = col1.reduce((sum, tier) => sum + byTier[tier].length, 0);

  // --- FONCTION POUR RENDRE UNE COLONNE ---
  function renderColumn(tiers, xOffset, rankStart) {
    const parts = [];
    let y = HEADER_H + PADDING;
    let rank = rankStart;

    for (const tier of tiers) {
      const tierPlayers = byTier[tier];
      if (tierPlayers.length === 0) continue;

      const color = TIER_COLORS[tier];
      const playerCount = tierPlayers.length;

      // --- EN-TÊTE DU TIER ---
      parts.push(`
        <rect x="${xOffset}" y="${y}" width="${COL_W}" height="${TIER_H}" fill="#1A1A2E" rx="5" ry="5"/>
        <rect x="${xOffset}" y="${y}" width="6" height="${TIER_H}" fill="${color}" rx="3" ry="3"/>
        <text x="${xOffset + PADDING}" y="${y + TIER_H / 2 + 7}"
          font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="bold" fill="${color}">
          ${esc(tier)} — ${playerCount} joueur${playerCount > 1 ? 's' : ''}
        </text>
      `);
      y += TIER_H + GAP;

      // --- LIGNES DES JOUEURS ---
      for (const player of tierPlayers) {
        rank++;
        const rowBg = rank % 2 === 0 ? '#16213E' : '#0F172A';
        const rankColor = rank <= 3 ? '#FFD700' : '#C0C0C0';
        const name = trunc(esc(player.name || 'Inconnu'), 20);
        const tag = player.teamTag ? ` [${esc(player.teamTag)}]` : '';
        const countryCode = String(player.countryCode || 'FR').toUpperCase().slice(0, 2);
        const points = `${Math.round(Number(player.points || 0))} pts`;

        parts.push(`
          <rect x="${xOffset}" y="${y}" width="${COL_W}" height="${ROW_H}" fill="${rowBg}" rx="3" ry="3"/>
          <rect x="${xOffset}" y="${y}" width="3" height="${ROW_H}" fill="${color}"/>

          <text x="${xOffset + PADDING}" y="${y + ROW_H / 2 + 7}"
            font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="bold" fill="${rankColor}">
            #${rank}
          </text>

          <text x="${xOffset + PADDING + 50}" y="${y + ROW_H / 2 + 7}"
            font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#FFFFFF">
            ${name}${tag}
          </text>

          <text x="${xOffset + COL_W - PADDING - 100}" y="${y + ROW_H / 2 + 7}"
            font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#A0A0A0">
            ${countryCode}
          </text>

          <text x="${xOffset + COL_W - PADDING}" y="${y + ROW_H / 2 + 7}"
            font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="bold" fill="${color}" text-anchor="end">
            ${points}
          </text>
        `);
        y += ROW_H;
      }
      y += GAP;
    }
    return parts.join('');
  }

  // --- GÉNÉRER LE SVG ---
  const updatedAt = new Date().toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- Fond -->
  <rect width="${W}" height="${H}" fill="#0A0A14" rx="10" ry="10"/>

  <!-- Header -->
  <rect x="0" y="0" width="${W}" height="${HEADER_H}" fill="#1A1A2E" rx="10" ry="10"/>
  <text x="${PADDING}" y="40"
    font-family="Segoe UI, Arial, sans-serif" font-size="32" font-weight="bold" fill="#FFD700">
    Classement Tier — LFN Esports
  </text>
  <text x="${PADDING}" y="70"
    font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#C0C0C0">
    ${players.length} joueurs classés • Mis à jour toutes les 5 min • ${updatedAt}
  </text>
  <text x="${W - PADDING}" y="70"
    font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#C0C0C0" text-anchor="end">
    lfn-esports.fr
  </text>
  <rect x="0" y="${HEADER_H}" width="${W}" height="2" fill="#2A2A3E"/>

  <!-- Séparateur de colonnes -->
  <rect x="${COL_W}" y="${HEADER_H}" width="${DIVIDER_W}" height="${H - HEADER_H}" fill="#2A2A3E"/>

  <!-- Colonnes -->
  ${renderColumn(col1, 0, 0)}
  ${renderColumn(col2, COL_W + DIVIDER_W, col2RankStart)}

  <!-- Pied de page -->
  <rect x="0" y="${H - 2}" width="${W}" height="2" fill="#2A2A3E"/>
</svg>`;

  // Convertir en PNG avec Sharp
  return sharp(Buffer.from(svg, 'utf8'))
    .png({ quality: 100, density: 300 })
    .toBuffer();
}

// ============================================================
//  ENVOI/MISE À JOUR SUR DISCORD
// ============================================================
async function sendOrUpdateTierLeaderboardEmbed() {
  if (!_client || !_guild) {
    console.warn('[TierLeaderboard] Client ou guild non initialisé.');
    return;
  }

  // Récupérer le canal
  if (!_leaderboardChannel) {
    _leaderboardChannel = await _guild.channels.fetch(TIER_LEADERBOARD_CHANNEL_ID).catch(() => null);
    if (!_leaderboardChannel?.isTextBased()) {
      console.warn('[TierLeaderboard] Canal introuvable:', TIER_LEADERBOARD_CHANNEL_ID);
      return;
    }
  }

  // Récupérer les joueurs
  let players;
  try {
    players = await fetchTierPlayers();
    if (players.length === 0) {
      console.warn('[TierLeaderboard] Aucun joueur classé.');
      return;
    }
  } catch (err) {
    console.error('[TierLeaderboard] Erreur lors de la récupération des joueurs:', err.message);
    return;
  }

  // Générer l'image
  let imageBuffer;
  try {
    imageBuffer = await generateLeaderboardImage(players);
  } catch (err) {
    console.error('[TierLeaderboard] Erreur lors de la génération de l\'image:', err.message);
    return;
  }

  // Préparer le message
  const attachment = new AttachmentBuilder(imageBuffer, { name: 'classement-tier-lfn.png' });
  const updatedAt = new Date().toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    dateStyle: 'short',
    timeStyle: 'short',
  });
  const payload = {
    content: `**🏆 Classement Tier LFN** — [Voir le site](${SITE_BASE_URL}/classement) • ${updatedAt}`,
    files: [attachment],
  };

  // Mettre à jour ou envoyer un nouveau message
  if (_leaderboardMessageId) {
    try {
      const existingMessage = await _leaderboardChannel.messages.fetch(_leaderboardMessageId);
      await existingMessage.edit(payload);
      console.log('[TierLeaderboard] Image mise à jour.');
      return;
    } catch (err) {
      console.warn('[TierLeaderboard] Impossible de modifier le message existant:', err.message);
      _leaderboardMessageId = null;
    }
  }

  // Supprimer les anciens messages du bot (nettoyage)
  try {
    const recentMessages = await _leaderboardChannel.messages.fetch({ limit: 20 });
    const oldMessages = recentMessages.filter(
      (m) => m.author.id === _client.user?.id && m.content?.includes('Classement Tier LFN')
    );
    await Promise.all(oldMessages.map((m) => m.delete().catch(() => null)));
  } catch (err) {
    console.warn('[TierLeaderboard] Erreur lors du nettoyage des anciens messages:', err.message);
  }

  // Envoyer le nouveau message
  const sentMessage = await _leaderboardChannel.send(payload).catch((err) => {
    console.error('[TierLeaderboard] Erreur lors de l\'envoi du message:', err.message);
    return null;
  });

  if (sentMessage) {
    _leaderboardMessageId = sentMessage.id;
    console.log('[TierLeaderboard] Nouveau message envoyé. ID:', sentMessage.id);
  }
}

// ============================================================
//  INITIALISATION
// ============================================================
function initTierLeaderboard(client, guild, siteBaseUrl = SITE_BASE_URL) {
  _client = client;
  _guild = guild;
  if (siteBaseUrl) {
    _siteBaseUrl = siteBaseUrl.replace(/\/+$/, '');
  }

  // Lancer la première mise à jour
  sendOrUpdateTierLeaderboardEmbed().catch((err) => {
    console.error('[TierLeaderboard] Erreur initiale:', err.message);
  });

  // Planifier les mises à jour automatiques
  if (_intervalRef) clearInterval(_intervalRef);
  _intervalRef = setInterval(() => {
    sendOrUpdateTierLeaderboardEmbed().catch((err) => {
      console.error('[TierLeaderboard] Erreur lors de la mise à jour:', err.message);
    });
  }, TIER_LEADERBOARD_UPDATE_INTERVAL_MS);

  console.log(`[TierLeaderboard] Initialisé. Mise à jour toutes les ${TIER_LEADERBOARD_UPDATE_INTERVAL_MS / 60000} minutes.`);
}

// Exporter la fonction d'initialisation
module.exports = { initTierLeaderboard };
