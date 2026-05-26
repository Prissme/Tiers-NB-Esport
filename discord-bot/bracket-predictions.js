'use strict';

const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, MessageFlags, ModalBuilder,
  TextInputBuilder, TextInputStyle,
  ApplicationCommandOptionType, PermissionsBitField,
  StringSelectMenuBuilder
} = require('discord.js');

const MIN_BET = 10;
const STARTING_BALANCE = 500;
const LOG_PREFIX = '[BracketPredictions]';

let ctx = null;

function init(options) {
  ctx = {
    supabase: options.supabase,
    guildId: options.guildId,
    client: options.client,
    log: (...a) => console.log(LOG_PREFIX, ...a),
    error: (...a) => console.error(LOG_PREFIX, ...a)
  };
}

// ========================
// WALLET (partagé)
// ========================

async function getOrCreateWallet(guildId, userId) {
  const { data } = await ctx.supabase
    .from('prediction_wallets')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();

  if (data) return data;

  const { data: created } = await ctx.supabase
    .from('prediction_wallets')
    .insert({ guild_id: guildId, user_id: userId, balance: STARTING_BALANCE })
    .select().single();

  return created;
}

async function updateWallet(guildId, userId, delta, wonDelta = 0, lostDelta = 0) {
  const w = await getOrCreateWallet(guildId, userId);
  const newBalance = Math.max(0, w.balance + delta);
  await ctx.supabase
    .from('prediction_wallets')
    .update({
      balance: newBalance,
      total_won: w.total_won + wonDelta,
      total_lost: w.total_lost + lostDelta,
      updated_at: new Date().toISOString()
    })
    .eq('guild_id', guildId)
    .eq('user_id', userId);
  return newBalance;
}

// ========================
// CALCUL COTES
// ========================

function computeOdds(scoreA, scoreB) {
  const total = scoreA + scoreB;
  if (!total) return { oddsA: 2.0, oddsB: 2.0 };
  const margin = 1.05;
  const clamp = (v) => Math.max(1.05, Math.min(10.0, Math.round(v * 100) / 100));
  return {
    oddsA: clamp((total / scoreA) * margin),
    oddsB: clamp((total / scoreB) * margin)
  };
}

// Côtes dynamiques pour prédictions libres
// Basées sur la répartition des mises (parimutuel)
function computeDynamicOdds(bets, optionCount) {
  const totalByOption = Array(optionCount).fill(0);
  for (const b of bets) totalByOption[b.option_index] += b.amount;
  const total = totalByOption.reduce((s, v) => s + v, 0);

  return totalByOption.map((amount) => {
    if (!total || !amount) return 2.0;
    const raw = (total / amount) * 0.95; // 5% de marge
    return Math.max(1.05, Math.min(20.0, Math.round(raw * 100) / 100));
  });
}

// ========================
// BRACKET — EMBED
// ========================

function buildBracketMatchEmbed(match, bets = []) {
  const betsA = bets.filter(b => b.team === 'a');
  const betsB = bets.filter(b => b.team === 'b');
  const totalA = betsA.reduce((s, b) => s + b.amount, 0);
  const totalB = betsB.reduce((s, b) => s + b.amount, 0);
  const total = totalA + totalB;
  const pctA = total ? Math.round(totalA / total * 100) : 50;
  const pctB = 100 - pctA;
  const bar = (pct) => '▰'.repeat(Math.round(pct / 10)) + '▱'.repeat(10 - Math.round(pct / 10));

  const isClosed = match.status !== 'open';
  const isResolved = match.status === 'resolved';

  const color = isResolved ? 0xf1c40f : isClosed ? 0x95a5a6 : 0x3498db;
  const roundName = match.round_name || `Round ${match.round_number}`;

  return new EmbedBuilder()
    .setTitle(
      isResolved
        ? `🏆 ${roundName} — Vainqueur : ${match.winner === 'a' ? match.team_a : match.team_b}`
        : `🎯 ${roundName} — ${match.team_a} vs ${match.team_b}`
    )
    .setColor(color)
    .addFields(
      {
        name: `🔵 ${match.team_a} — côte x${match.odds_a}`,
        value: `${bar(pctA)} ${pctA}% · ${totalA} pts · ${betsA.length} parieur(s)`,
        inline: false
      },
      {
        name: `🔴 ${match.team_b} — côte x${match.odds_b}`,
        value: `${bar(pctB)} ${pctB}% · ${totalB} pts · ${betsB.length} parieur(s)`,
        inline: false
      },
      {
        name: '📊 Total',
        value: `${bets.length} parieur(s) · ${total} pts misés`,
        inline: false
      }
    )
    .setFooter({ text: isClosed ? 'Mises fermées' : `Mise min. ${MIN_BET} pts · 1 mise par match` })
    .setTimestamp();
}

