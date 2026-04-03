'use strict';

// Module de gestion des prédictions LFN (Ligue Française Null's)
// Inclut la création des commandes slash, la publication des embeds de vote,
// la gestion des interactions de bouton et la fermeture des prédictions.

const {
  ActionRowBuilder,
  AttachmentBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

const LOG_PREFIX = '[LFN Predictions]';
const DISCORD_BLUE = 0x5865f2;
const VALIDATE_BUTTON_ID = 'lfn_pred_validate';
const PERFECT_PREDICTIONS_ROLE_ID = '1460249694159507476';
const PREDICTION_MIGRATION_PATH = 'supabase/migrations/202509230001_create_lfn_prediction_tables.sql';
const VALIDATION_ON_CONFLICT = 'guild_id,match_id,user_id';
const REQUIRED_PREDICTION_TABLES = [
  'lfn_predictions',
  'lfn_prediction_votes',
  'lfn_prediction_validations'
];
const TEAMS_TABLE = process.env.LFN_TEAMS_TABLE || 'lfn_teams';
const TEAM_NAME_COLUMN = process.env.LFN_TEAM_NAME_COLUMN || 'name';
const TEAM_LOGO_COLUMN = process.env.LFN_TEAM_LOGO_COLUMN || 'logo_url';
const TEAM_ACTIVE_COLUMN = process.env.LFN_TEAM_ACTIVE_COLUMN || 'is_active';
const TEAMS_CACHE_TTL_MS = 5 * 60 * 1000;
const LOGO_FETCH_TIMEOUT_MS = 5000;

let context = null;
let publicTeamsCache = { fetchedAt: 0, teams: [] };
const logoDataUriCache = new Map();

function initPredictionContext(options) {
  context = {
    client: options.client,
    guildId: options.guildId,
    supabase: options.supabase,
    localizeText: options.localizeText,
    log: (...args) => options.log(LOG_PREFIX, ...args),
    warn: (...args) => options.warn(LOG_PREFIX, ...args),
    error: (...args) => options.error(LOG_PREFIX, ...args)
  };
}

async function verifyPredictionTables() {
  if (!context?.supabase) {
    return;
  }

  for (const table of REQUIRED_PREDICTION_TABLES) {
    try {
      const { error } = await context.supabase.from(table).select('id', { head: true, count: 'exact' }).limit(1);
      if (error) {
        throw error;
      }
    } catch (err) {
      const errorCode = err?.code || err?.error_code;
      if (errorCode === 'PGRST205') {
        context.warn(
          `Table Supabase manquante: ${table}. Appliquez la migration ${PREDICTION_MIGRATION_PATH} pour corriger.`
        );
      } else {
        context.warn(`Impossible de vérifier la table ${table}:`, err?.message || err);
      }
    }
  }
}

function buildCommands(localizeText) {
  return [
    {
      name: 'predictions',
      description: localizeText({
        fr: "Créer des prédictions LFN pour jusqu'à quatre matchs",
        en: 'Create LFN predictions for up to four matches'
      }),
      default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString(),
      dm_permission: false,
      options: [
        {
          name: 'match1_team1',
          description: localizeText({ fr: "Équipe 1 du match 1", en: 'Match 1 team 1' }),
          type: ApplicationCommandOptionType.String,
          autocomplete: true,
          required: true
        },
        {
          name: 'match1_team2',
          description: localizeText({ fr: "Équipe 2 du match 1", en: 'Match 1 team 2' }),
          type: ApplicationCommandOptionType.String,
          autocomplete: true,
          required: true
        },
        {
          name: 'match2_team1',
          description: localizeText({ fr: "Équipe 1 du match 2", en: 'Match 2 team 1' }),
          type: ApplicationCommandOptionType.String,
          autocomplete: true,
          required: false
        },
        {
          name: 'match2_team2',
          description: localizeText({ fr: "Équipe 2 du match 2", en: 'Match 2 team 2' }),
          type: ApplicationCommandOptionType.String,
          autocomplete: true,
          required: false
        },
        {
          name: 'match3_team1',
          description: localizeText({ fr: "Équipe 1 du match 3", en: 'Match 3 team 1' }),
          type: ApplicationCommandOptionType.String,
          autocomplete: true,
          required: false
        },
        {
          name: 'match3_team2',
          description: localizeText({ fr: "Équipe 2 du match 3", en: 'Match 3 team 2' }),
          type: ApplicationCommandOptionType.String,
          autocomplete: true,
          required: false
        },
        {
          name: 'match4_team1',
          description: localizeText({ fr: "Équipe 1 du match 4", en: 'Match 4 team 1' }),
          type: ApplicationCommandOptionType.String,
          autocomplete: true,
          required: false
        },
        {
          name: 'match4_team2',
          description: localizeText({ fr: "Équipe 2 du match 4", en: 'Match 4 team 2' }),
          type: ApplicationCommandOptionType.String,
          autocomplete: true,
          required: false
        },
        {
          name: 'date',
          description: localizeText({ fr: 'Date des matchs (JJ/MM/AAAA)', en: 'Match date (DD/MM/YYYY)' }),
          type: ApplicationCommandOptionType.String,
          required: false
        },
        {
          name: 'channel',
          description: localizeText({ fr: 'Salon où poster', en: 'Target channel' }),
          type: ApplicationCommandOptionType.Channel,
          required: false
        }
      ]
    },
    {
      name: 'close_predictions',
      description: localizeText({
        fr: 'Fermer les votes pour un match',
        en: 'Close votes for a match'
      }),
      default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString(),
      dm_permission: false,
      options: [
        {
          name: 'match_number',
          description: localizeText({ fr: 'Match à fermer (1-4)', en: 'Match to close (1-4)' }),
          type: ApplicationCommandOptionType.Integer,
          required: false,
          choices: [
            { name: '1', value: 1 },
            { name: '2', value: 2 },
            { name: '3', value: 3 },
            { name: '4', value: 4 }
          ]
        }
      ]
    },
    {
      name: 'announce_predictions',
      description: localizeText({
        fr: 'Annoncer les gagnants des matchs disponibles',
        en: 'Announce winners for the available matches'
      }),
      default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString(),
      dm_permission: false,
      options: [1, 2, 3, 4].flatMap((match) => [
        {
          name: `match${match}_winner`,
          description: localizeText({
            fr: `Gagnant du match ${match} (équipe 1 ou 2)`,
            en: `Match ${match} winner (team 1 or 2)`
          }),
          type: ApplicationCommandOptionType.Integer,
          required: match === 1,
          choices: [
            { name: localizeText({ fr: 'Équipe 1', en: 'Team 1' }), value: 1 },
            { name: localizeText({ fr: 'Équipe 2', en: 'Team 2' }), value: 2 }
          ]
        }
      ])
    }
  ];
}

async function registerCommands(additionalCommands = []) {
  if (!context?.client?.application) {
    return;
  }

  try {
    await verifyPredictionTables();
    const commands = buildCommands(context.localizeText);
    const mergedCommands = [...commands, ...(additionalCommands || [])];
    await context.client.application.commands.set(mergedCommands, context.guildId);
    context.log('Slash commands registered.');
  } catch (err) {
    context.error('Unable to register slash commands:', err);
  }
}

function buildVoteComponents(prediction, disabled = false, showValidation = false) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lfn_pred|${prediction.match_number}|team1`)
      .setLabel(prediction.team1_name)
      .setStyle(ButtonStyle.Success)
      .setEmoji('🔵')
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`lfn_pred|${prediction.match_number}|team2`)
      .setLabel(prediction.team2_name)
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔴')
      .setDisabled(disabled)
  );

  const rows = [row];

  if (showValidation) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(VALIDATE_BUTTON_ID)
          .setLabel(context.localizeText({ fr: '✅ Valider mes prédictions', en: '✅ Validate my predictions' }))
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled)
      )
    );
  }

  return rows;
}

function warnOnConflictMismatch(expected, actual, contextLabel) {
  if (actual !== expected) {
    context.warn(
      `${contextLabel} onConflict mismatch. Expected "${expected}", received "${actual}". ` +
        'Vérifiez l’ordre, les noms snake_case et l’absence d’espaces.'
    );
  }
}

function formatPercent(count, total) {
  if (!total) {
    return '0.0';
  }

  return ((count / total) * 100).toFixed(1);
}

function buildProgressBar(count, total) {
  const totalBlocks = 5;
  const ratio = total ? count / total : 0;
  const filled = Math.round(ratio * totalBlocks);
  return `${'▰'.repeat(filled)}${'▱'.repeat(totalBlocks - filled)}`;
}

function buildEmbed(prediction, stats, isClosed, winnerKey = null) {
  const dateText = prediction.match_date || context.localizeText({ fr: 'Date à confirmer', en: 'Date to be confirmed' });
  const footerText = isClosed
    ? context.localizeText({ fr: `Votes fermés • ${dateText}`, en: `Voting closed • ${dateText}` })
    : context.localizeText({ fr: `${dateText} • Votez avec les boutons ci-dessous`, en: `${dateText} • Vote using the buttons below` });

  const embed = new EmbedBuilder()
    .setTitle(context.localizeText({ fr: `🔮 Match ${prediction.match_number} — LFN Predictions`, en: `🔮 Match ${prediction.match_number} — LFN Predictions` }))
    .setDescription(`${prediction.team1_name} 🆚 ${prediction.team2_name}`)
    .addFields(
      {
        name: context.localizeText({ fr: `🔵 ${prediction.team1_name}`, en: `🔵 ${prediction.team1_name}` }),
        value: context.localizeText(
          { fr: 'Votes : {count} ({percent}%)\n{bar}', en: 'Votes: {count} ({percent}%)\n{bar}' },
          { count: stats.team1, percent: formatPercent(stats.team1, stats.total), bar: buildProgressBar(stats.team1, stats.total) }
        ),
        inline: true
      },
      {
        name: context.localizeText({ fr: `🔴 ${prediction.team2_name}`, en: `🔴 ${prediction.team2_name}` }),
        value: context.localizeText(
          { fr: 'Votes : {count} ({percent}%)\n{bar}', en: 'Votes: {count} ({percent}%)\n{bar}' },
          { count: stats.team2, percent: formatPercent(stats.team2, stats.total), bar: buildProgressBar(stats.team2, stats.total) }
        ),
        inline: true
      },
      {
        name: context.localizeText({ fr: 'Total des votes', en: 'Total votes' }),
        value: `${stats.total}`,
        inline: true
      }
    )
    .setColor(DISCORD_BLUE)
    .setFooter({ text: footerText });

  if (winnerKey) {
    const winnerName = winnerKey === 'team1' ? prediction.team1_name : prediction.team2_name;
    embed.addFields({
      name: context.localizeText({ fr: '🏆 Gagnant', en: '🏆 Winner' }),
      value: winnerName,
      inline: false
    });
  }

  return embed;
}

function escapeXml(input) {
  return String(input ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function trimLabel(value) {
  return String(value ?? '').trim().slice(0, 30);
}

async function fetchPublicTeams(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && now - publicTeamsCache.fetchedAt <= TEAMS_CACHE_TTL_MS) {
    return publicTeamsCache.teams;
  }

  const selectColumns = [TEAM_NAME_COLUMN, TEAM_LOGO_COLUMN, TEAM_ACTIVE_COLUMN].filter(Boolean).join(', ');
  let query = context.supabase.from(TEAMS_TABLE).select(selectColumns).order(TEAM_NAME_COLUMN, { ascending: true });

  if (TEAM_ACTIVE_COLUMN) {
    query = query.eq(TEAM_ACTIVE_COLUMN, true);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const teams = (data || [])
    .map((row) => ({
      name: String(row?.[TEAM_NAME_COLUMN] ?? '').trim(),
      logoUrl: row?.[TEAM_LOGO_COLUMN] ? String(row[TEAM_LOGO_COLUMN]).trim() : null
    }))
    .filter((team) => team.name.length > 0);

  publicTeamsCache = { fetchedAt: now, teams };
  return teams;
}

async function fetchLogoAsDataUri(url) {
  const safeUrl = String(url || '').trim();
  if (!safeUrl) {
    return null;
  }

  if (logoDataUriCache.has(safeUrl)) {
    return logoDataUriCache.get(safeUrl);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LOGO_FETCH_TIMEOUT_MS);
    const response = await fetch(safeUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) {
      return null;
    }
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith('image/')) {
      return null;
    }
    const bytes = await response.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUri = `data:${contentType};base64,${base64}`;
    logoDataUriCache.set(safeUrl, dataUri);
    return dataUri;
  } catch {
    return null;
  }
}

async function buildMatchVisualAttachment(prediction) {
  const teams = await fetchPublicTeams();
  const teamByName = new Map(teams.map((team) => [team.name.toLowerCase(), team]));
  const team1 = teamByName.get(prediction.team1_name.toLowerCase()) || { name: prediction.team1_name, logoUrl: null };
  const team2 = teamByName.get(prediction.team2_name.toLowerCase()) || { name: prediction.team2_name, logoUrl: null };

  const [team1LogoData, team2LogoData] = await Promise.all([
    fetchLogoAsDataUri(team1.logoUrl),
    fetchLogoAsDataUri(team2.logoUrl)
  ]);

  const width = 1200;
  const height = 630;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B1021"/>
      <stop offset="60%" stop-color="#131A33"/>
      <stop offset="100%" stop-color="#091226"/>
    </linearGradient>
    <linearGradient id="leftGlow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2E90FA" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#2E90FA" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="rightGlow" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#EF4444" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#EF4444" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${width / 2}" height="${height}" fill="url(#leftGlow)"/>
  <rect x="${width / 2}" y="0" width="${width / 2}" height="${height}" fill="url(#rightGlow)"/>
  <circle cx="300" cy="300" r="150" fill="#0F1A3A" stroke="#2E90FA" stroke-width="5"/>
  <circle cx="900" cy="300" r="150" fill="#2A0E18" stroke="#EF4444" stroke-width="5"/>
  <text x="600" y="315" font-size="88" font-family="Inter, Arial, sans-serif" text-anchor="middle" fill="#FFFFFF" font-weight="700">VS</text>
  <text x="300" y="520" font-size="44" font-family="Inter, Arial, sans-serif" text-anchor="middle" fill="#E6F0FF" font-weight="700">${escapeXml(trimLabel(team1.name))}</text>
  <text x="900" y="520" font-size="44" font-family="Inter, Arial, sans-serif" text-anchor="middle" fill="#FFE5E5" font-weight="700">${escapeXml(trimLabel(team2.name))}</text>
  ${
    team1LogoData
      ? `<image href="${team1LogoData}" x="190" y="190" width="220" height="220" preserveAspectRatio="xMidYMid meet"/>`
      : `<text x="300" y="315" font-size="28" font-family="Inter, Arial, sans-serif" text-anchor="middle" fill="#9FB3D9">Logo indisponible</text>`
  }
  ${
    team2LogoData
      ? `<image href="${team2LogoData}" x="790" y="190" width="220" height="220" preserveAspectRatio="xMidYMid meet"/>`
      : `<text x="900" y="315" font-size="28" font-family="Inter, Arial, sans-serif" text-anchor="middle" fill="#FFB6B6">Logo indisponible</text>`
  }
</svg>`;

  const fileName = `match-${prediction.match_number}-vs.svg`;
  return new AttachmentBuilder(Buffer.from(svg, 'utf8'), { name: fileName });
}

