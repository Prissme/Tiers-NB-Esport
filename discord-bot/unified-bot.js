'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  Partials,
  PermissionsBitField,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

const LOG_PREFIX = '[UnifiedBot]';
const TEAM_SIZE = 3;
const MATCH_SIZE = TEAM_SIZE * 2;
const DEFAULT_ELO = 1000;
const K_FACTOR = 30;
const ELO_DIVISOR = 400;
const TIER_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MIN_VOTES_TO_RESOLVE = 4;
const MAP_CHOICES_COUNT = 3;
const ROOM_TIER_ORDER = ['E', 'D', 'C', 'B', 'A', 'S'];

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const MATCH_CHANNEL_ID = process.env.MATCH_CHANNEL_ID || '1434509931360419890';
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || '1237166689188053023';
const PING_ROLE_ID = process.env.PING_ROLE_ID || '1437211411096010862';

const ROLE_TIER_S = process.env.ROLE_TIER_S;
const ROLE_TIER_A = process.env.ROLE_TIER_A;
const ROLE_TIER_B = process.env.ROLE_TIER_B;
const ROLE_TIER_C = process.env.ROLE_TIER_C;
const ROLE_TIER_D = process.env.ROLE_TIER_D;
const ROLE_TIER_E = process.env.ROLE_TIER_E;

const TIER_DISTRIBUTION = [
  { tier: 'S', ratio: 0.005, minCount: 1 },
  { tier: 'A', ratio: 0.02, minCount: 1 },
  { tier: 'B', ratio: 0.04, minCount: 1 },
  { tier: 'C', ratio: 0.1, minCount: 1 },
  { tier: 'D', ratio: 0.28, minCount: 1 },
  { tier: 'E', ratio: 0.555, minCount: 1 }
];

function computeTierBoundaries(totalPlayers) {
  if (!totalPlayers || totalPlayers <= 0) {
    return [];
  }

  let remaining = totalPlayers;
  const boundaries = [];

  for (let index = 0; index < TIER_DISTRIBUTION.length; index += 1) {
    const distribution = TIER_DISTRIBUTION[index];
    const isLastTier = index === TIER_DISTRIBUTION.length - 1;

    let count;
    if (isLastTier) {
      count = remaining;
    } else {
      const futureMin = TIER_DISTRIBUTION.slice(index + 1).reduce(
        (sum, entry) => sum + (entry.minCount || 0),
        0
      );

      count = Math.floor(totalPlayers * distribution.ratio);
      if (count < distribution.minCount) {
        count = distribution.minCount;
      }

      const maxAllowed = remaining - futureMin;
      if (count > maxAllowed) {
        count = Math.max(distribution.minCount || 0, maxAllowed);
      }
    }

    remaining -= count;
    boundaries.push({ tier: distribution.tier, endRank: totalPlayers - remaining });

    if (remaining <= 0) {
      break;
    }
  }

  return boundaries;
}

function getTierByRank(rank, boundaries) {
  if (!Array.isArray(boundaries) || boundaries.length === 0) {
    return null;
  }

  for (const boundary of boundaries) {
    if (rank <= boundary.endRank) {
      return boundary.tier;
    }
  }

  return null;
}

const MAP_ROTATION = [
  { mode: 'Razzia de gemmes', map: 'Mine hard-rock', emoji: '<:GemGrab:1436473738765008976>' },
  { mode: 'Razzia de gemmes', map: 'Tunnel de mine', emoji: '<:GemGrab:1436473738765008976>' },
  { mode: 'Razzia de gemmes', map: 'Bruissements', emoji: '<:GemGrab:1436473738765008976>' },
  { mode: 'Brawlball', map: 'Tir au buts', emoji: '<:Brawlball:1436473735573143562>' },
  { mode: 'Brawlball', map: 'Super plage', emoji: '<:Brawlball:1436473735573143562>' },
  { mode: 'Brawlball', map: 'Triple Dribble', emoji: '<:Brawlball:1436473735573143562>' },
  { mode: 'Hors-jeu', map: 'Rocher de la belle', emoji: '<:KnockOut:1436473703083937914>' },
  { mode: 'Hors-jeu', map: "Ravin du bras d'or", emoji: '<:KnockOut:1436473703083937914>' },
  { mode: 'Hors-jeu', map: 'À découvert', emoji: '<:KnockOut:1436473703083937914>' },
  { mode: 'Braquage', map: "C'est chaud patate", emoji: '<:Heist:1436473730812481546>' },
  { mode: 'Braquage', map: 'Arrêt au stand', emoji: '<:Heist:1436473730812481546>' },
  { mode: 'Braquage', map: 'Zone sécurisée', emoji: '<:Heist:1436473730812481546>' },
  { mode: 'Zone réservée', map: 'Duel de scarabées', emoji: '<:HotZone:1436473698491175137>' },
  { mode: 'Zone réservée', map: 'Cercle de feu', emoji: '<:HotZone:1436473698491175137>' },
  { mode: 'Zone réservée', map: 'Stratégies parallèles', emoji: '<:HotZone:1436473698491175137>' },
  { mode: 'Prime', map: 'Cachette secrète', emoji: '<:Bounty:1436473727519948962>' },
  { mode: 'Prime', map: 'Étoile filante', emoji: '<:Bounty:1436473727519948962>' },
  { mode: 'Prime', map: 'Mille-feuille', emoji: '<:Bounty:1436473727519948962>' }
];

if (!DISCORD_BOT_TOKEN) {
  throw new Error('DISCORD_BOT_TOKEN is not set.');
}

