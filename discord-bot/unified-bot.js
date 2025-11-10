'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  Partials,
  PermissionsBitField
} = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

const LOG_PREFIX = '[UnifiedBot]';
const TEAM_SIZE = 3;
const MATCH_SIZE = TEAM_SIZE * 2;
const DEFAULT_ELO = 1000;
const K_FACTOR = 30;
const ELO_DIVISOR = 400;
const TIER_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

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
let rotationIndex = 0;
let botStarted = false;

const matchQueue = [];
const queueEntries = new Map();
const activeMatches = new Map();

function log(...args) {
  console.log(LOG_PREFIX, ...args);
}

function warn(...args) {
  console.warn(LOG_PREFIX, ...args);
}

function errorLog(...args) {
  console.error(LOG_PREFIX, ...args);
}

function nextRotationMap() {
  const map = MAP_ROTATION[rotationIndex % MAP_ROTATION.length];
  rotationIndex += 1;
  return map;
}

function normalizeRating(value) {
  return typeof value === 'number' ? value : DEFAULT_ELO;
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

function buildMatchEmbed(state, resultSummary = null) {
  const { map, teams, createdAt } = state;
  const embed = new EmbedBuilder()
    .setTitle(`${map.emoji} ${map.mode} — ${map.map}`)
    .addFields(
      { name: 'Équipe Bleue', value: formatPlayerList(teams.blue), inline: true },
      { name: 'Équipe Rouge', value: formatPlayerList(teams.red), inline: true }
    )
    .setTimestamp(createdAt || new Date())
    .setColor(resultSummary ? resultSummary.color : 0xffc300);

  if (resultSummary) {
    embed.addFields({ name: 'Résultat', value: resultSummary.text });
  } else {
    embed.setFooter({ text: 'Votez pour le résultat avec les boutons ci-dessous.' });
  }

  return embed;
}

function buildResultButtons(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('match:blue')
      .setLabel('Victoire Bleue')
      .setEmoji('🔵')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('match:red')
      .setLabel('Victoire Rouge')
      .setEmoji('🔴')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('match:cancel')
      .setLabel('Match annulé')
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
    return 'La file est vide. Utilisez `!join` pour participer.';
  }

  const lines = matchQueue.map((entry, index) => {
    const rank = index + 1;
    return `${rank}. ${entry.displayName} (${Math.round(normalizeRating(entry.soloElo))} Elo)`;
  });

  return [`Joueurs dans la file (${matchQueue.length}/${MATCH_SIZE}) :`, ...lines].join('\n');
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

async function handleJoinCommand(message) {
  const member = message.member || (guild ? await guild.members.fetch(message.author.id).catch(() => null) : null);

  if (!member) {
    await message.reply({ content: "Impossible de récupérer votre profil Discord." });
    return;
  }

  if (queueEntries.has(member.id)) {
    await message.reply({ content: 'Vous êtes déjà dans la file d\'attente.' });
    return;
  }

  let playerRecord;
  try {
    playerRecord = await getOrCreatePlayer(member.id, member.displayName || member.user.username);
  } catch (err) {
    errorLog('Failed to join queue:', err);
    await message.reply({ content: "Erreur lors de l\'accès à la base de données. Réessayez plus tard." });
    return;
  }

  const entry = buildQueueEntry(member, playerRecord);
  matchQueue.push(entry);
  queueEntries.set(member.id, entry);

  await message.reply({
    content: `✅ ${entry.displayName} a rejoint la file.\n${formatQueueStatus()}`
  });

  if (matchQueue.length >= MATCH_SIZE) {
    const participants = matchQueue.splice(0, MATCH_SIZE);
    participants.forEach((player) => queueEntries.delete(player.discordId));

    try {
      await startMatch(participants, message.channel);
    } catch (err) {
      errorLog('Failed to start match:', err);
      await message.channel.send('❌ Impossible de créer la partie. La file est réinitialisée.');
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
    await message.reply({ content: "Vous n'êtes pas dans la file." });
    return;
  }

  const index = matchQueue.findIndex((player) => player.discordId === memberId);
  if (index !== -1) {
    matchQueue.splice(index, 1);
  }

  queueEntries.delete(memberId);
  await message.reply({ content: `🚪 ${entry.displayName} a quitté la file.\n${formatQueueStatus()}` });
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
    await message.reply({ content: "Erreur lors de la récupération du classement." });
    return;
  }

  if (!player) {
    await message.reply({ content: "Aucun profil Elo trouvé pour ce joueur." });
    return;
  }

  const wins = typeof player.wins === 'number' ? player.wins : 0;
  const losses = typeof player.losses === 'number' ? player.losses : 0;
  const games = typeof player.games_played === 'number' ? player.games_played : wins + losses;
  const soloElo = normalizeRating(player.solo_elo);
  const mmr = normalizeRating(player.mmr);
  const weightedScore = calculateWeightedScore(soloElo, mmr);

  const embed = new EmbedBuilder()
    .setTitle(`Profil Elo — ${player.name || `Joueur ${targetId}`}`)
    .addFields(
      { name: 'Elo', value: `${Math.round(soloElo)}`, inline: true },
      { name: 'MMR', value: `${Math.round(mmr)}`, inline: true },
      { name: 'Score pondéré', value: `${weightedScore}`, inline: true },
      { name: 'Victoires', value: `${wins}`, inline: true },
      { name: 'Défaites', value: `${losses}`, inline: true },
      { name: 'Matchs joués', value: `${games}`, inline: true }
    )
    .setColor(0x5865f2)
    .setTimestamp(new Date());

  await message.reply({ embeds: [embed] });
}

async function handleMapsCommand(message) {
  const lines = [
    '🗺️ **Rotation des maps disponibles**',
    '',
    '<:GemGrab:1436473738765008976> **Razzia de gemmes** : Mine hard-rock, Tunnel de mine, Bruissements',
    '<:Brawlball:1436473735573143562> **Brawlball** : Tir au buts, Super plage, Triple Dribble',
    '<:KnockOut:1436473703083937914> **Hors-jeu** : Rocher de la belle, Ravin du bras d\'or, À découvert',
    '<:Heist:1436473730812481546> **Braquage** : C\'est chaud patate, Arrêt au stand, Zone sécurisée',
    '<:HotZone:1436473698491175137> **Zone réservée** : Duel de scarabées, Cercle de feu, Stratégies parallèles',
    '<:Bounty:1436473727519948962> **Prime** : Cachette secrète, Étoile filante, Mille-feuille'
  ];

  await message.reply({ content: lines.join('\n') });
}

async function handlePingCommand(message) {
  if (PING_ROLE_ID) {
    await message.channel.send({ content: `<@&${PING_ROLE_ID}>` });
  } else {
    await message.reply({ content: 'Aucun rôle de ping configuré.' });
  }
}

async function handleHelpCommand(message) {
  const commands = [
    '`!join` — Rejoindre la file d\'attente',
    '`!leave` — Quitter la file d\'attente',
    '`!queue` — Voir les joueurs en attente',
    '`!elo` — Afficher votre classement Elo',
    '`!maps` — Afficher la rotation des maps',
    '`!ping` — Mentionner le rôle de notification des matchs',
    '`!help` — Afficher cette aide'
  ];

  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('Commandes du bot')
        .setDescription(commands.join('\n'))
        .setColor(0x00b894)
    ]
  });
}