function buildBracketMatchButtons(matchId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`bp:bet:${matchId}:a`)
      .setLabel('Miser Équipe A')
      .setEmoji('🔵')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`bp:bet:${matchId}:b`)
      .setLabel('Miser Équipe B')
      .setEmoji('🔴')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`bp:info:${matchId}`)
      .setLabel('Mon solde')
      .setEmoji('💰')
      .setStyle(ButtonStyle.Secondary)
  );
}

async function refreshBracketMatchMessage(match) {
  if (!match.channel_id || !match.message_id) return;
  const channel = await ctx.client.channels.fetch(match.channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;
  const msg = await channel.messages.fetch(match.message_id).catch(() => null);
  if (!msg) return;

  const { data: bets } = await ctx.supabase
    .from('bracket_bets')
    .select('team, amount')
    .eq('match_id', match.id);

  const isClosed = match.status !== 'open';
  await msg.edit({
    embeds: [buildBracketMatchEmbed(match, bets || [])],
    components: [buildBracketMatchButtons(match.id, isClosed)]
  });
}

// ========================
// BRACKET — COMMANDES
// ========================

// Parse le texte du bracket collé par l'admin
// Format attendu (1 ligne par match) :
// TeamA vs TeamB [scoreA-scoreB]
// ex: "Cloud9 vs NaVi 70-55"
function parseBracketInput(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  const matches = [];

  for (const line of lines) {
    // Format: "TeamA vs TeamB 70-55" ou "TeamA vs TeamB"
    const match = line.match(/^(.+?)\s+vs\s+(.+?)(?:\s+(\d+)-(\d+))?$/i);
    if (!match) continue;

    matches.push({
      team_a: match[1].trim(),
      team_b: match[2].trim(),
      score_a: match[3] ? parseInt(match[3]) : 50,
      score_b: match[4] ? parseInt(match[4]) : 50
    });
  }

  return matches;
}

function getRoundName(totalMatches, matchIndex) {
  // Détermine le nom du round selon le nombre total de matchs du bracket
  if (totalMatches >= 8) return { name: 'Huitièmes de finale', number: 1 };
  if (totalMatches >= 4) return { name: 'Quarts de finale', number: 2 };
  if (totalMatches >= 2) return { name: 'Demi-finales', number: 3 };
  return { name: 'Finale', number: 4 };
}

async function handleBracketImport(interaction) {
  // Afficher la modal pour coller le bracket
  const modal = new ModalBuilder()
    .setCustomId('bp:import_modal')
    .setTitle('Importer un bracket')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('bracket_name')
          .setLabel('Nom du tournoi')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(60)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('bracket_matches')
          .setLabel('Matchs (1 par ligne : TeamA vs TeamB 70-55)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setPlaceholder(
            'Cloud9 vs NaVi 70-55\nTeam Liquid vs Astralis 60-65\n...'
          )
          .setMaxLength(2000)
      )
    );

  await interaction.showModal(modal);
}

async function handleBracketImportModal(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const name = interaction.fields.getTextInputValue('bracket_name');
  const raw = interaction.fields.getTextInputValue('bracket_matches');
  const matches = parseBracketInput(raw);

  if (!matches.length) {
    await interaction.editReply({
      content: '❌ Aucun match reconnu. Format attendu : `TeamA vs TeamB 70-55` (1 par ligne).'
    });
    return;
  }

  // Créer le bracket
  const { data: bracket, error: bracketError } = await ctx.supabase
    .from('imported_brackets')
    .insert({
      guild_id: interaction.guild.id,
      name,
      channel_id: interaction.channel.id,
      status: 'active'
    })
    .select().single();

  if (bracketError) {
    await interaction.editReply({ content: '❌ Erreur lors de la création du bracket.' });
    return;
  }

  // Calculer les côtes et insérer les matchs
  const { name: roundName, number: roundNumber } = getRoundName(matches.length, 0);

  const matchInserts = matches.map((m, i) => {
    const { oddsA, oddsB } = computeOdds(m.score_a, m.score_b);
    return {
      bracket_id: bracket.id,
      round_name: roundName,
      round_number: roundNumber,
      match_index: i,
      team_a: m.team_a,
      team_b: m.team_b,
      score_a: m.score_a,
      score_b: m.score_b,
      odds_a: oddsA,
      odds_b: oddsB,
      status: 'pending',
      channel_id: interaction.channel.id
    };
  });

  const { data: createdMatches, error: matchError } = await ctx.supabase
    .from('bracket_matches')
    .insert(matchInserts)
    .select();

  if (matchError) {
    await interaction.editReply({ content: '❌ Erreur lors de la création des matchs.' });
    return;
  }

  // Résumé
  const lines = createdMatches.map((m, i) =>
    `**Match ${i + 1}** : ${m.team_a} (x${m.odds_a}) vs ${m.team_b} (x${m.odds_b})\nID : \`${m.id}\``
  );

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`✅ Bracket "${name}" importé — ${createdMatches.length} match(s)`)
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: 'Utilise /bp_open <match_id> pour ouvrir les mises sur un match' })
    ]
  });
}