if (!DISCORD_GUILD_ID) {
  throw new Error('DISCORD_GUILD_ID is not set.');
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Supabase configuration is incomplete. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

function createSupabaseClient() {
  return supabase;
}

const tierRoleMap = {
  S: ROLE_TIER_S,
  A: ROLE_TIER_A,
  B: ROLE_TIER_B,
  C: ROLE_TIER_C,
  D: ROLE_TIER_D,
  E: ROLE_TIER_E
};

const missingRoles = Object.entries(tierRoleMap)
  .filter(([, roleId]) => !roleId)
  .map(([tier]) => tier);

if (missingRoles.length) {
  console.warn(`${LOG_PREFIX} Missing role IDs for tiers: ${missingRoles.join(', ')}.`);
}

let client = null;
let guild = null;
let matchChannel = null;
let logChannel = null;
let tierSyncInterval = null;
let botStarted = false;

const matchQueue = [];
const queueEntries = new Map();
const activeMatches = new Map();
const pendingRoomForms = new Map();
const customRooms = new Map();

const LANGUAGE_FR = 'fr';
const LANGUAGE_EN = 'en';
const DEFAULT_LANGUAGE = LANGUAGE_FR;

let currentLanguage =
  process.env.DEFAULT_BOT_LANGUAGE && process.env.DEFAULT_BOT_LANGUAGE.toLowerCase() === LANGUAGE_EN
    ? LANGUAGE_EN
    : DEFAULT_LANGUAGE;

function formatTemplate(template, variables = {}) {
  if (typeof template !== 'string') {
    return template ?? '';
  }

  return template.replace(/\{(\w+)\}/g, (_, key) => (variables[key] ?? `{${key}}`));
}

function localizeText(template, variables = {}) {
  if (template == null) {
    return '';
  }

  if (typeof template === 'string') {
    return formatTemplate(template, variables);
  }

  const selected =
    currentLanguage === LANGUAGE_EN
      ? template.en ?? template.fr ?? ''
      : template.fr ?? template.en ?? '';

  return formatTemplate(selected, variables);
}

function findRoomByMember(userId) {
  for (const room of customRooms.values()) {
    if (room.members?.has(userId)) {
      return room;
    }
  }
  return null;
}

function findActiveMatchByParticipant(userId) {
  for (const matchState of activeMatches.values()) {
    if (!matchState.resolved && matchState.participants?.has(userId)) {
      return matchState;
    }
  }

  return null;
}

function log(...args) {
  console.log(LOG_PREFIX, ...args);
}

function warn(...args) {
  console.warn(LOG_PREFIX, ...args);
}

function errorLog(...args) {
  console.error(LOG_PREFIX, ...args);
}

function pickRandomMaps(count) {
  const available = MAP_ROTATION.slice();
  const selections = [];

  for (let i = available.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  for (let i = 0; i < Math.min(count, available.length); i += 1) {
    selections.push(available[i]);
  }

  return selections;
}

function normalizeRating(value) {
  return typeof value === 'number' ? value : DEFAULT_ELO;
}

function normalizeTierInput(value) {
  if (!value) {
    return null;
  }

  const cleaned = value.toString().trim().toUpperCase();
  return ROOM_TIER_ORDER.includes(cleaned) ? cleaned : null;
}

function isValidTierRange(minTier, maxTier) {
  const minIndex = ROOM_TIER_ORDER.indexOf(minTier);
  const maxIndex = ROOM_TIER_ORDER.indexOf(maxTier);

  return minIndex !== -1 && maxIndex !== -1 && minIndex <= maxIndex;
}

function calculateWeightedScore(soloElo, mmr) {
  const safeSoloElo = normalizeRating(soloElo);
  const safeMmr = normalizeRating(mmr);
  return Math.round(safeSoloElo * 0.3 + safeMmr * 0.7);
}

function formatPlayerList(team) {
  if (!team.length) {
    return '—';
  }

  return team
    .map(
      (player, index) =>
        `${index + 1}. <@${player.discordId}> (${Math.round(normalizeRating(player.soloElo))} Elo)`
    )
    .join('\n');
}

function calculateAverageElo(team) {
  if (!team.length) {
    return DEFAULT_ELO;
  }

  const total = team.reduce((sum, player) => sum + normalizeRating(player.soloElo), 0);
  return total / team.length;
}

function buildPrivateMatchEmbed(state) {
  const { requestedBy, primaryMap, mapChoices = [], teams, createdAt } = state;
  const title = primaryMap
    ? `${primaryMap.emoji} ${primaryMap.mode} — ${primaryMap.map}`
    : localizeText({ fr: 'Partie privée', en: 'Private match' });

  const embed = new EmbedBuilder()
    .setTitle(
      localizeText({ fr: 'Partie privée — {title}', en: 'Private match — {title}' }, { title })
    )
    .setDescription(
      localizeText({ fr: 'Proposée par <@{userId}>', en: 'Created by <@{userId}>' }, { userId: requestedBy })
    )
    .addFields(
      {
        name: localizeText({ fr: 'Équipe Bleue', en: 'Blue team' }),
        value: formatPlayerList(teams.blue),
        inline: true
      },
      {
        name: localizeText({ fr: 'Équipe Rouge', en: 'Red team' }),
        value: formatPlayerList(teams.red),
        inline: true
      }
    )
    .setTimestamp(createdAt || new Date())
    .setColor(0x9b59b6)
    .setFooter({
      text: localizeText({
        fr: 'Match amical — aucun résultat enregistré',
        en: 'Friendly match — no result recorded'
      })
    });

  if (mapChoices.length) {
    const mapLines = mapChoices
      .map((choice, index) => `${index + 1}. ${choice.emoji} ${choice.mode} — ${choice.map}`)
      .join('\n');
    embed.addFields({
      name: localizeText({ fr: 'Maps proposées', en: 'Suggested maps' }),
      value: mapLines
    });
  }

  const blueAvg = calculateAverageElo(teams.blue);
  const redAvg = calculateAverageElo(teams.red);
  const diff = Math.abs(blueAvg - redAvg);

  embed.addFields({
    name: localizeText({ fr: 'Équilibre Elo', en: 'Elo balance' }),
    value: [
      localizeText({ fr: 'Bleus : {value}', en: 'Blue: {value}' }, { value: Math.round(blueAvg) }),
      localizeText({ fr: 'Rouges : {value}', en: 'Red: {value}' }, { value: Math.round(redAvg) }),
      localizeText({ fr: 'Écart : {value}', en: 'Difference: {value}' }, { value: Math.round(diff) })
    ].join('\n')
  });

  return embed;
}

function buildMatchEmbed(state, resultSummary = null) {
  const { primaryMap, mapChoices = [], teams, createdAt, votes } = state;
  const title = primaryMap
    ? `${primaryMap.emoji} ${primaryMap.mode} — ${primaryMap.map}`
    : localizeText({ fr: 'Match en attente', en: 'Match pending' });

  const embed = new EmbedBuilder()
    .setTitle(title)
    .addFields(
      {
        name: localizeText({ fr: 'Équipe Bleue', en: 'Blue team' }),
        value: formatPlayerList(teams.blue),
        inline: true
      },
      {
        name: localizeText({ fr: 'Équipe Rouge', en: 'Red team' }),
        value: formatPlayerList(teams.red),
        inline: true
      }
    )
    .setTimestamp(createdAt || new Date())
    .setColor(resultSummary ? resultSummary.color : 0xffc300);

  if (mapChoices.length) {
    const mapLines = mapChoices
      .map((choice, index) => `${index + 1}. ${choice.emoji} ${choice.mode} — ${choice.map}`)
      .join('\n');
    embed.addFields({
      name: localizeText({ fr: 'Maps proposées', en: 'Suggested maps' }),
      value: mapLines
    });
  }

  if (resultSummary) {
    embed.addFields({
      name: localizeText({ fr: 'Résultat', en: 'Result' }),
      value: resultSummary.text
    });
  } else {
    if (votes) {
      const voteLines = [
        localizeText({ fr: '🔵 Victoire Bleue : {count}', en: '🔵 Blue victory: {count}' }, { count: votes.blue.size }),
        localizeText({ fr: '🔴 Victoire Rouge : {count}', en: '🔴 Red victory: {count}' }, { count: votes.red.size }),
        localizeText({ fr: '⚪ Match annulé : {count}', en: '⚪ Match cancelled: {count}' }, {
          count: votes.cancel.size
        })
      ].join('\n');
      embed.addFields({ name: localizeText({ fr: 'Votes', en: 'Votes' }), value: voteLines });
    }

    embed.setFooter({
      text: localizeText(
        {
          fr: 'Votez pour le résultat avec les boutons ci-dessous. ({count} votes nécessaires)',
          en: 'Vote for the result using the buttons below. ({count} votes required)'
        },
        { count: MIN_VOTES_TO_RESOLVE }
      )
    });
  }

  return embed;
}

function buildResultButtons(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('match:blue')
      .setLabel(localizeText({ fr: 'Victoire Bleue', en: 'Blue victory' }))
      .setEmoji('🔵')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('match:red')
      .setLabel(localizeText({ fr: 'Victoire Rouge', en: 'Red victory' }))
      .setEmoji('🔴')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('match:cancel')
      .setLabel(localizeText({ fr: 'Match annulé', en: 'Match cancelled' }))
      .setEmoji('⚪')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled)
  );
}

function calculateExpectedScore(rating, opponentRating) {
  return 1 / (1 + Math.pow(10, (opponentRating - rating) / ELO_DIVISOR));
}

async function fetchPlayerByDiscordId(discordId) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase error while fetching player ${discordId}: ${error.message}`);
  }

  return data || null;
}

async function getOrCreatePlayer(discordId, displayName) {
  const existing = await fetchPlayerByDiscordId(discordId);
  if (existing) {
    const mmr = normalizeRating(existing.mmr);
    const soloElo = normalizeRating(existing.solo_elo);

    if (displayName && displayName !== existing.name) {
      const { error: updateError } = await supabase
        .from('players')
        .update({ name: displayName })
        .eq('id', existing.id);

      if (updateError) {
        warn(`Unable to sync display name for player ${discordId}:`, updateError.message);
      }
    }

    return { ...existing, mmr, solo_elo: soloElo };
  }

  const insertPayload = {
    discord_id: discordId,
    name: displayName || null,
    mmr: DEFAULT_ELO,
    solo_elo: DEFAULT_ELO,
    wins: 0,
    losses: 0,
    games_played: 0,
    active: true
  };

  const { data: inserted, error } = await supabase
    .from('players')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to create player ${discordId}: ${error.message}`);
  }

  log(`Created new player entry for ${discordId}.`);
  return inserted;
}

function buildQueueEntry(member, playerRecord) {
  const wins = typeof playerRecord.wins === 'number' ? playerRecord.wins : 0;
  const losses = typeof playerRecord.losses === 'number' ? playerRecord.losses : 0;
  const games = typeof playerRecord.games_played === 'number' ? playerRecord.games_played : wins + losses;

  return {
    discordId: member.id,
    displayName: member.displayName || member.user.username,
    playerId: playerRecord.id,
    mmr: normalizeRating(playerRecord.mmr),
    soloElo: normalizeRating(playerRecord.solo_elo),
    wins,
    losses,
    games,
    joinedAt: new Date()
  };
}

