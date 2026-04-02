'use strict';

const { EmbedBuilder } = require('discord.js');

function buildSeasonStartEmbed({ season, previousSeason, archivedPlayers, initializedPlayers, localizeText }) {
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(localizeText({ fr: '🚀 Nouvelle saison lancée', en: '🚀 New season started' }))
    .setDescription(
      localizeText(
        {
          fr: 'La saison **{name}** (`{identifier}`) est maintenant active.',
          en: 'Season **{name}** (`{identifier}`) is now active.'
        },
        { name: season.name, identifier: season.identifier }
      )
    )
    .addFields(
      {
        name: localizeText({ fr: 'Saison précédente', en: 'Previous season' }),
        value: previousSeason ? `**${previousSeason.name}**` : localizeText({ fr: 'Aucune', en: 'None' }),
        inline: true
      },
      {
        name: localizeText({ fr: 'Profils archivés', en: 'Archived profiles' }),
        value: String(archivedPlayers || 0),
        inline: true
      },
      {
        name: localizeText({ fr: 'Joueurs initialisés', en: 'Initialized players' }),
        value: String(initializedPlayers || 0),
        inline: true
      }
    )
    .setTimestamp(new Date());
}

function buildSeasonLeaderboardEmbed({ season, entries, localizeText, title }) {
  const lines = entries.map((entry) => {
    const mention = entry.discordId ? `<@${entry.discordId}>` : `**${entry.name}**`;
    return `**#${entry.rank}** ${mention} • ${entry.tier} • **${entry.points} pts**`;
  });

  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(title)
    .setDescription(lines.length ? lines.join('\n') : localizeText({ fr: 'Aucune donnée.', en: 'No data available.' }))
    .setFooter({
      text: localizeText(
        { fr: 'Saison: {name} ({identifier})', en: 'Season: {name} ({identifier})' },
        { name: season.name, identifier: season.identifier || 'n/a' }
      )
    })
    .setTimestamp(new Date());
}

function buildSeasonPlayerProfileEmbed({ playerName, season, profile, localizeText }) {
  const wins = Number(profile?.wins || 0);
  const losses = Number(profile?.losses || 0);
  const games = Number(profile?.games_played || wins + losses);
  const winRate = games > 0 ? ((wins / games) * 100).toFixed(1) : '0.0';

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(localizeText({ fr: `📈 Profil saison — ${playerName}`, en: `📈 Season profile — ${playerName}` }))
    .addFields(
      { name: localizeText({ fr: 'Saison', en: 'Season' }), value: `${season.name} (${season.identifier || 'n/a'})`, inline: true },
      { name: localizeText({ fr: 'Tier', en: 'Tier' }), value: profile?.tier || 'Tier E', inline: true },
      { name: localizeText({ fr: 'Points', en: 'Points' }), value: String(profile?.points || 0), inline: true },
      { name: localizeText({ fr: 'Elo', en: 'Elo' }), value: String(Math.round(Number(profile?.solo_elo || 1000))), inline: true },
      { name: localizeText({ fr: 'Victoires', en: 'Wins' }), value: String(wins), inline: true },
      { name: localizeText({ fr: 'Défaites', en: 'Losses' }), value: String(losses), inline: true },
      { name: localizeText({ fr: 'Parties', en: 'Games' }), value: String(games), inline: true },
      { name: localizeText({ fr: 'Winrate', en: 'Win rate' }), value: `${winRate}%`, inline: true }
    )
    .setTimestamp(new Date());
}

module.exports = {
  buildSeasonStartEmbed,
  buildSeasonLeaderboardEmbed,
  buildSeasonPlayerProfileEmbed
};