async function handleBracketOpen(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const matchId = interaction.options.getString('match_id', true);
  const channelOption = interaction.options.getChannel('channel');
  const targetChannel = channelOption?.isTextBased()
    ? channelOption
    : interaction.channel;

  const { data: match } = await ctx.supabase
    .from('bracket_matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();

  if (!match) {
    await interaction.editReply({ content: '❌ Match introuvable.' });
    return;
  }

  if (match.status !== 'pending') {
    await interaction.editReply({ content: '⚠️ Ce match est déjà ouvert ou résolu.' });
    return;
  }

  // Poster le message de mise
  const sentMsg = await targetChannel.send({
    embeds: [buildBracketMatchEmbed(match, [])],
    components: [buildBracketMatchButtons(match.id)]
  });

  await ctx.supabase
    .from('bracket_matches')
    .update({ status: 'open', message_id: sentMsg.id, channel_id: targetChannel.id })
    .eq('id', matchId);

  await interaction.editReply({ content: `✅ Mises ouvertes pour **${match.team_a} vs ${match.team_b}**` });
}

async function handleBracketClose(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const matchId = interaction.options.getString('match_id', true);

  const { data: match } = await ctx.supabase
    .from('bracket_matches')
    .update({ status: 'closed' })
    .eq('id', matchId)
    .select().single();

  if (!match) {
    await interaction.editReply({ content: '❌ Match introuvable.' });
    return;
  }

  await refreshBracketMatchMessage(match);
  await interaction.editReply({ content: `✅ Mises fermées pour **${match.team_a} vs ${match.team_b}**` });
}

async function handleBracketResolve(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const matchId = interaction.options.getString('match_id', true);
  const winner = interaction.options.getString('winner', true);

  const { data: match } = await ctx.supabase
    .from('bracket_matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();

  if (!match || match.status === 'resolved') {
    await interaction.editReply({ content: '❌ Match introuvable ou déjà résolu.' });
    return;
  }

  // Récupérer les mises
  const { data: bets } = await ctx.supabase
    .from('bracket_bets')
    .select('*')
    .eq('match_id', matchId);

  const winners = (bets || []).filter(b => b.team === winner);
  const losers = (bets || []).filter(b => b.team !== winner);

  // Distribuer les gains
  for (const bet of winners) {
    const gain = Math.floor(bet.amount * bet.odds_at_bet);
    await updateWallet(match.guild_id, bet.user_id, gain, gain - bet.amount, 0);
    await ctx.supabase.from('bracket_bets').update({ status: 'won' }).eq('id', bet.id);
  }

  for (const bet of losers) {
    await ctx.supabase.from('bracket_bets').update({ status: 'lost' }).eq('id', bet.id);
  }

  // Mettre à jour le match
  const { data: resolved } = await ctx.supabase
    .from('bracket_matches')
    .update({ status: 'resolved', winner })
    .eq('id', matchId)
    .select().single();

  await refreshBracketMatchMessage(resolved);

  // Annonce dans le channel
  if (match.channel_id) {
    const channel = await ctx.client.channels.fetch(match.channel_id).catch(() => null);
    if (channel?.isTextBased()) {
      const winnerName = winner === 'a' ? match.team_a : match.team_b;
      const gainLines = winners.slice(0, 8)
        .map(b => `<@${b.user_id}> : **+${Math.floor(b.amount * b.odds_at_bet) - b.amount} pts**`)
        .join('\n');

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle(`🏆 ${match.round_name} — ${winnerName} gagne !`)
            .setDescription(
              winners.length
                ? `**Parieurs gagnants :**\n${gainLines}`
                : 'Aucun parieur gagnant sur ce match.'
            )
            .setFooter({ text: `${losers.length} parieur(s) perdant(s)` })
        ]
      });
    }
  }

  await interaction.editReply({
    content: `✅ Match résolu ! ${winners.length} gagnant(s), ${losers.length} perdant(s).`
  });
}

// ========================
// BRACKET — BOUTONS
// ========================