function formatQueueStatus() {
  if (!matchQueue.length) {
    return localizeText({
      fr: 'La file est vide. Utilisez `!join` pour participer.',
      en: 'The queue is empty. Use `!join` to participate.'
    });
  }

  const lines = matchQueue.map((entry, index) => {
    const rank = index + 1;
    return formatTemplate('{rank}. {name} ({elo} Elo)', {
      rank,
      name: entry.displayName,
      elo: Math.round(normalizeRating(entry.soloElo))
    });
  });

  return [
    localizeText({
      fr: 'Joueurs dans la file ({count}/{size}) :',
      en: 'Players in queue ({count}/{size}):'
    }, { count: matchQueue.length, size: MATCH_SIZE }),
    ...lines
  ].join('\n');
}

function computeTeamCombinations(players, teamSize) {
  const results = [];

  function helper(start, combo) {
    if (combo.length === teamSize) {
      results.push(combo.slice());
      return;
    }

    for (let i = start; i < players.length; i += 1) {
      combo.push(players[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }

  helper(0, []);
  return results;
}

function balanceTeams(players) {
  const combinations = computeTeamCombinations(players, TEAM_SIZE);
  let best = null;

  for (const combo of combinations) {
    const blue = combo;
    const red = players.filter((player) => !blue.includes(player));

    const blueAvg = blue.reduce((sum, player) => sum + normalizeRating(player.soloElo), 0) / TEAM_SIZE;
    const redAvg = red.reduce((sum, player) => sum + normalizeRating(player.soloElo), 0) / TEAM_SIZE;
    const diff = Math.abs(blueAvg - redAvg);

    if (!best || diff < best.diff) {
      best = { blue: [...blue], red: [...red], diff };
    }
  }

  return {
    blue: best.blue.sort((a, b) => normalizeRating(b.soloElo) - normalizeRating(a.soloElo)),
    red: best.red.sort((a, b) => normalizeRating(b.soloElo) - normalizeRating(a.soloElo))
  };
}

async function sendLogMessage(content) {
  if (!logChannel || !logChannel.isTextBased()) {
    return;
  }

  try {
    await logChannel.send(content);
  } catch (err) {
    warn('Unable to send log message:', err.message);
  }
}

async function handleCreateRoomCommand(message) {
  const leaderId = message.author.id;

  for (const [requestId, entry] of pendingRoomForms.entries()) {
    if (entry.leaderId === leaderId) {
      pendingRoomForms.delete(requestId);
    }
  }

  const requestId = `${Date.now()}-${leaderId}`;
  pendingRoomForms.set(requestId, { leaderId, channelId: message.channel.id, createdAt: Date.now() });

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`room:open:${requestId}`)
      .setLabel(localizeText({ fr: 'Remplir le formulaire', en: 'Fill out the form' }))
      .setStyle(ButtonStyle.Primary)
  );

  await message.reply({
    content: localizeText({
      fr: 'Cliquez sur le bouton pour renseigner le code de la room et les tiers autorisés. Seul le créateur peut remplir ce formulaire.',
      en: 'Click the button to provide the room code and allowed tiers. Only the creator can submit this form.'
    }),
    components: [actionRow]
  });
}

async function handleRoomJoinRequest(message, leaderUser) {
  const room = customRooms.get(leaderUser.id);

  if (!room) {
    await message.reply({
      content: localizeText({
        fr: 'Aucune room active trouvée pour <@{leaderId}>.',
        en: 'No active room found for <@{leaderId}>.'
      }, { leaderId: leaderUser.id })
    });
    return;
  }

  if (!room.members) {
    room.members = new Set([room.leaderId]);
  }

  if (room.members.has(message.author.id)) {
    await message.reply({
      content: localizeText({
        fr: 'Vous êtes déjà inscrit dans cette room.',
        en: 'You are already registered in this room.'
      })
    });
    return;
  }

  room.members.add(message.author.id);

  await message.reply({
    content: localizeText(
      {
        fr: '✅ <@{memberId}> a rejoint la room de <@{leaderId}>.\nCode de la room : `{code}`\nTiers autorisés : {minTier} → {maxTier}',
        en: '✅ <@{memberId}> joined <@{leaderId}>\'s room.\nRoom code: `{code}`\nAllowed tiers: {minTier} → {maxTier}'
      },
      {
        memberId: message.author.id,
        leaderId: leaderUser.id,
        code: room.code,
        minTier: room.minTier,
        maxTier: room.maxTier
      }
    )
  });
}

async function handleRoomInfoCommand(message) {
  const room = findRoomByMember(message.author.id);

  if (!room) {
    await message.reply({
      content: localizeText({
        fr: "Vous n'êtes inscrit dans aucune room personnalisée.",
        en: 'You are not in any custom room.'
      })
    });
    return;
  }

  const members = [...room.members].map((id) => `<@${id}>`).join(', ');
  const embed = new EmbedBuilder()
    .setTitle(localizeText({ fr: 'Room personnalisée', en: 'Custom room' }))
    .setDescription(
      localizeText({ fr: 'Créée par <@{leaderId}>', en: 'Created by <@{leaderId}>' }, { leaderId: room.leaderId })
    )
    .addFields(
      {
        name: localizeText({ fr: 'Code', en: 'Code' }),
        value: `\`${room.code}\``,
        inline: true
      },
      {
        name: localizeText({ fr: 'Tiers', en: 'Tiers' }),
        value: `${room.minTier} → ${room.maxTier}`,
        inline: true
      },
      {
        name: localizeText({ fr: 'Membres', en: 'Members' }),
        value: members || localizeText({ fr: '—', en: '—' })
      }
    )
    .setColor(0x2ecc71)
    .setTimestamp(room.createdAt);

  await message.reply({ embeds: [embed] });
}

async function handleRoomLeaveCommand(message) {
  const room = findRoomByMember(message.author.id);

  if (!room) {
    await message.reply({
      content: localizeText({
        fr: "Vous n'êtes inscrit dans aucune room personnalisée.",
        en: 'You are not in any custom room.'
      })
    });
    return;
  }

  if (room.leaderId === message.author.id) {
    customRooms.delete(room.leaderId);
    await message.reply({
      content: localizeText({
        fr: 'Vous avez fermé votre room personnalisée.',
        en: 'You closed your custom room.'
      })
    });
    return;
  }

  room.members?.delete(message.author.id);
  await message.reply({
    content: localizeText(
      { fr: 'Vous avez quitté la room de <@{leaderId}>.', en: 'You left <@{leaderId}>\'s room.' },
      { leaderId: room.leaderId }
    )
  });
}

async function handleJoinCommand(message, args) {
  const mentionedUser = message.mentions.users.first();

  if (mentionedUser) {
    await handleRoomJoinRequest(message, mentionedUser);
    return;
  }

  const member = message.member || (guild ? await guild.members.fetch(message.author.id).catch(() => null) : null);

  if (!member) {
    await message.reply({
      content: localizeText({
        fr: 'Impossible de récupérer votre profil Discord.',
        en: 'Unable to retrieve your Discord profile.'
      })
    });
    return;
  }

  const activeMatch = findActiveMatchByParticipant(member.id);

  if (activeMatch) {
    await message.reply({
      content: localizeText({
        fr: 'Vous êtes déjà inscrit dans un match en attente. Attendez sa validation avant de rejoindre la file.',
        en: 'You are already part of a pending match. Wait for it to be validated before joining the queue.'
      })
    });
    return;
  }

  if (queueEntries.has(member.id)) {
    await message.reply({
      content: localizeText({
        fr: "Vous êtes déjà dans la file d'attente.",
        en: 'You are already in the queue.'
      })
    });
    return;
  }

  let playerRecord;
  try {
    playerRecord = await getOrCreatePlayer(member.id, member.displayName || member.user.username);
  } catch (err) {
    errorLog('Failed to join queue:', err);
    await message.reply({
      content: localizeText({
        fr: "Erreur lors de l'accès à la base de données. Réessayez plus tard.",
        en: 'Database error. Please try again later.'
      })
    });
    return;
  }

  const entry = buildQueueEntry(member, playerRecord);
  matchQueue.push(entry);
  queueEntries.set(member.id, entry);

  await message.reply({
    content: localizeText(
      {
        fr: '✅ {name} a rejoint la file.\n{status}',
        en: '✅ {name} joined the queue.\n{status}'
      },
      { name: entry.displayName, status: formatQueueStatus() }
    )
  });

  if (matchQueue.length >= MATCH_SIZE) {
    const participants = matchQueue.splice(0, MATCH_SIZE);
    participants.forEach((player) => queueEntries.delete(player.discordId));

    try {
      await startMatch(participants, message.channel);
    } catch (err) {
      errorLog('Failed to start match:', err);
      await message.channel.send(
        localizeText({
          fr: '❌ Impossible de créer la partie. La file est réinitialisée.',
          en: '❌ Unable to create the match. The queue has been restored.'
        })
      );
      participants.forEach((player) => {
        matchQueue.push(player);
        queueEntries.set(player.discordId, player);
      });
    }
  }
}

async function handleLeaveCommand(message) {
  const memberId = message.author.id;
  const entry = queueEntries.get(memberId);

  if (!entry) {
    await message.reply({
      content: localizeText({
        fr: "Vous n'êtes pas dans la file.",
        en: 'You are not in the queue.'
      })
    });
    return;
  }

  const index = matchQueue.findIndex((player) => player.discordId === memberId);
  if (index !== -1) {
    matchQueue.splice(index, 1);
  }

  queueEntries.delete(memberId);
  await message.reply({
    content: localizeText(
      { fr: '🚪 {name} a quitté la file.\n{status}', en: '🚪 {name} left the queue.\n{status}' },
      { name: entry.displayName, status: formatQueueStatus() }
    )
  });
}

async function handleQueueCommand(message) {
  await message.reply({ content: formatQueueStatus() });
}

async function handleEloCommand(message) {
  const mention = message.mentions.users.first();
  const targetId = mention ? mention.id : message.author.id;

  let player;
  try {
    player = await fetchPlayerByDiscordId(targetId);
  } catch (err) {
    errorLog('Failed to fetch player elo:', err);
    await message.reply({
      content: localizeText({
        fr: 'Erreur lors de la récupération du classement.',
        en: 'Error while fetching rankings.'
      })
    });
    return;
  }

  if (!player) {
    await message.reply({
      content: localizeText({
        fr: 'Aucun profil Elo trouvé pour ce joueur.',
        en: 'No Elo profile found for this player.'
      })
    });
    return;
  }

  const wins = typeof player.wins === 'number' ? player.wins : 0;
  const losses = typeof player.losses === 'number' ? player.losses : 0;
  const games = typeof player.games_played === 'number' ? player.games_played : wins + losses;
  const soloElo = normalizeRating(player.solo_elo);
  const mmr = normalizeRating(player.mmr);
  const weightedScore = calculateWeightedScore(soloElo, mmr);

  const embed = new EmbedBuilder()
    .setTitle(
      localizeText({
        fr: 'Profil Elo — {name}',
        en: 'Elo profile — {name}'
      }, { name: player.name || localizeText({ fr: `Joueur ${targetId}`, en: `Player ${targetId}` }) })
    )
    .addFields(
      { name: 'Elo', value: `${Math.round(soloElo)}`, inline: true },
      { name: 'MMR', value: `${Math.round(mmr)}`, inline: true },
      {
        name: localizeText({ fr: 'Score pondéré', en: 'Weighted score' }),
        value: `${weightedScore}`,
        inline: true
      },
      { name: localizeText({ fr: 'Victoires', en: 'Wins' }), value: `${wins}`, inline: true },
      { name: localizeText({ fr: 'Défaites', en: 'Losses' }), value: `${losses}`, inline: true },
      { name: localizeText({ fr: 'Matchs joués', en: 'Games played' }), value: `${games}`, inline: true }
    )
    .setColor(0x5865f2)
    .setTimestamp(new Date());

  await message.reply({ embeds: [embed] });
}

async function handleLeaderboardCommand(message, args) {
  const supabaseClient = createSupabaseClient();
  if (!supabaseClient) {
    await message.reply({
      content: localizeText({
        fr: 'Configuration Supabase manquante.',
        en: 'Supabase configuration is missing.'
      })
    });
    return;
  }

  let limit = 10;
  if (args[0]) {
    const parsed = parseInt(args[0], 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 25);
    }
  }

  try {
    const { data: allPlayers, error } = await supabaseClient
      .from('players')
      .select('discord_id, name, solo_elo, wins, losses, games_played')
      .eq('active', true)
      .order('solo_elo', { ascending: false });

    if (error) throw error;

    if (!allPlayers || allPlayers.length === 0) {
      await message.reply({
        content: localizeText({
          fr: 'Aucun joueur classé pour le moment.',
          en: 'No ranked players yet.'
        })
      });
      return;
    }

    const totalPlayers = allPlayers.length;
    const boundaries = computeTierBoundaries(totalPlayers);
    const topPlayers = allPlayers.slice(0, limit);

    const lines = [
      localizeText({
        fr: '**🏆 Classement ELO — Top {count}**\n',
        en: '**🏆 Elo leaderboard — Top {count}**\n'
      }, { count: topPlayers.length })
    ];

    topPlayers.forEach((player, index) => {
      const rank = index + 1;
      const tier = getTierByRank(rank, boundaries);
      const soloElo = normalizeRating(player.solo_elo);
      const wins = player.wins || 0;
      const losses = player.losses || 0;

      lines.push(
        localizeText(
          {
            fr: '{rank}. **{name}** — {elo} Elo — {wins}V/{losses}D — Tier {tier}',
            en: '{rank}. **{name}** — {elo} Elo — {wins}W/{losses}L — Tier {tier}'
          },
          {
            rank,
            name: player.name,
            elo: Math.round(soloElo),
            wins,
            losses,
            tier: tier || localizeText({ fr: 'Sans tier', en: 'No tier' })
          }
        )
      );
    });

    await message.reply({ content: lines.join('\n') });
  } catch (error) {
    errorLog('Failed to fetch leaderboard:', error);
    await message.reply({
      content: localizeText({
        fr: 'Erreur lors de la récupération du classement.',
        en: 'Failed to retrieve leaderboard.'
      })
    });
  }
}

