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

// Emotes des tiers (remplacent les lettres)
const TIER_EMOJIS = {
  S: '<:TierS:1482724565657321594>',
  A: '<:TierA:1482724563874877592>',
  B: '<:TierB:1482724560993259651>',
  C: '<:TierC:1482724558015299706>',
  D: '<:TierD:1482724568387817484>',
  E: '<:TierE:1482723920309260439>'
};

// Salons du serveur (mentions cliquables)
const BEST_COUNTRIES_CHANNEL_ID = '1528195571096096844';
const BEST_PLAYERS_CHANNEL_ID = '1505250882231468102';
const QUESTIONS_CHANNEL_ID = '1376052088047665242';

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
        `Hey${username ? ` **${username}**` : ''}! **LFN Esports** is an international league with one goal: bringing Null's Brawl esports to life.`,
        '',
        "Here's what you need to know 👇",
        '_Commands are typed on the server, not in this private message._'
      ].join('\n')
    )
    .addFields(
      {
        name: '🏆 How to earn points',
        value: [
          'Perform well in **tournaments** and **international scrims** to earn points.',
          'The more you perform, the more points you get and the higher you climb the leaderboard.'
        ].join('\n')
      },
      {
        name: '📊 Tiers',
        value: [
          'Your points decide your **tier**, and your Discord role follows it:',
          `${TIER_EMOJIS.E} 0-4 • ${TIER_EMOJIS.D} 5-14 • ${TIER_EMOJIS.C} 15-34 • ${TIER_EMOJIS.B} 35-54 • ${TIER_EMOJIS.A} 55+ • ${TIER_EMOJIS.S} top of tier A`,
          'More info: `!tiercriteria` and `!tier <name>`.'
        ].join('\n')
      },
      {
        name: '🌍 Leaderboards',
        value: [
          `<#${BEST_COUNTRIES_CHANNEL_ID}> — best countries`,
          `<#${BEST_PLAYERS_CHANNEL_ID}> — best players`,
          'Or use `!tierlb`, `!worldlb` and `!countrylb <country>`. Also: `!draft` and `!help`.'
        ].join('\n')
      },
      {
        name: '❓ Questions?',
        value: `Ask in <#${QUESTIONS_CHANNEL_ID}>, we're happy to help!`
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
