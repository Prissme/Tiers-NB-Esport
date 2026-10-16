'use strict';

/**
 * Message de bienvenue envoyé en privé aux nouveaux membres (en anglais).
 * Utilisé par l'événement GuildMemberAdd et par la commande admin /welcometest.
 */

const { EmbedBuilder } = require('discord.js');

// Liens + emotes personnalisées (le bot doit être présent sur le serveur qui héberge ces emotes)
const SITE_URL = 'https://www.lfn-esports.fr/';
const YOUTUBE_URL = 'https://www.youtube.com/@PrissmeTTV';
const TWITCH_URL = 'https://www.twitch.tv/prissmetv';

const EMOJI_LFN = '<:LogoLFN:1490290213501669598>';
const EMOJI_YOUTUBE = '<:YouTube:1550937181088915506>';
const EMOJI_TWITCH = '<:Twitchlogo:1530924923529199708>';

/**
 * Construit le message de bienvenue (1 embed, en anglais).
 * @param {{ guildName?: string, username?: string }} ctx
 */
function buildWelcomeMessage(ctx = {}) {
  const guildName = ctx.guildName || 'LFN Esports';
  const username = ctx.username || '';

  const embed = new EmbedBuilder()
    .setColor(0xe39f30)
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
        name: '🌍 Leaderboards & tools',
        value: [
          '`!tierlb` • `!worldlb` • `!countrylb <country>` (English or French name, or a code like `FR`)',
          '`!draft` (draft system) • `!help` (all commands)'
        ].join('\n')
      },
      {
        name: '🔗 Links',
        value: [
          `${EMOJI_LFN} [Official website](${SITE_URL})`,
          `${EMOJI_YOUTUBE} [YouTube](${YOUTUBE_URL})`,
          `${EMOJI_TWITCH} [Twitch](${TWITCH_URL})`
        ].join('\n')
      }
    )
    .setFooter({ text: 'Have fun! 🎮' });

  return { embeds: [embed] };
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