async function handleMapsCommand(message) {
  const frenchLines = [
    '🗺️ **Rotation des maps disponibles**',
    '',
    '<:GemGrab:1436473738765008976> **Razzia de gemmes** : Mine hard-rock, Tunnel de mine, Bruissements',
    '<:Brawlball:1436473735573143562> **Brawlball** : Tir au buts, Super plage, Triple Dribble',
    "<:KnockOut:1436473703083937914> **Hors-jeu** : Rocher de la belle, Ravin du bras d'or, À découvert",
    "<:Heist:1436473730812481546> **Braquage** : C'est chaud patate, Arrêt au stand, Zone sécurisée",
    '<:HotZone:1436473698491175137> **Zone réservée** : Duel de scarabées, Cercle de feu, Stratégies parallèles',
    '<:Bounty:1436473727519948962> **Prime** : Cachette secrète, Étoile filante, Mille-feuille'
  ];

  const englishLines = [
    '🗺️ **Available map rotation**',
    '',
    '<:GemGrab:1436473738765008976> **Gem Grab**: Hard Rock Mine, Minecart Madness, Crystal Arcade',
    '<:Brawlball:1436473735573143562> **Brawl Ball**: Super Stadium, Sneaky Fields, Triple Dribble',
    "<:KnockOut:1436473703083937914> **Knockout**: Belle's Rock, Goldarm Gulch, Out in the Open",
    '<:Heist:1436473730812481546> **Heist**: Hot Potato, Pit Stop, Safe Zone',
    '<:HotZone:1436473698491175137> **Hot Zone**: Dueling Beetles, Ring of Fire, Parallel Plays',
    '<:Bounty:1436473727519948962> **Bounty**: Snake Prairie, Shooting Star, Layer Cake'
  ];

  const lines = currentLanguage === LANGUAGE_EN ? englishLines : frenchLines;

  await message.reply({ content: lines.join('\n') });
}