async function handleBracketBetButton(interaction) {
  const parts = interaction.customId.split(':');
  const matchId = parts[2];
  const team = parts[3];

  const { data: match } = await ctx.supabase
    .from('bracket_matches')
    .select('*').eq('id', matchId).maybeSingle();

  if (!match || match.status !== 'open') {
    await interaction.reply({ content: '❌ Les mises sont fermées.', flags: MessageFlags.Ephemeral });
    return;
  }

  const { data: existingBet } = await ctx.supabase
    .from('bracket_bets')
    .select('team, amount')
    .eq('match_id', matchId)
    .eq('user_id', interaction.user.id)
    .maybeSingle();

  if (existingBet) {
    const n = existingBet.team === 'a' ? match.team_a : match.team_b;
    await interaction.reply({
      content: `⚠️ Tu as déjà misé **${existingBet.amount} pts** sur **${n}**.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const wallet = await getOrCreateWallet(interaction.guild.id, interaction.user.id);
  const teamName = team === 'a' ? match.team_a : match.team_b;
  const odds = team === 'a' ? match.odds_a : match.odds_b;

  const modal = new ModalBuilder()
    .setCustomId(`bp:betmodal:${matchId}:${team}`)
    .setTitle(`Miser sur ${teamName} (x${odds})`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('amount')
          .setLabel(`Solde : ${wallet.balance} pts · Min ${MIN_BET}`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(`Entre ${MIN_BET} et ${wallet.balance}`)
          .setRequired(true)
          .setMaxLength(6)
      )
    );

  await interaction.showModal(modal);
}

async function handleBracketBetModal(interaction) {
  const parts = interaction.customId.split(':');
  const matchId = parts[2];
  const team = parts[3];

  const amount = parseInt(interaction.fields.getTextInputValue('amount'), 10);

  const { data: match } = await ctx.supabase
    .from('bracket_matches')
    .select('*').eq('id', matchId).maybeSingle();

  if (!match || match.status !== 'open') {
    await interaction.reply({ content: '❌ Les mises sont fermées.', flags: MessageFlags.Ephemeral });
    return;
  }

  const wallet = await getOrCreateWallet(interaction.guild.id, interaction.user.id);

  if (isNaN(amount) || amount < MIN_BET) {
    await interaction.reply({ content: `❌ Mise minimum : ${MIN_BET} pts.`, flags: MessageFlags.Ephemeral });
    return;
  }
  if (amount > wallet.balance) {
    await interaction.reply({ content: `❌ Solde insuffisant (${wallet.balance} pts).`, flags: MessageFlags.Ephemeral });
    return;
  }

  const odds = team === 'a' ? match.odds_a : match.odds_b;
  const potentialGain = Math.floor(amount * odds);
  const teamName = team === 'a' ? match.team_a : match.team_b;

  await updateWallet(interaction.guild.id, interaction.user.id, -amount, 0, amount);

  const { error } = await ctx.supabase.from('bracket_bets').insert({
    match_id: matchId,
    guild_id: interaction.guild.id,
    user_id: interaction.user.id,
    team,
    amount,
    odds_at_bet: odds,
    potential_gain: potentialGain
  });

  if (error) {
    await updateWallet(interaction.guild.id, interaction.user.id, amount, 0, -amount);
    await interaction.reply({ content: '❌ Erreur lors de la mise.', flags: MessageFlags.Ephemeral });
    return;
  }

  const { data: updatedMatch } = await ctx.supabase
    .from('bracket_matches').select('*').eq('id', matchId).maybeSingle();
  if (updatedMatch) await refreshBracketMatchMessage(updatedMatch);

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Mise enregistrée !')
        .addFields(
          { name: 'Équipe', value: teamName, inline: true },
          { name: 'Mise', value: `${amount} pts`, inline: true },
          { name: 'Côte', value: `x${odds}`, inline: true },
          { name: 'Gain potentiel', value: `**${potentialGain} pts**`, inline: true },
          { name: 'Solde restant', value: `${wallet.balance - amount} pts`, inline: true }
        )
    ],
    flags: MessageFlags.Ephemeral
  });
}

// ========================
// PRÉDICTIONS LIBRES
// ========================

async function handleFreePredCreate(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('fp:create_modal')
    .setTitle('Créer une prédiction libre')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('title')
          .setLabel('Question / Titre')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(200)
          .setPlaceholder('Ce joueur va-t-il faire 1 kill dans le tournoi ?')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('options')
          .setLabel('Options (1 par ligne, max 5, avec emoji optionnel)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(500)
          .setPlaceholder('✅ Oui\n❌ Non\n🤔 Au moins 2 kills')
      )
    );

  await interaction.showModal(modal);
}

async function handleFreePredCreateModal(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const title = interaction.fields.getTextInputValue('title');
  const rawOptions = interaction.fields.getTextInputValue('options');

  const options = rawOptions
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map(label => {
      // Détecter un emoji en début de ligne
      const emojiMatch = label.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s+(.+)$/u);
      return emojiMatch
        ? { emoji: emojiMatch[1], label: emojiMatch[2] }
        : { emoji: '🔹', label };
    });

  if (options.length < 2) {
    await interaction.editReply({ content: '❌ Il faut au moins 2 options.' });
    return;
  }

  const channelOption = interaction.options?.getChannel?.('channel');
  const targetChannel = channelOption?.isTextBased()
    ? channelOption
    : interaction.channel;

  // Créer en BDD
  const { data: pred, error } = await ctx.supabase
    .from('free_predictions')
    .insert({
      guild_id: interaction.guild.id,
      title,
      options: JSON.stringify(options),
      status: 'open',
      channel_id: targetChannel.id
    })
    .select().single();

  if (error) {
    await interaction.editReply({ content: '❌ Erreur lors de la création.' });
    return;
  }

  // Poster le message
  const { embed, components } = buildFreePredEmbed(pred, [], options);
  const sentMsg = await targetChannel.send({ embeds: [embed], components });

  await ctx.supabase
    .from('free_predictions')
    .update({ message_id: sentMsg.id })
    .eq('id', pred.id);

  await interaction.editReply({
    content: `✅ Prédiction créée !\nID : \`${pred.id}\``
  });
}

function buildFreePredEmbed(pred, bets = [], options = null) {
  const parsedOptions = options || JSON.parse(pred.options || '[]');
  const isClosed = pred.status !== 'open';
  const isResolved = pred.status === 'resolved';

  // Calculer les totaux par option
  const totals = parsedOptions.map((_, i) =>
    bets.filter(b => b.option_index === i).reduce((s, b) => s + b.amount, 0)
  );
  const totalAll = totals.reduce((s, v) => s + v, 0);

  // Côtes dynamiques
  const odds = computeDynamicOdds(bets, parsedOptions.length);

  const fields = parsedOptions.map((opt, i) => {
    const pct = totalAll ? Math.round(totals[i] / totalAll * 100) : Math.round(100 / parsedOptions.length);
    const bar = '▰'.repeat(Math.round(pct / 10)) + '▱'.repeat(10 - Math.round(pct / 10));
    const betCount = bets.filter(b => b.option_index === i).length;

    let name = `${opt.emoji} ${opt.label} — côte x${odds[i]}`;
    if (isResolved && pred.winning_option_index === i) name = `🏆 ${name}`;

    return {
      name,
      value: `${bar} ${pct}% · ${totals[i]} pts · ${betCount} parieur(s)`,
      inline: false
    };
  });

  const embed = new EmbedBuilder()
    .setTitle(
      isResolved
        ? `✅ ${pred.title}`
        : `🎰 ${pred.title}`
    )
    .setColor(isResolved ? 0xf1c40f : isClosed ? 0x95a5a6 : 0x9b59b6)
    .addFields(...fields)
    .addFields({ name: '📊 Total', value: `${bets.length} parieur(s) · ${totalAll} pts misés`, inline: false })
    .setFooter({ text: isClosed ? 'Prédictions fermées' : `Mise min. ${MIN_BET} pts · 1 mise` })
    .setTimestamp();

  // Boutons : 1 par option (max 5)
  const buttonRow = new ActionRowBuilder().addComponents(
    parsedOptions.slice(0, 5).map((opt, i) =>
      new ButtonBuilder()
        .setCustomId(`fp:bet:${pred.id}:${i}`)
        .setLabel(opt.label.slice(0, 80))
        .setEmoji(opt.emoji)
        .setStyle(i === 0 ? ButtonStyle.Success : i === 1 ? ButtonStyle.Danger : ButtonStyle.Secondary)
        .setDisabled(isClosed)
    )
  );

  const infoRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`fp:info:${pred.id}`)
      .setLabel('Mon solde / Ma mise')
      .setEmoji('💰')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [buttonRow, infoRow] };
}