async function startMatch(participants, fallbackChannel) {
  const map = nextRotationMap();
  const teams = balanceTeams(participants);

  const matchPayload = {
    map_mode: map.mode,
    map_name: map.map,
    map_emoji: map.emoji,
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
  const contentParts = ['🎮 **Match prêt !**', mentions];
  if (PING_ROLE_ID) {
    contentParts.push(`<@&${PING_ROLE_ID}>`);
  }

  const state = {
    matchId: insertedMatch.id,
    map,
    teams,
    createdAt: new Date(insertedMatch?.created_at || Date.now()),
    participants: new Set(participants.map((player) => player.discordId)),
    channelId: channel.id,
    messageId: null,
    resolved: false
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
      `🆚 Nouveau match (#${state.matchId}) — ${map.emoji} ${map.mode} (${map.map})`,
      `Bleus: ${teams.blue.map((p) => p.displayName).join(', ')}`,
      `Rouges: ${teams.red.map((p) => p.displayName).join(', ')}`
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

  const winner = outcome === 'blue' ? 'Bleue' : outcome === 'red' ? 'Rouge' : null;
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

    summary.text = `Match annulé par <@${userId}>. Aucun changement de score Elo.`;
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

  const winnerLine = `Victoire ${winner} (déclarée par <@${userId}>).`;
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
  if (!interaction.isButton()) {
    return;
  }

  const [prefix, outcome] = interaction.customId.split(':');
  if (prefix !== 'match') {
    return;
  }

  const matchState = [...activeMatches.values()].find((state) => state.messageId === interaction.message.id);
  if (!matchState) {
    await interaction.reply({ content: 'Match introuvable ou déjà traité.', ephemeral: true });
    return;
  }

  if (matchState.resolved) {
    await interaction.reply({ content: 'Ce match a déjà été terminé.', ephemeral: true });
    return;
  }

  const member = interaction.member;
  const isParticipant = matchState.participants.has(interaction.user.id);
  const isModerator = member?.permissions?.has(PermissionsBitField.Flags.ManageGuild);

  if (!isParticipant && !isModerator) {
    await interaction.reply({ content: "Seuls les joueurs du match peuvent voter.", ephemeral: true });
    return;
  }

  try {
    const summary = await applyMatchOutcome(matchState, outcome, interaction.user.id);
    if (!summary) {
      await interaction.reply({ content: 'Le résultat a déjà été enregistré.', ephemeral: true });
      return;
    }

    matchState.resolved = true;
    activeMatches.delete(matchState.matchId);

    await interaction.update({
      embeds: [buildMatchEmbed(matchState, summary)],
      components: [buildResultButtons(true)]
    });

    await sendLogMessage(
      [
        `✅ Match #${matchState.matchId} terminé (${matchState.map.emoji} ${matchState.map.mode})`,
        summary.text
      ].join('\n')
    );
  } catch (err) {
    errorLog('Failed to process match result:', err);
    await interaction.reply({ content: "Erreur lors de l'enregistrement du résultat.", ephemeral: true });
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
      .select('id, discord_id, name, mmr, active')
      .order('mmr', { ascending: false });

    if (error) {
      throw error;
    }

    players = (data || []).filter((player) => player.discord_id);
  } catch (err) {
    errorLog('Failed to fetch players for tier sync:', err);
    return;
  }

  if (!players.length) {
    warn('No players found for tier synchronization.');
    return;
  }

  const activePlayers = players.filter((player) => player.active !== false);
  const rankedPlayers = activePlayers.length ? activePlayers : players;
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
      case 'join':
        await handleJoinCommand(message, args);
        break;
      case 'leave':
        await handleLeaveCommand(message, args);
        break;
      case 'queue':
        await handleQueueCommand(message, args);
        break;
      case 'elo':
        await handleEloCommand(message, args);
        break;
      case 'maps':
        await handleMapsCommand(message, args);
        break;
      case 'ping':
        await handlePingCommand(message, args);
        break;
      case 'help':
        await handleHelpCommand(message, args);
        break;
      default:
        break;
    }
  } catch (err) {
    errorLog(`Command ${command} failed:`, err);
    await message.reply({ content: '❌ Erreur lors de l\'exécution de la commande.' });
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