async function handlePrivatePartyCommand(message) {
  const targetGuild = message.guild || guild;

  if (!targetGuild) {
    await message.reply({
      content: localizeText({
        fr: 'Impossible de récupérer les informations du serveur.',
        en: 'Unable to fetch server information.'
      })
    });
    return;
  }

  const mentionedUsers = Array.from(message.mentions.users.values()).filter((user) => !user.bot);
  const uniqueIds = new Set(mentionedUsers.map((user) => user.id));

  if (uniqueIds.size < MATCH_SIZE && !uniqueIds.has(message.author.id)) {
    uniqueIds.add(message.author.id);
  }

  const participantIds = Array.from(uniqueIds);

  if (participantIds.length !== MATCH_SIZE) {
    const needed = MATCH_SIZE - participantIds.length;
    if (participantIds.length < MATCH_SIZE) {
      await message.reply({
        content:
          needed === MATCH_SIZE
            ? localizeText({
                fr: 'Mentionnez 5 joueurs supplémentaires pour générer une partie privée (6 joueurs au total).',
                en: 'Mention 5 more players to generate a private match (6 players total).'
              })
            : localizeText(
                {
                  fr: 'Il manque {count} joueur(s) pour générer une partie privée équilibrée.',
                  en: '{count} player(s) are missing to create a balanced private match.'
                },
                { count: needed }
              )
      });
    } else {
      await message.reply({
        content: localizeText({
          fr: 'Trop de joueurs mentionnés. Veuillez en sélectionner exactement 6 pour lancer la partie privée.',
          en: 'Too many players mentioned. Please select exactly 6 to create the private match.'
        })
      });
    }
    return;
  }

  try {
    const participants = await Promise.all(
      participantIds.map(async (id) => {
        const member = await targetGuild.members.fetch(id).catch(() => null);
        const profile = await fetchPlayerByDiscordId(id).catch((err) => {
          throw new Error(`Supabase error for ${id}: ${err.message}`);
        });

        const wins = typeof profile?.wins === 'number' ? profile.wins : 0;
        const losses = typeof profile?.losses === 'number' ? profile.losses : 0;
        const games = typeof profile?.games_played === 'number' ? profile.games_played : wins + losses;

        return {
          discordId: id,
          displayName:
            member?.displayName ||
            member?.user?.username ||
            profile?.name ||
            localizeText({ fr: `Joueur ${id}`, en: `Player ${id}` }),
          playerId: profile?.id || null,
          mmr: normalizeRating(profile?.mmr),
          soloElo: normalizeRating(profile?.solo_elo),
          wins,
          losses,
          games,
          joinedAt: new Date()
        };
      })
    );

    const teams = balanceTeams(participants);
    const mapChoices = pickRandomMaps(MAP_CHOICES_COUNT);

    const embed = buildPrivateMatchEmbed({
      requestedBy: message.author.id,
      primaryMap: mapChoices[0] || null,
      mapChoices,
      teams,
      createdAt: new Date()
    });

    const mentions = participantIds.map((id) => `<@${id}>`).join(' ');
    const content = [
      localizeText({ fr: '🎉 Partie privée générée !', en: '🎉 Private match ready!' }),
      localizeText({ fr: 'Participants : {mentions}', en: 'Participants: {mentions}' }, { mentions })
    ].join('\n');

    await message.reply({ content, embeds: [embed] });
  } catch (err) {
    errorLog('Failed to create private party match:', err);
    await message.reply({
      content: localizeText({
        fr: 'Impossible de générer la partie privée pour le moment. Réessayez plus tard.',
        en: 'Unable to create the private match right now. Please try again later.'
      })
    });
  }
}

async function handlePingCommand(message) {
  if (PING_ROLE_ID) {
    await message.channel.send({ content: `<@&${PING_ROLE_ID}>` });
  } else {
    await message.reply({
      content: localizeText({
        fr: 'Aucun rôle de ping configuré.',
        en: 'No ping role configured.'
      })
    });
  }
}

async function handleTierSyncCommand(message) {
  const hasPermission = message.member?.permissions?.has(PermissionsBitField.Flags.ManageGuild);

  if (!hasPermission) {
    await message.reply({
      content: localizeText({
        fr: "❌ Vous n'avez pas la permission d'exécuter cette commande.",
        en: "❌ You don't have permission to run this command."
      })
    });
    return;
  }

  const response = await message.reply({
    content: localizeText({
      fr: '🔄 Synchronisation des tiers en cours…',
      en: '🔄 Synchronizing tiers…'
    })
  });

  try {
    await syncTiersWithRoles();
    await response.edit(
      localizeText({ fr: '✅ Synchronisation des tiers terminée.', en: '✅ Tier synchronization complete.' })
    );
  } catch (err) {
    errorLog('Manual tier sync failed:', err);
    await response.edit(
      localizeText({
        fr: "❌ Impossible de synchroniser les tiers. Consultez les logs pour plus d'informations.",
        en: '❌ Unable to sync tiers. Check the logs for details.'
      })
    );
  }
}

async function handleEnglishCommand(message, args) {
  const option = (args[0] || '').toLowerCase();

  if (['off', 'fr', 'french'].includes(option)) {
    currentLanguage = LANGUAGE_FR;
    await message.reply({
      content: localizeText({
        fr: '✅ Le bot parle à nouveau français.',
        en: '✅ The bot is back to French.'
      })
    });
    return;
  }

  if (['status', 'etat', 'état'].includes(option)) {
    await message.reply({
      content: localizeText(
        {
          fr: 'Langue actuelle : {language}.',
          en: 'Current language: {language}.'
        },
        {
          language:
            currentLanguage === LANGUAGE_EN
              ? localizeText({ fr: 'anglais', en: 'English' })
              : localizeText({ fr: 'français', en: 'French' })
        }
      )
    });
    return;
  }

  currentLanguage = LANGUAGE_EN;
  await message.reply({
    content: localizeText({
      fr: '✅ Le bot parle désormais anglais. Utilisez `!english off` pour revenir en français.',
      en: '✅ The bot will now respond in English. Use `!english off` to switch back to French.'
    })
  });
}

async function handleHelpCommand(message) {
  const commands =
    currentLanguage === LANGUAGE_EN
      ? [
          '`!create` — Open the custom room form',
          '`!join [@leader]` — Join the queue or a mentioned leader\'s room',
          '`!leave` — Leave the queue',
          '`!room` — View the custom room you joined',
          '`!roomleave` — Leave your custom room',
          '`!queue` — Show players waiting in the queue',
          '`!elo [@player]` — Display Elo stats',
          '`!lb [count]` — Show the leaderboard (example: !lb 25)',
          '`!maps` — Show the current map rotation',
          '`!pp @player…` — Build a balanced private match (6 players)',
          '`!ping` — Mention the match notification role',
          '`!tiers` — Manually sync tier roles',
          '`!english [off]` — Switch the bot language to English or back to French',
          '`!help` — Display this help'
        ]
      : [
          '`!create` — Créer un formulaire pour une room personnalisée',
          '`!join [@chef]` — Rejoindre la file ou la room du joueur mentionné',
          '`!leave` — Quitter la file d\'attente',
          '`!room` — Voir la room personnalisée que tu as rejointe',
          '`!roomleave` — Quitter ta room personnalisée',
          '`!queue` — Voir les joueurs en attente',
          '`!elo [@joueur]` — Afficher le classement Elo',
          '`!lb [nombre]` — Afficher le top classement (ex: !lb 25)',
          '`!maps` — Afficher la rotation des maps',
          '`!pp @joueur…` — Générer une partie privée équilibrée (6 joueurs)',
          '`!ping` — Mentionner le rôle de notification des matchs',
          '`!tiers` — Synchroniser manuellement les rôles de tier',
          '`!english [off]` — Traduire le bot en anglais ou revenir en français',
          '`!help` — Afficher cette aide'
        ];

  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(localizeText({ fr: 'Commandes du bot', en: 'Bot commands' }))
        .setDescription(commands.join('\n'))
        .setColor(0x00b894)
    ]
  });
}