async function refreshFreePredMessage(pred) {
  if (!pred.channel_id || !pred.message_id) return;
  const channel = await ctx.client.channels.fetch(pred.channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;
  const msg = await channel.messages.fetch(pred.message_id).catch(() => null);
  if (!msg) return;

  const { data: bets } = await ctx.supabase
    .from('free_prediction_bets')
    .select('option_index, amount')
    .eq('prediction_id', pred.id);

  const { embed, components } = buildFreePredEmbed(pred, bets || []);
  await msg.edit({ embeds: [embed], components });
}

async function handleFreePredBetButton(interaction) {
  const parts = interaction.customId.split(':');
  const predId = parts[2];
  const optionIndex = parseInt(parts[3], 10);

  const { data: pred } = await ctx.supabase
    .from('free_predictions')
    .select('*').eq('id', predId).maybeSingle();

  if (!pred || pred.status !== 'open') {
    await interaction.reply({ content: '❌ Les prédictions sont fermées.', flags: MessageFlags.Ephemeral });
    return;
  }

  const { data: existingBet } = await ctx.supabase
    .from('free_prediction_bets')
    .select('option_index, amount')
    .eq('prediction_id', predId)
    .eq('user_id', interaction.user.id)
    .maybeSingle();

  if (existingBet) {
    const options = JSON.parse(pred.options);
    const chosenLabel = options[existingBet.option_index]?.label;
    await interaction.reply({
      content: `⚠️ Tu as déjà misé **${existingBet.amount} pts** sur **${chosenLabel}**.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const wallet = await getOrCreateWallet(interaction.guild.id, interaction.user.id);
  const options = JSON.parse(pred.options);
  const chosenOption = options[optionIndex];

  // Calculer la côte actuelle
  const { data: currentBets } = await ctx.supabase
    .from('free_prediction_bets')
    .select('option_index, amount')
    .eq('prediction_id', predId);

  const currentOdds = computeDynamicOdds(currentBets || [], options.length);
  const currentOdd = currentOdds[optionIndex];

  const modal = new ModalBuilder()
    .setCustomId(`fp:betmodal:${predId}:${optionIndex}`)
    .setTitle(`Miser sur "${chosenOption.label}" (x${currentOdd})`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('amount')
          .setLabel(`Solde : ${wallet.balance} pts · Min ${MIN_BET}`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(`${MIN_BET} à ${wallet.balance}`)
          .setRequired(true)
          .setMaxLength(6)
      )
    );

  await interaction.showModal(modal);
}

async function handleFreePredBetModal(interaction) {
  const parts = interaction.customId.split(':');
  const predId = parts[2];
  const optionIndex = parseInt(parts[3], 10);
  const amount = parseInt(interaction.fields.getTextInputValue('amount'), 10);

  const { data: pred } = await ctx.supabase
    .from('free_predictions')
    .select('*').eq('id', predId).maybeSingle();

  if (!pred || pred.status !== 'open') {
    await interaction.reply({ content: '❌ Les prédictions sont fermées.', flags: MessageFlags.Ephemeral });
    return;
  }

  const wallet = await getOrCreateWallet(interaction.guild.id, interaction.user.id);

  if (isNaN(amount) || amount < MIN_BET) {
    await interaction.reply({ content: `❌ Mise minimum : ${MIN_BET} pts.`, flags: MessageFlags.Ephemeral });
    return;
  }
  if (amount > wallet.balance) {
    await interaction.reply({ content: `❌ Solde insuffisant.`, flags: MessageFlags.Ephemeral });
    return;
  }

  const options = JSON.parse(pred.options);

  // Recalculer la côte au moment de la mise
  const { data: currentBets } = await ctx.supabase
    .from('free_prediction_bets')
    .select('option_index, amount')
    .eq('prediction_id', predId);

  const currentOdds = computeDynamicOdds(currentBets || [], options.length);
  const oddsAtBet = currentOdds[optionIndex];
  const potentialGain = Math.floor(amount * oddsAtBet);

  await updateWallet(interaction.guild.id, interaction.user.id, -amount, 0, amount);

  const { error } = await ctx.supabase.from('free_prediction_bets').insert({
    prediction_id: predId,
    guild_id: interaction.guild.id,
    user_id: interaction.user.id,
    option_index: optionIndex,
    amount,
    odds_at_bet: oddsAtBet,
    potential_gain: potentialGain
  });

  if (error) {
    await updateWallet(interaction.guild.id, interaction.user.id, amount, 0, -amount);
    await interaction.reply({ content: '❌ Erreur lors de la mise.', flags: MessageFlags.Ephemeral });
    return;
  }

  const { data: updatedPred } = await ctx.supabase
    .from('free_predictions').select('*').eq('id', predId).maybeSingle();
  if (updatedPred) await refreshFreePredMessage(updatedPred);

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Mise enregistrée !')
        .addFields(
          { name: 'Option', value: `${options[optionIndex].emoji} ${options[optionIndex].label}`, inline: true },
          { name: 'Mise', value: `${amount} pts`, inline: true },
          { name: 'Côte', value: `x${oddsAtBet}`, inline: true },
          { name: 'Gain potentiel', value: `**${potentialGain} pts**`, inline: true },
          { name: 'Solde restant', value: `${wallet.balance - amount} pts`, inline: true }
        )
        .setFooter({ text: '⚠️ La côte est dynamique, elle peut changer avant la fermeture.' })
    ],
    flags: MessageFlags.Ephemeral
  });
}

async function handleFreePredClose(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const predId = interaction.options.getString('pred_id', true);

  const { data: pred } = await ctx.supabase
    .from('free_predictions')
    .update({ status: 'closed' })
    .eq('id', predId)
    .select().single();

  if (!pred) {
    await interaction.editReply({ content: '❌ Prédiction introuvable.' });
    return;
  }

  await refreshFreePredMessage(pred);
  await interaction.editReply({ content: '✅ Prédiction fermée.' });
}

async function handleFreePredResolve(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const predId = interaction.options.getString('pred_id', true);
  const winnerIndex = interaction.options.getInteger('winner', true);

  const { data: pred } = await ctx.supabase
    .from('free_predictions')
    .select('*').eq('id', predId).maybeSingle();

  if (!pred || pred.status === 'resolved') {
    await interaction.editReply({ content: '❌ Introuvable ou déjà résolu.' });
    return;
  }

  const options = JSON.parse(pred.options);
  if (winnerIndex < 0 || winnerIndex >= options.length) {
    await interaction.editReply({ content: '❌ Index invalide.' });
    return;
  }

  const { data: bets } = await ctx.supabase
    .from('free_prediction_bets')
    .select('*').eq('prediction_id', predId);

  const winners = (bets || []).filter(b => b.option_index === winnerIndex);
  const losers = (bets || []).filter(b => b.option_index !== winnerIndex);

  for (const bet of winners) {
    const gain = Math.floor(bet.amount * bet.odds_at_bet);
    await updateWallet(pred.guild_id, bet.user_id, gain, gain - bet.amount, 0);
    await ctx.supabase.from('free_prediction_bets').update({ status: 'won' }).eq('id', bet.id);
  }
  for (const bet of losers) {
    await ctx.supabase.from('free_prediction_bets').update({ status: 'lost' }).eq('id', bet.id);
  }

  const { data: resolved } = await ctx.supabase
    .from('free_predictions')
    .update({ status: 'resolved', winning_option_index: winnerIndex })
    .eq('id', predId)
    .select().single();

  await refreshFreePredMessage(resolved);

  if (pred.channel_id) {
    const channel = await ctx.client.channels.fetch(pred.channel_id).catch(() => null);
    if (channel?.isTextBased()) {
      const winLabel = `${options[winnerIndex].emoji} ${options[winnerIndex].label}`;
      const gainLines = winners.slice(0, 8)
        .map(b => `<@${b.user_id}> : **+${Math.floor(b.amount * b.odds_at_bet) - b.amount} pts**`)
        .join('\n');

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle(`✅ Résultat — ${pred.title}`)
            .setDescription(
              `**Bonne réponse : ${winLabel}**\n\n` +
              (winners.length ? `**Gagnants :**\n${gainLines}` : 'Aucun parieur gagnant.')
            )
            .setFooter({ text: `${losers.length} parieur(s) perdant(s)` })
        ]
      });
    }
  }

  await interaction.editReply({
    content: `✅ Résolu ! Bonne réponse : **${options[winnerIndex].label}** · ${winners.length} gagnant(s).`
  });
}

async function handleInfo(interaction, table, idField, idValue, teamField = null) {
  const wallet = await getOrCreateWallet(interaction.guild.id, interaction.user.id);

  const { data: bet } = await ctx.supabase
    .from(table)
    .select('*')
    .eq(idField, idValue)
    .eq('user_id', interaction.user.id)
    .maybeSingle();

  const fields = [{ name: '💰 Solde', value: `**${wallet.balance} pts**`, inline: true }];

  if (bet) {
    fields.push(
      { name: 'Ta mise', value: `${bet.amount} pts`, inline: true },
      { name: 'Gain potentiel', value: `${bet.potential_gain} pts`, inline: true },
      { name: 'Statut', value: bet.status === 'pending' ? '⏳' : bet.status === 'won' ? '✅ Gagné' : '❌ Perdu', inline: true }
    );
  } else {
    fields.push({ name: 'Ta mise', value: 'Aucune mise', inline: true });
  }

  await interaction.reply({
    embeds: [new EmbedBuilder().setColor(0x3498db).setTitle('Ton statut').addFields(fields)],
    flags: MessageFlags.Ephemeral
  });
}

// ========================
// SLASH COMMANDS
// ========================

const slashCommands = [
  {
    name: 'bp_import',
    description: 'Importer un bracket depuis BracketHQ (coller les matchs manuellement)',
    default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString(),
    dm_permission: false
  },
  {
    name: 'bp_open',
    description: 'Ouvrir les mises pour un match du bracket',
    default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString(),
    dm_permission: false,
    options: [
      { name: 'match_id', description: 'ID du match', type: ApplicationCommandOptionType.String, required: true },
      { name: 'channel', description: 'Salon (optionnel)', type: ApplicationCommandOptionType.Channel, required: false }
    ]
  },
  {
    name: 'bp_close',
    description: 'Fermer les mises pour un match',
    default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString(),
    dm_permission: false,
    options: [
      { name: 'match_id', description: 'ID du match', type: ApplicationCommandOptionType.String, required: true }
    ]
  },
  {
    name: 'bp_resolve',
    description: 'Déclarer le vainqueur d\'un match et distribuer les gains',
    default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString(),
    dm_permission: false,
    options: [
      { name: 'match_id', description: 'ID du match', type: ApplicationCommandOptionType.String, required: true },
      { name: 'winner', description: 'Vainqueur', type: ApplicationCommandOptionType.String, required: true,
        choices: [{ name: 'Équipe A', value: 'a' }, { name: 'Équipe B', value: 'b' }] }
    ]
  },
  {
    name: 'fp_create',
    description: 'Créer une prédiction libre (oui/non, choix multiples...)',
    default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString(),
    dm_permission: false
  },
  {
    name: 'fp_close',
    description: 'Fermer les mises d\'une prédiction libre',
    default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString(),
    dm_permission: false,
    options: [
      { name: 'pred_id', description: 'ID de la prédiction', type: ApplicationCommandOptionType.String, required: true }
    ]
  },
  {
    name: 'fp_resolve',
    description: 'Déclarer la bonne réponse d\'une prédiction libre',
    default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString(),
    dm_permission: false,
    options: [
      { name: 'pred_id', description: 'ID de la prédiction', type: ApplicationCommandOptionType.String, required: true },
      { name: 'winner', description: 'Index de la bonne réponse (0 = 1ère option, 1 = 2ème...)', type: ApplicationCommandOptionType.Integer, required: true, min_value: 0, max_value: 4 }
    ]
  },
  {
    name: 'pred_wallet',
    description: 'Voir ton solde de points de prédiction',
    dm_permission: false
  },
  {
    name: 'pred_leaderboard',
    description: 'Classement des meilleurs parieurs',
    dm_permission: false
  }
];

// ========================
// HANDLER PRINCIPAL
// ========================

async function handleInteraction(interaction) {
  if (!ctx) return false;

  // Slash commands
  if (interaction.isChatInputCommand()) {
    switch (interaction.commandName) {
      case 'bp_import': await handleBracketImport(interaction); return true;
      case 'bp_open': await handleBracketOpen(interaction); return true;
      case 'bp_close': await handleBracketClose(interaction); return true;
      case 'bp_resolve': await handleBracketResolve(interaction); return true;
      case 'fp_create': await handleFreePredCreate(interaction); return true;
      case 'fp_close': await handleFreePredClose(interaction); return true;
      case 'fp_resolve': await handleFreePredResolve(interaction); return true;
      case 'pred_wallet': {
        const w = await getOrCreateWallet(interaction.guild.id, interaction.user.id);
        await interaction.reply({
          embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle('💰 Ton portefeuille')
            .addFields(
              { name: 'Solde', value: `**${w.balance} pts**`, inline: true },
              { name: 'Total gagné', value: `${w.total_won} pts`, inline: true },
              { name: 'Total perdu', value: `${w.total_lost} pts`, inline: true }
            )],
          flags: MessageFlags.Ephemeral
        });
        return true;
      }
      case 'pred_leaderboard': {
        const { data } = await ctx.supabase
          .from('prediction_wallets')
          .select('user_id, balance, total_won')
          .eq('guild_id', interaction.guild.id)
          .order('balance', { ascending: false })
          .limit(10);
        const lines = (data || []).map((r, i) =>
          `**#${i + 1}** <@${r.user_id}> — **${r.balance} pts** (gagné : ${r.total_won} pts)`
        );
        await interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle('🏅 Classement parieurs')
            .setDescription(lines.join('\n') || 'Aucun parieur.')],
        });
        return true;
      }
    }
  }

  // Modals
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'bp:import_modal') { await handleBracketImportModal(interaction); return true; }
    if (interaction.customId === 'fp:create_modal') { await handleFreePredCreateModal(interaction); return true; }
    if (interaction.customId.startsWith('bp:betmodal:')) { await handleBracketBetModal(interaction); return true; }
    if (interaction.customId.startsWith('fp:betmodal:')) { await handleFreePredBetModal(interaction); return true; }
  }

  // Boutons
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('bp:bet:')) { await handleBracketBetButton(interaction); return true; }
    if (interaction.customId.startsWith('bp:info:')) {
      const matchId = interaction.customId.split(':')[2];
      await handleInfo(interaction, 'bracket_bets', 'match_id', matchId);
      return true;
    }
    if (interaction.customId.startsWith('fp:bet:')) { await handleFreePredBetButton(interaction); return true; }
    if (interaction.customId.startsWith('fp:info:')) {
      const predId = interaction.customId.split(':')[2];
      await handleInfo(interaction, 'free_prediction_bets', 'prediction_id', predId);
      return true;
    }
  }

  return false;
}

module.exports = { init, slashCommands, handleInteraction };
