'use strict';

// ============================================================
// staff-leaderboard.js
// Classements Coach / Manager (points stockés dans lfn_player_tier_points :
// coach_points / coach_tier et manager_points / manager_tier)
// ============================================================

const { EmbedBuilder } = require('discord.js');

const STAFF_KINDS = {
  coach: {
    pointsKey: 'coach_points',
    tierKey: 'coach_tier',
    emoji: '🎯',
    color: 0x3498db,
    label: { fr: 'Coach', en: 'Coach' },
    plural: { fr: 'COACHS', en: 'COACHES' }
  },
  manager: {
    pointsKey: 'manager_points',
    tierKey: 'manager_tier',
    emoji: '📋',
    color: 0x9b59b6,
    label: { fr: 'Manager', en: 'Manager' },
    plural: { fr: 'MANAGERS', en: 'MANAGERS' }
  }
};

const TIER_COLORS = {
  'Tier S': 0xf1c40f,
  'Tier A': 0xe74c3c,
  'Tier B': 0xe67e22,
  'Tier C': 0x9b59b6,
  'Tier D': 0x3498db,
  'Tier E': 0x2ecc71
};

function isStaffKind(value) {
  return value === 'coach' || value === 'manager';
}

function toFlag(countryCode) {
  const normalized = String(countryCode || '').trim().toUpperCase();
  if (normalized === 'ZZ') return '🌐';
  if (!/^[A-Z]{2}$/.test(normalized)) return '🏳️';
  return String.fromCodePoint(...Array.from(normalized).map((char) => 127397 + char.charCodeAt(0)));
}

async function fetchAllRows(buildQuery) {
  const PAGE = 1000;
  let rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await buildQuery().range(from, from + PAGE - 1);
    if (error) throw error;
    rows = rows.concat(data || []);
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/**
 * Classement des coachs ou managers de la saison active (points > 0), du plus haut au plus bas.
 * Retourne [{ id, name, discordId, countryCode, points, tier }].
 * Lève une erreur (code 42703) si la migration coach/manager n'est pas passée.
 */
async function fetchStaffRanking(supabase, kind, { countryCode = null } = {}) {
  const config = STAFF_KINDS[kind];
  if (!config) throw new Error(`Unknown staff kind: ${kind}`);

  const { data: season } = await supabase
    .from('lfn_seasons')
    .select('id')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const seasonId = season?.id || null;

  const pointRows = await fetchAllRows(() => {
    let query = supabase
      .from('lfn_player_tier_points')
      .select(`player_id, ${config.pointsKey}, ${config.tierKey}`)
      .gt(config.pointsKey, 0)
      .order(config.pointsKey, { ascending: false });
    if (seasonId) query = query.eq('season_id', seasonId);
    return query;
  });
  if (!pointRows.length) return [];

  const [players, profiles] = await Promise.all([
    fetchAllRows(() => supabase.from('players').select('id, name, discord_id, active').order('id')),
    fetchAllRows(() => supabase.from('lfn_player_profiles').select('player_id, country_code').order('player_id'))
  ]);
  const playerById = new Map(players.map((player) => [player.id, player]));
  const countryById = new Map(profiles.map((profile) => [profile.player_id, profile.country_code]));

  const wanted = countryCode ? String(countryCode).toUpperCase() : null;
  return pointRows
    .map((row) => {
      const player = playerById.get(row.player_id);
      if (!player || player.active === false) return null;
      const rawCountry = String(countryById.get(row.player_id) || '').toUpperCase();
      return {
        id: row.player_id,
        name: player.name || 'Joueur',
        discordId: player.discord_id || null,
        countryCode: /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : 'FR',
        points: Number(row[config.pointsKey] || 0),
        tier: row[config.tierKey] || 'Tier E'
      };
    })
    .filter((entry) => entry && (!wanted || entry.countryCode === wanted))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

function formatEntryLine(entry, rank) {
  const medal = rank === 1 ? ' 🏆' : rank === 2 ? ' 🥈' : rank === 3 ? ' 🥉' : '';
  return `**#${rank}**${medal} ${toFlag(entry.countryCode)} **${entry.name}** • **${Math.round(entry.points)} pts** • ${entry.tier}`;
}

/**
 * Embed de classement. Les textes (title, footer, emptyText) sont fournis par l'appelant (localisés ou non).
 */
function buildStaffEmbed({ kind, entries, title, limit = 25, footer = null, emptyText = '—' }) {
  const config = STAFF_KINDS[kind];
  const lines = [];
  let length = 0;
  for (const [index, entry] of entries.slice(0, limit).entries()) {
    const line = formatEntryLine(entry, index + 1);
    if (length + line.length + 1 > 3900) break;
    lines.push(line);
    length += line.length + 1;
  }

  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setTitle(title)
    .setDescription(lines.length ? lines.join('\n') : emptyText)
    .setTimestamp(new Date());
  if (footer) embed.setFooter({ text: footer });
  return embed;
}

/** Fiche d'un coach / manager (équivalent de !tier pour les joueurs). */
function buildStaffTierEmbed({ kind, entry, rank, rankLabel, pointsLabel, countryLabel, user }) {
  const config = STAFF_KINDS[kind];
  const tier = entry.tier || 'Tier E';
  return new EmbedBuilder()
    .setColor(TIER_COLORS[tier] || config.color)
    .setTitle(`${config.emoji} ${config.label.en.toUpperCase()} — ${tier.toUpperCase()}`)
    .setDescription('‎')
    .addFields(
      { name: rankLabel, value: `**#${rank}**`, inline: true },
      { name: pointsLabel, value: `**${Math.round(entry.points)}**`, inline: true },
      {
        name: countryLabel,
        value: entry.countryCode === 'ZZ' ? '**🌐**' : `**${toFlag(entry.countryCode)} ${entry.countryCode}**`,
        inline: true
      }
    )
    .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 256 }));
}

