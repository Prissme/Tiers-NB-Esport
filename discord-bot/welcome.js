'use strict';

/**
 * Message de bienvenue envoyé en privé aux nouveaux membres.
 * Bilingue (FR + EN) : le bot a une langue globale modifiable avec !english,
 * mais un DM de bienvenue doit être compréhensible par tout le monde.
 */

const { EmbedBuilder } = require('discord.js');

const SITE_URL = 'https://www.lfn-esports.fr/';
const RULEBOOK_URL = 'https://www.lfn-esports.fr/reglement#tier-system';

// Mention de salon (affichée comme #nom-du-salon), ou texte de repli si l'ID n'est pas configuré
function channelRef(channelId, fallback) {
  return channelId ? `<#${channelId}>` : fallback;
}

/**
 * Construit le message (2 embeds : français puis anglais).
 * @param {{ guildName?: string, username?: string, plRoleChannelId?: string, plQueueChannelId?: string }} ctx
 */
function buildWelcomeMessage(ctx = {}) {
  const guildName = ctx.guildName || 'LFN Esports';
  const username = ctx.username || '';
  const plRoleChannel = channelRef(ctx.plRoleChannelId, 'le salon des rôles');
  const plQueueChannel = channelRef(ctx.plQueueChannelId, 'le salon de la file PL');
  const plRoleChannelEn = channelRef(ctx.plRoleChannelId, 'the roles channel');
  const plQueueChannelEn = channelRef(ctx.plQueueChannelId, 'the PL queue channel');

  const french = new EmbedBuilder()
    .setColor(0xe39f30)
    .setTitle(`👋 Bienvenue sur ${guildName} !`)
    .setURL(SITE_URL)
    .setDescription(
      [
        `Salut${username ? ` **${username}**` : ''} ! Ici, c'est la **LFN Esports**, la ligue francophone Null's Brawl : saisons, classements, matchs et équipes.`,
        '',
        'Voici comment ça marche 👇',
        "_Les commandes se tapent sur le serveur, pas dans ce message privé._"
      ].join('\n')
    )
    .addFields(
      {
        name: '📊 Les tiers',
        value: [
          'Tes points déterminent ton **tier** :',
          '`E` 0-4 • `D` 5-14 • `C` 15-34 • `B` 35-54 • `A` 55+ • `S` top du tier A',
          'Ton rôle Discord suit ton tier. Pas à jour ? Tape `!synctiers`.',
          'Plus d’infos : `!tiercriteria` et `!tier <nom>`.'
        ].join('\n')
      },
      {
        name: '⚔️ Les PL (matchs classés)',
        value: [
          `1️⃣ Prends ton **rôle PL** dans ${plRoleChannel} (sans lui, le bot te bloque).`,
          `2️⃣ Rejoins la file dans ${plQueueChannel} avec \`!join\` (\`!leave\` pour la quitter, \`!queue\` pour la voir).`,
          '3️⃣ Tes matchs font évoluer ton **Elo** : `!elo`, `!lb` (classement PL) et `!ranks`.'
        ].join('\n')
      },
      {
        name: '🌍 Classements & outils',
        value: [
          '`!tierlb` • `!worldlb` • `!countrylb <pays>` (nom en français ou en anglais, ou code comme `FR`)',
          '`!maps` (rotation des maps) • `!draft` (système de draft) • `!help`'
        ].join('\n')
      },
      {
        name: '🔗 Liens utiles',
        value: `[Site officiel](${SITE_URL}) • [Règlement & système de tiers](${RULEBOOK_URL})`
      }
    )
    .setFooter({ text: 'Bon jeu ! 🎮' });

  const english = new EmbedBuilder()
    .setColor(0x2563eb)
    .setTitle(`👋 Welcome to ${guildName}!`)
    .setURL(SITE_URL)
    .setDescription(
      [
        `Hey${username ? ` **${username}**` : ''}! This is **LFN Esports**, the French-speaking Null's Brawl league: seasons, standings, matches and teams.`,
        '',
        'Here is how it works 👇',
        '_Commands are typed on the server, not in this private message._'
      ].join('\n')
    )
    .addFields(
      {
        name: '📊 Tiers',
        value: [
          'Your points decide your **tier**:',
          '`E` 0-4 • `D` 5-14 • `C` 15-34 • `B` 35-54 • `A` 55+ • `S` top of tier A',
          'Your Discord role follows your tier. Out of date? Use `!synctiers`.',
          'More info: `!tiercriteria` and `!tier <name>`.'
        ].join('\n')
      },
      {
        name: '⚔️ PL (ranked matches)',
        value: [
          `1️⃣ Get your **PL role** in ${plRoleChannelEn} (the bot blocks you without it).`,
          `2️⃣ Join the queue in ${plQueueChannelEn} with \`!join\` (\`!leave\` to quit, \`!queue\` to view it).`,
          '3️⃣ Your matches change your **Elo**: `!elo`, `!lb` (PL leaderboard) and `!ranks`.'
        ].join('\n')
      },
      {
        name: '🌍 Leaderboards & tools',
        value: [
          '`!tierlb` • `!worldlb` • `!countrylb <country>` (English or French name, or a code like `FR`)',
          '`!maps` (map rotation) • `!draft` (draft system) • `!help`'
        ].join('\n')
      },
      {
        name: '🔗 Useful links',
        value: `[Official website](${SITE_URL}) • [Rulebook & tier system](${RULEBOOK_URL})`
      }
    )
    .setFooter({ text: 'Have fun! 🎮' });

  return { embeds: [french, english] };
}

/**
 * Envoie le message en DM. Ne lève jamais d'erreur : les DM fermés sont un cas normal.
 * @returns {Promise<{ ok: boolean, payload: object, error?: any }>}
 */
async function sendWelcomeDM(user, ctx) {
  const payload = buildWelcomeMessage(ctx);
  try {
    await user.send(payload);
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, payload, error };
  }
}

module.exports = { buildWelcomeMessage, sendWelcomeDM };