async function startMatch(participants, fallbackChannel) {
  const mapChoices = pickRandomMaps(MAP_CHOICES_COUNT);
  const primaryMap = mapChoices[0];
  const teams = balanceTeams(participants);

  const matchPayload = {
    map_mode: primaryMap?.mode || null,
    map_name: primaryMap?.map || null,
    map_emoji: primaryMap?.emoji || null,
    team1_ids: teams.blue.map((player) => player.discordId),
    team2_ids: teams.red.map((player) => player.discordId),
    status: 'pending',
    winner: null
  };

  const hasMissingColumnError = (error, column) => {
    const errorMessage = (error?.message || '').toLowerCase();
    const errorDetails = (error?.details || '').toLowerCase();
    return errorMessage.includes(column) || errorDetails.includes(column);
  };

  const fallbackStrategies = [
    {
      column: 'map_emoji',
      logMessage:
        'Database schema is missing map_emoji column. Falling back to match insertion without map emoji.',
      apply: (currentPayload) => {
        const nextPayload = { ...currentPayload };
        delete nextPayload.map_emoji;
        return nextPayload;
      }
    },
    {
      column: 'map_mode',
      logMessage:
        'Database schema is missing map_mode column. Falling back to match insertion without map mode.',
      apply: (currentPayload) => {
        const nextPayload = { ...currentPayload };
        delete nextPayload.map_mode;
        if (matchPayload.map_mode && matchPayload.map_name) {
          nextPayload.map_name = `${matchPayload.map_mode} — ${matchPayload.map_name}`;
        }
        return nextPayload;
      }
    },
    {
      column: 'map_name',
      logMessage:
        'Database schema is missing map_name column. Falling back to match insertion using legacy map column.',
      apply: (currentPayload) => {
        const nextPayload = { ...currentPayload };
        const combinedName =
          currentPayload.map_name ||
          (matchPayload.map_mode && matchPayload.map_name
            ? `${matchPayload.map_mode} — ${matchPayload.map_name}`
            : matchPayload.map_name || matchPayload.map_mode);
        if (combinedName) {
          nextPayload.map = combinedName;
        }
        delete nextPayload.map_name;
        return nextPayload;
      }
    },
    {
      column: 'map',
      logMessage:
        'Database schema is missing map column. Falling back to match insertion without map information.',
      apply: (currentPayload) => {
        const nextPayload = { ...currentPayload };
        delete nextPayload.map;
        return nextPayload;
      }
    }
  ];

  let insertedMatch = null;
  let matchError = null;
  let payloadToInsert = { ...matchPayload };

  const appliedFallbacks = new Set();

  for (let attempt = 0; attempt <= fallbackStrategies.length; attempt += 1) {
    ({ data: insertedMatch, error: matchError } = await supabase
      .from('matches')
      .insert(payloadToInsert)
      .select()
      .single());

    if (!matchError) {
      break;
    }

    const fallback = fallbackStrategies.find(
      (strategy) =>
        !appliedFallbacks.has(strategy.column) &&
        hasMissingColumnError(matchError, strategy.column)
    );

    if (!fallback) {
      break;
    }

    warn(fallback.logMessage);
    payloadToInsert = fallback.apply(payloadToInsert);
    appliedFallbacks.add(fallback.column);
  }

  if (matchError) {
    throw new Error(`Unable to create match record: ${matchError.message}`);
  }

  const channel = matchChannel && matchChannel.isTextBased() ? matchChannel : fallbackChannel;
  if (!channel || !channel.isTextBased()) {
    throw new Error('No valid text channel available to announce the match.');
  }

  const mentions = participants.map((player) => `<@${player.discordId}>`).join(' ');
  const contentParts = [
    localizeText({ fr: '🎮 **Match prêt !**', en: '🎮 **Match ready!**' }),
    mentions
  ];
  if (PING_ROLE_ID) {
    contentParts.push(`<@&${PING_ROLE_ID}>`);
  }

  const state = {
    matchId: insertedMatch.id,
    mapChoices,
    primaryMap,
    teams,
    createdAt: new Date(insertedMatch?.created_at || Date.now()),
    participants: new Set(participants.map((player) => player.discordId)),
    channelId: channel.id,
    messageId: null,
    resolved: false,
    votes: {
      blue: new Set(),
      red: new Set(),
      cancel: new Set()
    }
  };

  const messagePayload = {
    content: contentParts.filter(Boolean).join(' '),
    embeds: [buildMatchEmbed(state)],
    components: [buildResultButtons(false)]
  };

  const sentMessage = await channel.send(messagePayload);
  state.messageId = sentMessage.id;
  activeMatches.set(state.matchId, state);

  await sendLogMessage(
    [
      localizeText(
        {
          fr: '🆚 Nouveau match (#{id}) — {maps}',
          en: '🆚 New match (#{id}) — {maps}'
        },
        {
          id: state.matchId,
          maps: mapChoices.map((choice) => `${choice.emoji} ${choice.mode} (${choice.map})`).join(' | ')
        }
      ),
      localizeText({ fr: 'Bleus : {players}', en: 'Blue: {players}' }, {
        players: teams.blue.map((p) => p.displayName).join(', ')
      }),
      localizeText({ fr: 'Rouges : {players}', en: 'Red: {players}' }, {
        players: teams.red.map((p) => p.displayName).join(', ')
      })
    ].join('\n')
  );
}

async function updateMatchRecord(matchId, payload) {
  const { error: updateError } = await supabase
    .from('matches')
    .update(payload)
    .eq('id', matchId);

  if (updateError) {
    throw new Error(`Unable to update match #${matchId}: ${updateError.message}`);
  }
}

async function applyMatchOutcome(state, outcome, userId) {
  if (state.resolved) {
    return null;
  }

  const winner =
    outcome === 'blue'
      ? localizeText({ fr: 'Bleue', en: 'Blue' })
      : outcome === 'red'
        ? localizeText({ fr: 'Rouge', en: 'Red' })
        : null;
  const summary = {
    outcome,
    color:
      outcome === 'blue' ? 0x3498db : outcome === 'red' ? 0xe74c3c : 0x95a5a6,
    text: ''
  };

  if (outcome === 'cancel') {
    await updateMatchRecord(state.matchId, {
      status: 'cancelled',
      winner: null,
      completed_at: new Date().toISOString()
    });

    summary.text = localizeText({
      fr: 'Match annulé par <@{userId}>. Aucun changement de score Elo.',
      en: 'Match cancelled by <@{userId}>. No Elo changes applied.'
    }, { userId });
    return summary;
  }

  const blueAvg =
    state.teams.blue.reduce((sum, player) => sum + normalizeRating(player.soloElo), 0) / TEAM_SIZE;
  const redAvg =
    state.teams.red.reduce((sum, player) => sum + normalizeRating(player.soloElo), 0) / TEAM_SIZE;

  const blueScore = outcome === 'blue' ? 1 : 0;
  const redScore = outcome === 'red' ? 1 : 0;

  const updates = [];
  const changes = [];

  for (const player of state.teams.blue) {
    const currentRating = normalizeRating(player.soloElo);
    const expected = calculateExpectedScore(currentRating, redAvg);
    const newRating = Math.max(0, Math.round(currentRating + K_FACTOR * (blueScore - expected)));
    const wins = player.wins + (blueScore === 1 ? 1 : 0);
    const losses = player.losses + (blueScore === 1 ? 0 : 1);
    const games = player.games + 1;

    updates.push({ id: player.playerId, solo_elo: newRating, wins, losses, games_played: games });
    changes.push({
      player,
      oldRating: currentRating,
      newRating,
      delta: newRating - currentRating
    });

    player.soloElo = newRating;
    player.wins = wins;
    player.losses = losses;
    player.games = games;
  }

  for (const player of state.teams.red) {
    const currentRating = normalizeRating(player.soloElo);
    const expected = calculateExpectedScore(currentRating, blueAvg);
    const newRating = Math.max(0, Math.round(currentRating + K_FACTOR * (redScore - expected)));
    const wins = player.wins + (redScore === 1 ? 1 : 0);
    const losses = player.losses + (redScore === 1 ? 0 : 1);
    const games = player.games + 1;

    updates.push({ id: player.playerId, solo_elo: newRating, wins, losses, games_played: games });
    changes.push({
      player,
      oldRating: currentRating,
      newRating,
      delta: newRating - currentRating
    });

    player.soloElo = newRating;
    player.wins = wins;
    player.losses = losses;
    player.games = games;
  }

  for (const update of updates) {
    const { error: playerError } = await supabase
      .from('players')
      .update({
        solo_elo: update.solo_elo,
        wins: update.wins,
        losses: update.losses,
        games_played: update.games_played
      })
      .eq('id', update.id);

    if (playerError) {
      throw new Error(`Unable to update player ${update.id}: ${playerError.message}`);
    }
  }

  await updateMatchRecord(state.matchId, {
    status: 'completed',
    winner: outcome,
    completed_at: new Date().toISOString()
  });

  const winnerLine = localizeText(
    {
      fr: 'Victoire {winner} (déclarée par <@{userId}>).',
      en: '{winner} win reported by <@{userId}>.'
    },
    {
      winner,
      userId
    }
  );
  const changeLines = changes
    .map((change) => {
      const symbol = change.delta > 0 ? '+' : '';
      return `• ${change.player.displayName}: ${change.oldRating} → ${change.newRating} (${symbol}${change.delta})`;
    })
    .join('\n');

  summary.text = `${winnerLine}\n${changeLines}`;
  return summary;
}