/** Définition des commandes slash publiques (tier, countrylb, coachlb, managerlb). */
function buildStaffSlashCommands({ localizeText, optionType }) {
  const roleOption = {
    name: 'role',
    description: localizeText({
      fr: 'Optionnel : afficher le classement coach ou manager',
      en: 'Optional: show the coach or manager ranking'
    }),
    type: optionType.String,
    required: false,
    choices: [
      { name: 'Coach', value: 'coach' },
      { name: 'Manager', value: 'manager' }
    ]
  };

  return [
    {
      name: 'tier',
      description: localizeText({ fr: 'Afficher la fiche tier d’un joueur', en: 'Show a player tier card' }),
      dm_permission: false,
      options: [
        {
          name: 'user',
          description: localizeText({ fr: 'Joueur (toi par défaut)', en: 'Player (you by default)' }),
          type: optionType.User,
          required: false
        },
        roleOption
      ]
    },
    {
      name: 'countrylb',
      description: localizeText({ fr: 'Classement d’un pays', en: 'Country leaderboard' }),
      dm_permission: false,
      options: [
        {
          name: 'country',
          description: localizeText({
            fr: 'Nom du pays en anglais ou code à 2 lettres (ex: France, FR)',
            en: 'Country name in English or 2-letter code (e.g. France, FR)'
          }),
          type: optionType.String,
          required: true
        },
        roleOption
      ]
    },
    {
      name: 'coachlb',
      description: localizeText({ fr: 'Top des coachs', en: 'Top coaches' }),
      dm_permission: false
    },
    {
      name: 'managerlb',
      description: localizeText({ fr: 'Top des managers', en: 'Top managers' }),
      dm_permission: false
    }
  ];
}

module.exports = {
  STAFF_KINDS,
  isStaffKind,
  fetchStaffRanking,
  buildStaffEmbed,
  buildStaffTierEmbed,
  buildStaffSlashCommands
};