async function buildPredictionPayload(prediction, stats, isClosed, winnerKey = null, showValidation = false) {
  const embed = buildEmbed(prediction, stats, isClosed, winnerKey);
  const visual = await buildMatchVisualAttachment(prediction);
  embed.setImage(`attachment://${visual.name}`);
  return {
    embeds: [embed],
    components: buildVoteComponents(prediction, isClosed, showValidation),
    files: [visual]
  };
}

async function upsertPredictionRecord(payload) {
  const { data, error } = await context.supabase.from('lfn_predictions').upsert(payload).select().single();
  if (error) {
    throw error;
  }
  return data;
}

async function fetchPredictionByMessage(messageId) {
  const { data, error } = await context.supabase
    .from('lfn_predictions')
    .select('*')
    .eq('guild_id', context.guildId)
    .eq('message_id', messageId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function fetchVoteCounts(predictionId) {
  const team1Query = context.supabase
    .from('lfn_prediction_votes')
    .select('voted_team', { count: 'exact', head: true })
    .eq('prediction_id', predictionId)
    .eq('voted_team', 'team1');

  const team2Query = context.supabase
    .from('lfn_prediction_votes')
    .select('voted_team', { count: 'exact', head: true })
    .eq('prediction_id', predictionId)
    .eq('voted_team', 'team2');

  const [{ count: team1Count, error: team1Error }, { count: team2Count, error: team2Error }] = await Promise.all([
    team1Query,
    team2Query
  ]);

  if (team1Error || team2Error) {
    throw team1Error || team2Error;
  }

  const team1 = team1Count || 0;
  const team2 = team2Count || 0;
  return { team1, team2, total: team1 + team2 };
}

async function upsertVote(predictionId, userId, votedTeam) {
  const { data: existing, error: fetchError } = await context.supabase
    .from('lfn_prediction_votes')
    .select('id, voted_team')
    .eq('prediction_id', predictionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!existing) {
    const { error: insertError } = await context.supabase
      .from('lfn_prediction_votes')
      .insert({ prediction_id: predictionId, user_id: userId, voted_team: votedTeam });

    if (insertError) {
      throw insertError;
    }

    return { previousVote: null, newVote: votedTeam };
  }

  if (existing.voted_team === votedTeam) {
    return { previousVote: votedTeam, newVote: votedTeam };
  }

  const { error: updateError } = await context.supabase
    .from('lfn_prediction_votes')
    .update({ voted_team: votedTeam, voted_at: new Date().toISOString() })
    .eq('id', existing.id);

  if (updateError) {
    throw updateError;
  }

  return { previousVote: existing.voted_team, newVote: votedTeam };
}

async function updateMessage(interaction, prediction, isClosed = false) {
  const stats = await fetchVoteCounts(prediction.id);
  const lastMatchNumber = await fetchLastPredictionMatchNumber();
  const payload = await buildPredictionPayload(
    prediction,
    stats,
    isClosed,
    null,
    prediction.match_number === lastMatchNumber
  );
  await interaction.message.edit(payload);
}

async function fetchLastPredictionMatchNumber() {
  const predictions = await fetchPredictionsForGuild();
  return predictions.at(-1)?.match_number ?? null;
}

function validateTeams(teams) {
  const set = new Set(teams.map((team) => team.toLowerCase()));
  return set.size === teams.length;
}

async function handlePredictionsCommand(interaction) {
  const hasPermission = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild);
  if (!hasPermission) {
    await interaction.reply({
      content: context.localizeText({
        fr: "❌ Vous n'avez pas la permission d'utiliser cette commande.",
        en: "❌ You don't have permission to use this command."
      }),
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const date = interaction.options.getString('date');
  const channelOption = interaction.options.getChannel('channel');
  const channel = channelOption?.isTextBased() ? channelOption : interaction.channel;

  const matches = [];
  for (const match of [1, 2, 3, 4]) {
    const team1 = interaction.options.getString(`match${match}_team1`)?.trim();
    const team2 = interaction.options.getString(`match${match}_team2`)?.trim();

    if (!team1 && !team2) {
      continue;
    }

    if (!team1 || !team2) {
      await interaction.editReply({
        content: context.localizeText(
          {
            fr: '⚠️ Tu dois renseigner les deux équipes pour le match {match}.',
            en: '⚠️ You must provide both teams for match {match}.'
          },
          { match }
        )
      });
      return true;
    }

    matches.push({
      match_number: match,
      team1_name: team1,
      team2_name: team2,
      match_date: date || null
    });
  }

  const allTeams = matches.flatMap((entry) => [entry.team1_name, entry.team2_name]);
  let publicTeams = [];
  try {
    publicTeams = await fetchPublicTeams();
  } catch (err) {
    context.warn('Unable to load public teams for prediction command:', err);
  }
  const availableTeams = new Set(publicTeams.map((team) => team.name.toLowerCase()));
  if (availableTeams.size > 0) {
    const unknownTeams = allTeams.filter((teamName) => !availableTeams.has(teamName.toLowerCase()));
    if (unknownTeams.length > 0) {
      await interaction.editReply({
        content: context.localizeText(
          {
            fr: '⚠️ Équipes non valides (doivent être affichées sur le site) : {teams}.',
            en: '⚠️ Invalid teams (must be published on the website): {teams}.'
          },
          { teams: unknownTeams.join(', ') }
        )
      });
      return true;
    }
  }

  if (!validateTeams(allTeams)) {
    await interaction.editReply({
      content: context.localizeText({
        fr: '⚠️ Tous les noms des équipes doivent être distincts.',
        en: '⚠️ Team names must all be unique.'
      })
    });
    return true;
  }

  const sameSide = matches.find((entry) => entry.team1_name.toLowerCase() === entry.team2_name.toLowerCase());
  if (sameSide) {
    await interaction.editReply({
      content: context.localizeText({
        fr: '⚠️ Les deux équipes d\'un même match doivent être différentes.',
        en: '⚠️ Each match must feature two different teams.'
      })
    });
    return true;
  }

  const createdMessages = [];
  const lastMatchNumber = matches.at(-1)?.match_number ?? null;

  try {
    for (const prediction of matches) {
      const payload = await buildPredictionPayload(
        prediction,
        { team1: 0, team2: 0, total: 0 },
        false,
        null,
        prediction.match_number === lastMatchNumber
      );
      const message = await channel.send({
        ...payload
      });

      const dbRecord = await upsertPredictionRecord({
        guild_id: context.guildId,
        message_id: message.id,
        channel_id: message.channelId,
        match_number: prediction.match_number,
        team1_name: prediction.team1_name,
        team2_name: prediction.team2_name,
        match_date: prediction.match_date
      });

      createdMessages.push({ message, dbRecord });
    }
  } catch (err) {
    context.error('Failed to create predictions:', err);
    await interaction.editReply({
      content: context.localizeText({
        fr: '❌ Impossible de créer les prédictions pour le moment (Supabase ou Discord indisponible).',
        en: '❌ Unable to create predictions right now (Supabase or Discord unavailable).'
      })
    });

    return true;
  }

  await interaction.editReply({
    content: context.localizeText({
      fr: '✅ Prédictions créées et publiées avec succès.',
      en: '✅ Predictions created and posted successfully.'
    })
  });

  return true;
}

async function handleVoteInteraction(interaction) {
  if (!interaction.isButton() || !interaction.customId.startsWith('lfn_pred')) {
    return false;
  }

  if (!interaction.guild || interaction.guild.id !== context.guildId) {
    return false;
  }

  const parts = interaction.customId.split('|');
  const selectedTeam = parts[2];

  if (!['team1', 'team2'].includes(selectedTeam)) {
    return false;
  }

  try {
    const isValidated = await isUserValidated(interaction.user.id);
    if (isValidated) {
      await interaction.reply({
        content: context.localizeText({
          fr: '🔒 Tes prédictions ont déjà été validées. Tu ne peux plus modifier ton vote.',
          en: '🔒 Your predictions have already been validated. You can no longer change your vote.'
        }),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    const prediction = await fetchPredictionByMessage(interaction.message.id);
    if (!prediction) {
      await interaction.reply({
        content: context.localizeText({
          fr: '❌ Impossible de retrouver ce vote. Le sondage est peut-être expiré.',
          en: '❌ Unable to find this prediction. It may have expired.'
        }),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    const voteResult = await upsertVote(prediction.id, interaction.user.id, selectedTeam);

    await updateMessage(interaction, prediction, false);

    if (voteResult.previousVote === voteResult.newVote) {
      await interaction.reply({
        content: context.localizeText({
          fr: '⚠️ Tu as déjà voté pour cette équipe.',
          en: '⚠️ You already voted for this team.'
        }),
        flags: MessageFlags.Ephemeral
      });
    } else if (!voteResult.previousVote) {
      await interaction.reply({
        content: context.localizeText(
          { fr: '✅ Vote enregistré pour {team}.', en: '✅ Vote recorded for {team}.' },
          { team: selectedTeam === 'team1' ? prediction.team1_name : prediction.team2_name }
        ),
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.reply({
        content: context.localizeText(
          { fr: '🔄 Vote changé de {oldTeam} vers {newTeam}.', en: '🔄 Vote changed from {oldTeam} to {newTeam}.' },
          {
            oldTeam: voteResult.previousVote === 'team1' ? prediction.team1_name : prediction.team2_name,
            newTeam: voteResult.newVote === 'team1' ? prediction.team1_name : prediction.team2_name
          }
        ),
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (err) {
    context.error('Vote handling failed:', err);
    await interaction.reply({
      content: context.localizeText({
        fr: '❌ Erreur lors de la prise en compte du vote (Supabase indisponible).',
        en: '❌ Error while processing the vote (Supabase unavailable).'
      }),
      flags: MessageFlags.Ephemeral
    });
  }

  return true;
}

async function isUserValidated(userId) {
  const { count, error } = await context.supabase
    .from('lfn_prediction_validations')
    .select('user_id', { count: 'exact', head: true })
    .eq('guild_id', context.guildId)
    .eq('user_id', userId)
    .eq('validated', true)
    .limit(1);

  if (error) {
    throw error;
  }

  return Boolean(count);
}

async function recordUserValidation(userId, matchIds) {
  if (!matchIds?.length) {
    return;
  }

  const validatedAt = new Date().toISOString();
  const payload = matchIds.map((matchId) => ({
    guild_id: context.guildId,
    match_id: matchId,
    user_id: userId,
    validated: true,
    validated_at: validatedAt
  }));
  const onConflict = VALIDATION_ON_CONFLICT;
  warnOnConflictMismatch(VALIDATION_ON_CONFLICT, onConflict, 'lfn_prediction_validations');

  const { error } = await context.supabase
    .from('lfn_prediction_validations')
    .upsert(payload, { onConflict });

  if (error) {
    throw error;
  }
}

async function fetchPredictionsForGuild() {
  const { data, error } = await context.supabase
    .from('lfn_predictions')
    .select('*')
    .eq('guild_id', context.guildId)
    .order('match_number', { ascending: true });

  if (error) {
    throw error;
  }

  return selectLatestPredictions(data || []);
}

function selectLatestPredictions(predictions) {
  const byMatch = new Map();
  for (const prediction of predictions) {
    if (![1, 2, 3, 4].includes(prediction.match_number)) {
      continue;
    }
    const existing = byMatch.get(prediction.match_number);
    const createdAt = prediction.created_at ? new Date(prediction.created_at).getTime() : 0;
    const existingTime = existing?.created_at ? new Date(existing.created_at).getTime() : 0;
    if (!existing || createdAt >= existingTime) {
      byMatch.set(prediction.match_number, prediction);
    }
  }

  return Array.from(byMatch.values()).sort((a, b) => a.match_number - b.match_number);
}

async function handleValidationInteraction(interaction) {
  if (!interaction.isButton() || interaction.customId !== VALIDATE_BUTTON_ID) {
    return false;
  }

  if (!interaction.guild || interaction.guild.id !== context.guildId) {
    return false;
  }

  try {
    const alreadyValidated = await isUserValidated(interaction.user.id);
    if (alreadyValidated) {
      await interaction.reply({
        content: context.localizeText({
          fr: '✅ Tes prédictions sont déjà validées.',
          en: '✅ Your predictions are already validated.'
        }),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    const predictions = await fetchPredictionsForGuild();
    if (!predictions.length) {
      await interaction.reply({
        content: context.localizeText({
          fr: '❌ Impossible de valider : aucun match disponible.',
          en: '❌ Unable to validate: no matches are available.'
        }),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    const predictionIds = predictions.map((prediction) => prediction.id);
    const { data: votes, error } = await context.supabase
      .from('lfn_prediction_votes')
      .select('prediction_id')
      .in('prediction_id', predictionIds)
      .eq('user_id', interaction.user.id);

    if (error) {
      throw error;
    }

    const votedIds = new Set((votes || []).map((vote) => vote.prediction_id));
    const missingMatches = predictions
      .filter((prediction) => !votedIds.has(prediction.id))
      .map((prediction) => prediction.match_number);

    if (missingMatches.length) {
      await interaction.reply({
        content: context.localizeText(
          {
            fr: '⚠️ Tu dois voter sur tous les matchs avant de valider (manquants : {matches}).',
            en: '⚠️ You must vote on every match before validating (missing: {matches}).'
          },
          { matches: missingMatches.join(', ') }
        ),
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    await recordUserValidation(interaction.user.id, predictionIds);

    await interaction.reply({
      content: context.localizeText({
        fr: '✅ Tes prédictions sont validées. Tu ne peux plus les modifier.',
        en: '✅ Your predictions are validated. You can no longer change them.'
      }),
      flags: MessageFlags.Ephemeral
    });
  } catch (err) {
    context.error('Validation handling failed:', err);
    await interaction.reply({
      content: context.localizeText({
        fr: '❌ Impossible de valider tes prédictions pour le moment.',
        en: '❌ Unable to validate your predictions right now.'
      }),
      flags: MessageFlags.Ephemeral
    });
  }

  return true;
}

async function handleCloseCommand(interaction) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'close_predictions') {
    return false;
  }

  const hasPermission = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild);
  if (!hasPermission) {
    await interaction.reply({
      content: context.localizeText({
        fr: "❌ Vous n'avez pas la permission d'utiliser cette commande.",
        en: "❌ You don't have permission to use this command."
      }),
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const targetMatch = interaction.options.getInteger('match_number');
  const query = context.supabase.from('lfn_predictions').select('*').eq('guild_id', context.guildId);
  if (targetMatch) {
    query.eq('match_number', targetMatch);
  }

  try {
    const lastMatchNumber = await fetchLastPredictionMatchNumber();
    const { data: predictions, error } = await query.order('match_number', { ascending: true });
    if (error) {
      throw error;
    }

    if (!predictions?.length) {
      await interaction.editReply({
        content: context.localizeText({
          fr: '⚠️ Aucun sondage de prédictions trouvé.',
          en: '⚠️ No prediction polls found.'
        })
      });
      return true;
    }

    for (const prediction of predictions) {
      try {
        const channel = await context.client.channels.fetch(prediction.channel_id);
        if (!channel?.isTextBased()) {
          context.warn(`Channel ${prediction.channel_id} is not accessible.`);
          continue;
        }

        const message = await channel.messages.fetch(prediction.message_id);
        const stats = await fetchVoteCounts(prediction.id);
        const payload = await buildPredictionPayload(
          prediction,
          stats,
          true,
          null,
          prediction.match_number === lastMatchNumber
        );
        await message.edit(payload);
      } catch (err) {
        context.warn('Unable to close prediction message:', err);
      }
    }

    await interaction.editReply({
      content: context.localizeText({
        fr: '✅ Prédictions fermées. Les boutons sont désormais désactivés.',
        en: '✅ Predictions closed. Buttons are now disabled.'
      })
    });
  } catch (err) {
    context.error('Failed to close predictions:', err);
    await interaction.editReply({
      content: context.localizeText({
        fr: '❌ Impossible de fermer les prédictions pour le moment.',
        en: '❌ Unable to close predictions right now.'
      })
    });
  }

  return true;
}

async function handleAnnounceCommand(interaction) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'announce_predictions') {
    return false;
  }

  const hasPermission = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild);
  if (!hasPermission) {
    await interaction.reply({
      content: context.localizeText({
        fr: "❌ Vous n'avez pas la permission d'utiliser cette commande.",
        en: "❌ You don't have permission to use this command."
      }),
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const predictions = await fetchPredictionsForGuild();
    if (!predictions.length) {
      await interaction.editReply({
        content: context.localizeText({
          fr: '❌ Impossible d’annoncer les gagnants : aucun match disponible.',
          en: '❌ Unable to announce winners: no matches are available.'
        })
      });
      return true;
    }

    const winnersByMatch = new Map();
    const lastMatchNumber = predictions.at(-1)?.match_number ?? null;
    for (const prediction of predictions) {
      const winnerChoice = interaction.options.getInteger(`match${prediction.match_number}_winner`);
      if (!winnerChoice) {
        await interaction.editReply({
          content: context.localizeText(
            {
              fr: '⚠️ Tu dois fournir un gagnant pour le match {match}.',
              en: '⚠️ You must provide a winner for match {match}.'
            },
            { match: prediction.match_number }
          )
        });
        return true;
      }
      const winnerKey = winnerChoice === 1 ? 'team1' : 'team2';
      winnersByMatch.set(prediction.match_number, winnerKey);
    }

    for (const prediction of predictions) {
      try {
        const channel = await context.client.channels.fetch(prediction.channel_id);
        if (!channel?.isTextBased()) {
          context.warn(`Channel ${prediction.channel_id} is not accessible.`);
          continue;
        }

        const message = await channel.messages.fetch(prediction.message_id);
        const stats = await fetchVoteCounts(prediction.id);
        const winnerKey = winnersByMatch.get(prediction.match_number);
        const payload = await buildPredictionPayload(
          prediction,
          stats,
          true,
          winnerKey,
          prediction.match_number === lastMatchNumber
        );
        await message.edit(payload);
      } catch (err) {
        context.warn('Unable to announce prediction winner:', err);
      }
    }

    const validatedUsers = await fetchValidatedUsers();
    const winners = await assignPerfectPredictionRole(validatedUsers, predictions, winnersByMatch);

    await interaction.editReply({
      content: context.localizeText(
        {
          fr: '🏆 Gagnants annoncés. {count} participant(s) ont toutes les bonnes prédictions.',
          en: '🏆 Winners announced. {count} participant(s) have all predictions correct.'
        },
        { count: winners.length }
      )
    });
  } catch (err) {
    context.error('Failed to announce prediction winners:', err);
    await interaction.editReply({
      content: context.localizeText({
        fr: '❌ Impossible d’annoncer les gagnants pour le moment.',
        en: '❌ Unable to announce winners right now.'
      })
    });
  }

  return true;
}

async function fetchValidatedUsers() {
  const { data, error } = await context.supabase
    .from('lfn_prediction_validations')
    .select('user_id')
    .eq('guild_id', context.guildId)
    .eq('validated', true);

  if (error) {
    throw error;
  }

  return Array.from(new Set((data || []).map((entry) => entry.user_id)));
}

async function assignPerfectPredictionRole(userIds, predictions, winnersByMatch) {
  if (!userIds.length) {
    return [];
  }

  const predictionIds = predictions.map((prediction) => prediction.id);
  const { data: votes, error } = await context.supabase
    .from('lfn_prediction_votes')
    .select('user_id, prediction_id, voted_team')
    .in('user_id', userIds)
    .in('prediction_id', predictionIds);

  if (error) {
    throw error;
  }

  const votesByUser = new Map();
  for (const vote of votes || []) {
    if (!votesByUser.has(vote.user_id)) {
      votesByUser.set(vote.user_id, new Map());
    }
    votesByUser.get(vote.user_id).set(vote.prediction_id, vote.voted_team);
  }

  const winnerByPredictionId = new Map(
    predictions.map((prediction) => [prediction.id, winnersByMatch.get(prediction.match_number)])
  );

  const winners = [];
  for (const userId of userIds) {
    const userVotes = votesByUser.get(userId);
    if (!userVotes) {
      continue;
    }

    const hasPerfect = predictions.every((prediction) => {
      const votedTeam = userVotes.get(prediction.id);
      return votedTeam && votedTeam === winnerByPredictionId.get(prediction.id);
    });

    if (hasPerfect) {
      winners.push(userId);
    }
  }

  if (!winners.length) {
    return [];
  }

  const guild = await interactionGuildOrFetch();
  for (const userId of winners) {
    try {
      const member = await guild.members.fetch(userId);
      if (!member.roles.cache.has(PERFECT_PREDICTIONS_ROLE_ID)) {
        await member.roles.add(PERFECT_PREDICTIONS_ROLE_ID);
      }
    } catch (err) {
      context.warn(`Unable to grant perfect prediction role to ${userId}:`, err);
    }
  }

  return winners;
}

async function interactionGuildOrFetch() {
  if (context?.client?.guilds?.cache?.has(context.guildId)) {
    return context.client.guilds.cache.get(context.guildId);
  }

  return context.client.guilds.fetch(context.guildId);
}

async function handleInteraction(interaction) {
  if (!context) {
    return false;
  }

  if (interaction.isAutocomplete()) {
    return handleAutocomplete(interaction);
  }

  if (interaction.isChatInputCommand() && interaction.commandName === 'predictions') {
    return handlePredictionsCommand(interaction);
  }

  if (await handleValidationInteraction(interaction)) {
    return true;
  }

  if (await handleVoteInteraction(interaction)) {
    return true;
  }

  if (await handleCloseCommand(interaction)) {
    return true;
  }

  return handleAnnounceCommand(interaction);
}

async function handleAutocomplete(interaction) {
  if (!interaction.isAutocomplete() || interaction.commandName !== 'predictions') {
    return false;
  }

  try {
    const focused = interaction.options.getFocused(true);
    const focusedValue = String(focused?.value || '').toLowerCase();
    const teams = await fetchPublicTeams();
    const alreadySelected = new Set(
      [1, 2, 3, 4]
        .flatMap((match) => [
          interaction.options.getString(`match${match}_team1`),
          interaction.options.getString(`match${match}_team2`)
        ])
        .filter(Boolean)
        .map((name) => name.toLowerCase())
    );

    const suggestions = teams
      .filter((team) => team.name.toLowerCase().includes(focusedValue))
      .filter((team) => !alreadySelected.has(team.name.toLowerCase()) || team.name.toLowerCase() === focusedValue)
      .slice(0, 25)
      .map((team) => ({ name: team.name, value: team.name }));

    await interaction.respond(suggestions);
  } catch (err) {
    context.warn('Prediction autocomplete failed:', err);
    try {
      await interaction.respond([]);
    } catch {
      // no-op
    }
  }

  return true;
}

module.exports = {
  initPredictionContext,
  registerCommands,
  handleInteraction
};