async function handleInteraction(interaction) {
  if (interaction.isButton()) {
    const [prefix, action, requestId] = interaction.customId.split(':');

    if (prefix === 'room' && action === 'open') {
      const pending = pendingRoomForms.get(requestId);

      if (!pending) {
        await interaction.reply({
          content: localizeText({
            fr: 'Ce formulaire a expiré ou est introuvable. Relancez `!create` pour recommencer.',
            en: 'This form expired or no longer exists. Run `!create` again to start over.'
          }),
          ephemeral: true
        });
        return;
      }

      if (pending.leaderId !== interaction.user.id) {
        await interaction.reply({
          content: localizeText({
            fr: 'Seul le créateur de la room peut remplir ce formulaire.',
            en: 'Only the room creator can complete this form.'
          }),
          ephemeral: true
        });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId(`room:submit:${requestId}`)
        .setTitle(localizeText({ fr: 'Créer une room personnalisée', en: 'Create a custom room' }));

      const codeInput = new TextInputBuilder()
        .setCustomId('roomCode')
        .setLabel(localizeText({ fr: 'Code de la room', en: 'Room code' }))
        .setPlaceholder(localizeText({ fr: 'Exemple : ABCD', en: 'Example: ABCD' }))
        .setMaxLength(20)
        .setRequired(true)
        .setStyle(TextInputStyle.Short);

      const minTierInput = new TextInputBuilder()
        .setCustomId('minTier')
        .setLabel(localizeText({ fr: 'Tier minimum (S/A/B/C/D/E)', en: 'Minimum tier (S/A/B/C/D/E)' }))
        .setMaxLength(1)
        .setRequired(true)
        .setStyle(TextInputStyle.Short);

      const maxTierInput = new TextInputBuilder()
        .setCustomId('maxTier')
        .setLabel(localizeText({ fr: 'Tier maximum (S/A/B/C/D/E)', en: 'Maximum tier (S/A/B/C/D/E)' }))
        .setMaxLength(1)
        .setRequired(true)
        .setStyle(TextInputStyle.Short);

      modal.addComponents(
        new ActionRowBuilder().addComponents(codeInput),
        new ActionRowBuilder().addComponents(minTierInput),
        new ActionRowBuilder().addComponents(maxTierInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (prefix !== 'match') {
      return;
    }

    const outcome = action;
    const matchState = [...activeMatches.values()].find((state) => state.messageId === interaction.message.id);
    if (!matchState) {
      await interaction.reply({
        content: localizeText({
          fr: 'Match introuvable ou déjà traité.',
          en: 'Match not found or already handled.'
        }),
        ephemeral: true
      });
      return;
    }

    if (matchState.resolved) {
      await interaction.reply({
        content: localizeText({
          fr: 'Ce match a déjà été terminé.',
          en: 'This match has already been completed.'
        }),
        ephemeral: true
      });
      return;
    }

    const member = interaction.member;
    const isParticipant = matchState.participants.has(interaction.user.id);
    const isModerator = member?.permissions?.has(PermissionsBitField.Flags.ManageGuild);

    if (!isParticipant && !isModerator) {
      await interaction.reply({
        content: localizeText({
          fr: 'Seuls les joueurs du match peuvent voter.',
          en: 'Only match participants can vote.'
        }),
        ephemeral: true
      });
      return;
    }

    const isModeratorOverride = isModerator && !isParticipant;

    try {
      if (!['blue', 'red', 'cancel'].includes(outcome)) {
        await interaction.reply({
          content: localizeText({
            fr: 'Option de vote invalide.',
            en: 'Invalid vote option.'
          }),
          ephemeral: true
        });
        return;
      }

      if (!matchState.votes) {
        matchState.votes = {
          blue: new Set(),
          red: new Set(),
          cancel: new Set()
        };
      }

      const votes = matchState.votes;
      const allVoteSets = [votes.blue, votes.red, votes.cancel];

      for (const voteSet of allVoteSets) {
        voteSet.delete(interaction.user.id);
      }

      votes[outcome].add(interaction.user.id);

      const voteCounts = {
        blue: votes.blue.size,
        red: votes.red.size,
        cancel: votes.cancel.size
      };

      const hasReachedThreshold = voteCounts[outcome] >= MIN_VOTES_TO_RESOLVE;

      if (!isModeratorOverride && !hasReachedThreshold) {
        await interaction.update({
          embeds: [buildMatchEmbed(matchState)],
          components: [buildResultButtons(false)]
        });

        await interaction.followUp({
          content: localizeText(
            {
              fr: 'Votre vote pour {choice} a été pris en compte. ({count}/{needed})',
              en: 'Your vote for {choice} has been recorded. ({count}/{needed})'
            },
            {
              choice:
                outcome === 'blue'
                  ? localizeText({ fr: 'la victoire bleue', en: 'a blue win' })
                  : outcome === 'red'
                    ? localizeText({ fr: 'la victoire rouge', en: 'a red win' })
                    : localizeText({ fr: "l'annulation", en: 'cancelling the match' }),
              count: voteCounts[outcome],
              needed: MIN_VOTES_TO_RESOLVE
            }
          ),
          ephemeral: true
        });
        return;
      }

      const summary = await applyMatchOutcome(matchState, outcome, interaction.user.id);
      if (!summary) {
        await interaction.reply({
          content: localizeText({
            fr: 'Le résultat a déjà été enregistré.',
            en: 'The result has already been recorded.'
          }),
          ephemeral: true
        });
        return;
      }

      matchState.resolved = true;
      activeMatches.delete(matchState.matchId);

      await interaction.update({
        embeds: [buildMatchEmbed(matchState, summary)],
        components: [buildResultButtons(true)]
      });

      const mapLabel = matchState.primaryMap
        ? `${matchState.primaryMap.emoji} ${matchState.primaryMap.mode}`
        : localizeText({ fr: 'Map inconnue', en: 'Unknown map' });
      await sendLogMessage(
        [`✅ Match #${matchState.matchId} terminé (${mapLabel})`, summary.text].join('\n')
      );
    } catch (err) {
      errorLog('Failed to process match result:', err);
      await interaction.reply({
        content: localizeText({
          fr: "Erreur lors de l'enregistrement du résultat.",
          en: 'Error while saving the result.'
        }),
        ephemeral: true
      });
    }

    return;
  }

  if (interaction.isModalSubmit()) {
    const [prefix, action, requestId] = interaction.customId.split(':');

    if (prefix !== 'room' || action !== 'submit') {
      return;
    }

    const pending = pendingRoomForms.get(requestId);

    if (!pending) {
      await interaction.reply({
        content: localizeText({
          fr: 'Formulaire introuvable. Relancez `!create` pour créer une nouvelle room.',
          en: 'Form not found. Run `!create` to start a new room.'
        }),
        ephemeral: true
      });
      return;
    }

    if (pending.leaderId !== interaction.user.id) {
      await interaction.reply({
        content: localizeText({
          fr: 'Seul le créateur de la room peut valider ce formulaire.',
          en: 'Only the room creator can submit this form.'
        }),
        ephemeral: true
      });
      return;
    }

    const rawCode = interaction.fields.getTextInputValue('roomCode') || '';
    const rawMinTier = interaction.fields.getTextInputValue('minTier') || '';
    const rawMaxTier = interaction.fields.getTextInputValue('maxTier') || '';

    const roomCode = rawCode.trim().toUpperCase();
    const minTier = normalizeTierInput(rawMinTier);
    const maxTier = normalizeTierInput(rawMaxTier);

    if (!roomCode) {
      pendingRoomForms.delete(requestId);
      await interaction.reply({
        content: localizeText({
          fr: 'Le code de room ne peut pas être vide.',
          en: 'The room code cannot be empty.'
        }),
        ephemeral: true
      });
      return;
    }

    if (!minTier || !maxTier) {
      pendingRoomForms.delete(requestId);
      await interaction.reply({
        content: localizeText({
          fr: 'Les tiers doivent être parmi S, A, B, C, D ou E.',
          en: 'Tiers must be one of S, A, B, C, D, or E.'
        }),
        ephemeral: true
      });
      return;
    }

    if (!isValidTierRange(minTier, maxTier)) {
      pendingRoomForms.delete(requestId);
      await interaction.reply({
        content: localizeText({
          fr: 'Le tier minimum doit être inférieur ou égal au tier maximum.',
          en: 'The minimum tier must be lower than or equal to the maximum tier.'
        }),
        ephemeral: true
      });
      return;
    }

    pendingRoomForms.delete(requestId);

    const roomState = {
      leaderId: pending.leaderId,
      code: roomCode,
      minTier,
      maxTier,
      channelId: pending.channelId,
      messageId: null,
      createdAt: new Date(),
      members: new Set([pending.leaderId])
    };

    customRooms.set(pending.leaderId, roomState);

    const embed = new EmbedBuilder()
      .setTitle(localizeText({ fr: 'Room personnalisée', en: 'Custom room' }))
      .setDescription(
        localizeText({ fr: 'Créée par <@{leaderId}>', en: 'Created by <@{leaderId}>' }, { leaderId: pending.leaderId })
      )
      .addFields(
        { name: localizeText({ fr: 'Code de la room', en: 'Room code' }), value: `\`${roomCode}\``, inline: true },
        { name: localizeText({ fr: 'Tier minimum', en: 'Minimum tier' }), value: minTier, inline: true },
        { name: localizeText({ fr: 'Tier maximum', en: 'Maximum tier' }), value: maxTier, inline: true },
        {
          name: localizeText({ fr: 'Comment rejoindre ?', en: 'How to join?' }),
          value: localizeText(
            {
              fr: 'Utilisez `!join <@{leaderId}>` pour recevoir le code directement.',
              en: 'Use `!join <@{leaderId}>` to receive the code directly.'
            },
            { leaderId: pending.leaderId }
          )
        }
      )
      .setColor(0x2ecc71)
      .setTimestamp(roomState.createdAt);

    await interaction.reply({
      content: localizeText({
        fr: '✅ Room créée avec succès !',
        en: '✅ Room created successfully!'
      }),
      embeds: [embed]
    });

    const replyMessage = await interaction.fetchReply().catch(() => null);
    if (replyMessage) {
      roomState.messageId = replyMessage.id;
    }
  }
}

async function syncTiersWithRoles() {
  if (!guild) {
    warn('Cannot sync tiers: guild not resolved yet.');
    return;
  }

  let players;
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, discord_id, name, mmr, solo_elo, active')
      .order('mmr', { ascending: false });

    if (error) {
      throw error;
    }

    players = (data || [])
      .filter((player) => player.discord_id)
      .map((player) => {
        const soloElo = normalizeRating(player.solo_elo);
        const mmr = normalizeRating(player.mmr);
        return {
          ...player,
          solo_elo: soloElo,
          mmr,
          weightedScore: calculateWeightedScore(soloElo, mmr)
        };
      });
  } catch (err) {
    errorLog('Failed to fetch players for tier sync:', err);
    return;
  }

  if (!players.length) {
    warn('No players found for tier synchronization.');
    return;
  }

  const activePlayers = players.filter((player) => player.active !== false);
  const rankedPlayers = (activePlayers.length ? activePlayers : players)
    .slice()
    .sort((a, b) => b.weightedScore - a.weightedScore);
  const totalPlayers = rankedPlayers.length;

  const counts = TIER_DISTRIBUTION.map((distribution) =>
    Math.max(distribution.minCount || 0, Math.round(totalPlayers * distribution.ratio))
  );

  let totalAssigned = counts.reduce((sum, value) => sum + value, 0);

  if (totalAssigned > totalPlayers) {
    let index = counts.length - 1;
    let safety = counts.length * 10;

    while (totalAssigned > totalPlayers && safety > 0) {
      const minAllowed = TIER_DISTRIBUTION[index].minCount || 0;
      if (counts[index] > minAllowed) {
        counts[index] -= 1;
        totalAssigned -= 1;
      }

      index = (index - 1 + counts.length) % counts.length;
      safety -= 1;
    }

    if (totalAssigned > totalPlayers) {
      const difference = totalAssigned - totalPlayers;
      counts[counts.length - 1] = Math.max(0, counts[counts.length - 1] - difference);
      totalAssigned = counts.reduce((sum, value) => sum + value, 0);
    }
  }

  if (totalAssigned < totalPlayers) {
    let index = 0;
    while (totalAssigned < totalPlayers) {
      counts[index] += 1;
      totalAssigned += 1;
      index = (index + 1) % counts.length;
    }
  }

  const assignments = new Map();
  let cursor = 0;

  for (let i = 0; i < TIER_DISTRIBUTION.length; i += 1) {
    const { tier } = TIER_DISTRIBUTION[i];
    const count = counts[i] ?? 0;

    for (let j = 0; j < count && cursor < rankedPlayers.length; j += 1) {
      const player = rankedPlayers[cursor];
      assignments.set(player.discord_id, tier);
      cursor += 1;
    }
  }

  for (const player of rankedPlayers) {
    const tier = assignments.get(player.discord_id) || 'E';
    const roleId = tierRoleMap[tier];

    if (!roleId) {
      continue;
    }

    let member;
    try {
      member = await guild.members.fetch(player.discord_id);
    } catch (err) {
      continue;
    }

    if (!member) {
      continue;
    }

    const rolesToRemove = Object.values(tierRoleMap)
      .filter(Boolean)
      .filter((id) => id !== roleId && member.roles.cache.has(id));

    try {
      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId, 'Tier synchronization');
      }
    } catch (err) {
      warn(`Unable to add tier role ${tier} to ${member.id}:`, err.message);
    }

    for (const removeId of rolesToRemove) {
      try {
        await member.roles.remove(removeId, 'Tier synchronization');
      } catch (err) {
        warn(`Unable to remove tier role ${removeId} from ${member.id}:`, err.message);
      }
    }

    if (player.name !== member.displayName) {
      const { error: updateError } = await supabase
        .from('players')
        .update({ name: member.displayName })
        .eq('id', player.id);

      if (updateError) {
        warn(`Unable to sync display name for ${member.id}:`, updateError.message);
      }
    }
  }

  log('Tier synchronization complete.');
}

async function onReady(readyClient) {
  log(`Connected to Discord as ${readyClient.user.tag}.`);

  try {
    guild = await readyClient.guilds.fetch(DISCORD_GUILD_ID);
  } catch (err) {
    errorLog('Unable to fetch guild:', err);
    return;
  }

  try {
    matchChannel = await readyClient.channels.fetch(MATCH_CHANNEL_ID);
    if (!matchChannel?.isTextBased()) {
      warn(`Configured match channel ${MATCH_CHANNEL_ID} is not text-based.`);
      matchChannel = null;
    }
  } catch (err) {
    warn(`Unable to fetch match channel ${MATCH_CHANNEL_ID}:`, err.message);
    matchChannel = null;
  }

  try {
    logChannel = await readyClient.channels.fetch(LOG_CHANNEL_ID);
    if (!logChannel?.isTextBased()) {
      warn(`Configured log channel ${LOG_CHANNEL_ID} is not text-based.`);
      logChannel = null;
    }
  } catch (err) {
    warn(`Unable to fetch log channel ${LOG_CHANNEL_ID}:`, err.message);
    logChannel = null;
  }

  await syncTiersWithRoles();

  tierSyncInterval = setInterval(() => {
    syncTiersWithRoles().catch((err) => errorLog('Tier sync failed:', err));
  }, TIER_SYNC_INTERVAL_MS);
}

async function handleMessage(message) {
  if (message.author.bot) {
    return;
  }

  if (!message.guild || message.guild.id !== DISCORD_GUILD_ID) {
    return;
  }

  const content = message.content.trim();
  if (!content.startsWith('!')) {
    return;
  }

  const [commandName, ...args] = content.slice(1).split(/\s+/);
  const command = commandName.toLowerCase();

  try {
    switch (command) {
      case 'create':
        await handleCreateRoomCommand(message, args);
        break;
      case 'join':
        await handleJoinCommand(message, args);
        break;
      case 'leave':
        await handleLeaveCommand(message, args);
        break;
      case 'room':
      case 'roominfo':
        await handleRoomInfoCommand(message);
        break;
      case 'roomleave':
        await handleRoomLeaveCommand(message);
        break;
      case 'queue':
        await handleQueueCommand(message, args);
        break;
      case 'elo':
        await handleEloCommand(message, args);
        break;
      case 'lb':
      case 'leaderboard':
        await handleLeaderboardCommand(message, args);
        break;
      case 'maps':
        await handleMapsCommand(message, args);
        break;
      case 'pp':
        await handlePrivatePartyCommand(message, args);
        break;
      case 'ping':
        await handlePingCommand(message, args);
        break;
      case 'tiers':
        await handleTierSyncCommand(message, args);
        break;
      case 'english':
        await handleEnglishCommand(message, args);
        break;
      case 'help':
        await handleHelpCommand(message, args);
        break;
      default:
        break;
    }
  } catch (err) {
    errorLog(`Command ${command} failed:`, err);
    await message.reply({
      content: localizeText({
        fr: "❌ Erreur lors de l'exécution de la commande.",
        en: '❌ Error while executing the command.'
      })
    });
  }
}

async function startUnifiedBot() {
  if (botStarted) {
    warn('startUnifiedBot() called but the client is already running.');
    return client;
  }

  botStarted = true;

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.User]
  });

  client.once(Events.ClientReady, onReady);
  client.on(Events.MessageCreate, handleMessage);
  client.on(Events.InteractionCreate, handleInteraction);
  client.on(Events.Error, (err) => errorLog('Discord client error:', err));
  client.on(Events.Warn, (msg) => warn('Discord warning:', msg));

  try {
    await client.login(DISCORD_BOT_TOKEN);
    log('Discord login successful.');
  } catch (err) {
    botStarted = false;
    errorLog('Failed to login to Discord:', err);
    throw err;
  }

  return client;
}

module.exports = { startUnifiedBot };
