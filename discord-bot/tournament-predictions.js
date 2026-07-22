'use strict';

const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, MessageFlags, ModalBuilder,
  TextInputBuilder, TextInputStyle,
  ApplicationCommandOptionType, PermissionsBitField
} = require('discord.js');

const STARTING_BALANCE = 500;
const MIN_BET = 10;
const LOG_PREFIX = '[TournamentPredictions]';

let ctx = null;

function init(options) {
  ctx = {
    supabase: options.supabase,
    guildId: options.guildId,
    client: options.client,
    log: (...a) => console.log(LOG_PREFIX, ...a),
    warn: (...a) => console.warn(LOG_PREFIX, ...a),
    error: (...a) => console.error(LOG_PREFIX, ...a)
  };
}

// ========================
// CALCUL DES CÔTES
// ========================

/**
 * Calcule les côtes à partir des notes des équipes.
 * Formule : côte = (scoreA + scoreB) / score * marge
 * Plus une équipe est forte (note haute), plus sa côte est basse.
 */
function computeOdds(scoreA, scoreB) {
  const total = scoreA + scoreB;
  if (!total) return { oddsA: 2.0, oddsB: 2.0 };

  const margin = 1.05; // 5% de marge bookmaker
  const rawOddsA = (total / scoreA) * margin;
  const rawOddsB = (total / scoreB) * margin;

  // Clamp entre 1.05 et 10.0
  const clamp = (v) => Math.max(1.05, Math.min(10.0, Math.round(v * 100) / 100));
  return { oddsA: clamp(rawOddsA), oddsB: clamp(rawOddsB) };
}

// ========================
// WALLET
// ========================

async function getOrCreateWallet(guildId, userId) {
  const { data, error } = await ctx.supabase
    .from('prediction_wallets')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;

  if (data) return data;

  const { data: created, error: insertError } = await ctx.supabase
    .from('prediction_wallets')
    .insert({ guild_id: guildId, user_id: userId, balance: STARTING_BALANCE })
    .select().single();

  if (insertError) throw insertError;
  return created;
}

async function updateWalletBalance(guildId, userId, delta, wonDelta = 0, lostDelta = 0) {
  const wallet = await getOrCreateWallet(guildId, userId);
  const newBalance = Math.max(0, wallet.balance + delta);

  const { error } = await ctx.supabase
    .from('prediction_wallets')
    .update({
      balance: newBalance,
      total_won: wallet.total_won + wonDelta,
      total_lost: wallet.total_lost + lostDelta,
      updated_at: new Date().toISOString()
    })
    .eq('guild_id', guildId)
    .eq('user_id', userId);

  if (error) throw error;
  return newBalance;
}

// ========================
// EMBED DU MATCH
// ========================

function buildMatchEmbed(match, bets = []) {
  const totalBetsA = bets.filter(b => b.team === 'a').reduce((s, b) => s + b.amount, 0);
  const totalBetsB = bets.filter(b => b.team === 'b').reduce((s, b) => s + b.amount, 0);
  const totalBets = totalBetsA + totalBetsB;

  const pctA = totalBets ? Math.round(totalBetsA / totalBets * 100) : 50;
  const pctB = totalBets ? Math.round(totalBetsB / totalBets * 100) : 50;

  const barA = '▰'.repeat(Math.round(pctA / 10)) + '▱'.repeat(10 - Math.round(pctA / 10));
  const barB = '▰'.repeat(Math.round(pctB / 10)) + '▱'.repeat(10 - Math.round(pctB / 10));

  const isClosed = match.status !== 'open';
  const isResolved = match.status === 'resolved';

  let title = `🎰 ${match.tournament_name} — ${match.team_a} vs ${match.team_b}`;
  if (isResolved) {
    const winnerName = match.winner === 'a' ? match.team_a : match.team_b;
    title = `🏆 ${match.tournament_name} — Résultat : ${winnerName}`;
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(isResolved ? 0xf1c40f : isClosed ? 0x95a5a6 : 0x3498db)
    .addFields(
      {
        name: `🔵 ${match.team_a} — Côte x${match.odds_a}`,
        value: `${barA} ${pctA}% (${totalBetsA} pts misés)`,
        inline: false
      },
      {
        name: `🔴 ${match.team_b} — Côte x${match.odds_b}`,
        value: `${barB} ${pctB}% (${totalBetsB} pts misés)`,
        inline: false
      },
      {
        name: '📊 Stats',
        value: `${bets.length} parieur(s) · ${totalBets} points misés au total`,
        inline: false
      }
    )
    .setFooter({
      text: isClosed
        ? 'Prédictions fermées'
        : `Mise minimum : ${MIN_BET} pts · 1 mise par joueur`
    })
    .setTimestamp(new Date());

  return embed;
}

function buildBetButtons(matchId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tpred:bet:${matchId}:a`)
      .setLabel('Miser équipe A')
      .setEmoji('🔵')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`tpred:bet:${matchId}:b`)
      .setLabel('Miser équipe B')
      .setEmoji('🔴')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`tpred:mybet:${matchId}`)
      .setLabel('Mon solde / Ma mise')
      .setEmoji('💰')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(false)
  );
}

async function refreshMatchMessage(match) {
  if (!match.channel_id || !match.message_id) return;

  const channel = await ctx.client.channels.fetch(match.channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;

  const message = await channel.messages.fetch(match.message_id).catch(() => null);
  if (!message) return;

  const { data: bets } = await ctx.supabase
    .from('tournament_prediction_bets')
    .select('team, amount')
    .eq('match_id', match.id);

  const isClosed = match.status !== 'open';
  await message.edit({
    embeds: [buildMatchEmbed(match, bets || [])],
    components: [buildBetButtons(match.id, isClosed)]
  });
}

// ========================
// SLASH COMMANDS
// ========================

// Prédictions désactivées à la demande de l'utilisateur : plus aucune commande
// tpred_create / tpred_close / tpred_resolve / tpred_wallet / tpred_leaderboard n'est enregistrée.
const slashCommands = [];

// ========================
// HANDLERS SLASH
// ========================

async function handleCreate(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const tournament = interaction.options.getString('tournament', true);
  const teamA = interaction.options.getString('team_a', true);
  const teamB = interaction.options.getString('team_b', true);
  const scoreA = interaction.options.getInteger('score_a', true);
  const scoreB = interaction.options.getInteger('score_b', true);
  const channelOption = interaction.options.getChannel('channel');
  const targetChannel = channelOption?.isTextBased() ? channelOption : interaction.channel;

  const { oddsA, oddsB } = computeOdds(scoreA, scoreB);

  // Insérer le match
  const { data: match, error } = await ctx.supabase
    .from('tournament_prediction_matches')
    .insert({
      guild_id: interaction.guild.id,
      tournament_name: tournament,
      team_a: teamA,
      team_b: teamB,
      score_a: scoreA,
      score_b: scoreB,
      odds_a: oddsA,
      odds_b: oddsB,
      channel_id: targetChannel.id,
      status: 'open'
    })
    .select().single();

  if (error) {
    ctx.error('Failed to create prediction match:', error);
    await interaction.editReply({ content: '❌ Erreur lors de la création du match.' });
    return;
  }

  // Poster le message
  const sentMessage = await targetChannel.send({
    embeds: [buildMatchEmbed(match, [])],
    components: [buildBetButtons(match.id)]
  });

  // Sauvegarder le message_id
  await ctx.supabase
    .from('tournament_prediction_matches')
    .update({ message_id: sentMessage.id })
    .eq('id', match.id);

  await interaction.editReply({
    content: `✅ Match créé !\n🔵 **${teamA}** (note ${scoreA}) — côte **x${oddsA}**\n🔴 **${teamB}** (note ${scoreB}) — côte **x${oddsB}**\n\nID : \`${match.id}\``
  });
}

async function handleClose(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const matchId = interaction.options.getString('match_id', true);
  const { data: match, error } = await ctx.supabase
    .from('tournament_prediction_matches')
    .update({ status: 'closed' })
    .eq('id', matchId)
    .eq('guild_id', interaction.guild.id)
    .select().single();

  if (error || !match) {
    await interaction.editReply({ content: '❌ Match introuvable.' });
    return;
  }

  await refreshMatchMessage(match);
  await interaction.editReply({ content: '✅ Mises fermées.' });
}

async function handleResolve(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const matchId = interaction.options.getString('match_id', true);
  const winner = interaction.options.getString('winner', true); // 'a' ou 'b'

  const { data: match } = await ctx.supabase
    .from('tournament_prediction_matches')
    .select('*')
    .eq('id', matchId)
    .eq('guild_id', interaction.guild.id)
    .maybeSingle();

  if (!match) {
    await interaction.editReply({ content: '❌ Match introuvable.' });
    return;
  }

  if (match.status === 'resolved') {
    await interaction.editReply({ content: '⚠️ Ce match est déjà résolu.' });
    return;
  }

  // Récupérer toutes les mises
  const { data: bets } = await ctx.supabase
    .from('tournament_prediction_bets')
    .select('*')
    .eq('match_id', matchId);

  const winningBets = (bets || []).filter(b => b.team === winner);
  const losingBets = (bets || []).filter(b => b.team !== winner);

  const gains = [];

  // Distribuer les gains aux gagnants
  for (const bet of winningBets) {
    const gain = Math.floor(bet.amount * bet.odds_at_bet);
    const profit = gain - bet.amount;
    await updateWalletBalance(match.guild_id, bet.user_id, gain, profit, 0);
    await ctx.supabase
      .from('tournament_prediction_bets')
      .update({ status: 'won' })
      .eq('id', bet.id);
    gains.push({ userId: bet.user_id, gain, profit });
  }

  // Marquer les perdants
  for (const bet of losingBets) {
    await ctx.supabase
      .from('tournament_prediction_bets')
      .update({ status: 'lost' })
      .eq('id', bet.id);
  }

  // Mettre à jour le match
  const { data: resolvedMatch } = await ctx.supabase
    .from('tournament_prediction_matches')
    .update({ status: 'resolved', winner, resolved_at: new Date().toISOString() })
    .eq('id', matchId)
    .select().single();

  await refreshMatchMessage(resolvedMatch);

  // Annoncer les résultats dans le channel
  if (match.channel_id) {
    const channel = await ctx.client.channels.fetch(match.channel_id).catch(() => null);
    if (channel?.isTextBased()) {
      const winnerName = winner === 'a' ? match.team_a : match.team_b;
      const gainLines = gains
        .slice(0, 10)
        .map(g => `<@${g.userId}> : +${g.profit} pts (gain total : ${g.gain} pts)`)
        .join('\n');

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle(`🏆 Résultat — ${match.tournament_name}`)
            .setDescription(
              `**${winnerName}** remporte le match !\n\n` +
              (gains.length ? `**Gagnants :**\n${gainLines}` : 'Aucun parieur gagnant.') +
              (losingBets.length ? `\n\n${losingBets.length} parieur(s) ont perdu leur mise.` : '')
            )
            .setTimestamp(new Date())
        ]
      });
    }
  }

  await interaction.editReply({
    content: `✅ Résolu ! ${winningBets.length} gagnant(s), ${losingBets.length} perdant(s).`
  });
}

async function handleWallet(interaction) {
  const wallet = await getOrCreateWallet(interaction.guild.id, interaction.user.id);

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle(`💰 Portefeuille — ${interaction.user.displayName || interaction.user.username}`)
        .addFields(
          { name: 'Solde', value: `**${wallet.balance} pts**`, inline: true },
          { name: 'Total gagné', value: `${wallet.total_won} pts`, inline: true },
          { name: 'Total perdu', value: `${wallet.total_lost} pts`, inline: true }
        )
        .setTimestamp(new Date())
    ],
    flags: MessageFlags.Ephemeral
  });
}

async function handleLeaderboard(interaction) {
  const { data, error } = await ctx.supabase
    .from('prediction_wallets')
    .select('user_id, balance, total_won')
    .eq('guild_id', interaction.guild.id)
    .order('balance', { ascending: false })
    .limit(10);

  if (error || !data?.length) {
    await interaction.reply({ content: 'Aucun parieur pour le moment.', flags: MessageFlags.Ephemeral });
    return;
  }

  const lines = data.map((row, i) =>
    `**#${i + 1}** <@${row.user_id}> — **${row.balance} pts** (gagné : ${row.total_won} pts)`
  );

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🏅 Classement des parieurs')
        .setDescription(lines.join('\n'))
        .setTimestamp(new Date())
    ]
  });
}

// ========================
// HANDLER BOUTON — MISE
// ========================

async function handleBetButton(interaction) {
  const parts = interaction.customId.split(':');
  const matchId = parts[2];
  const team = parts[3]; // 'a' ou 'b'

  // Vérifier le match
  const { data: match } = await ctx.supabase
    .from('tournament_prediction_matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();

  if (!match || match.status !== 'open') {
    await interaction.reply({ content: '❌ Les mises sont fermées.', flags: MessageFlags.Ephemeral });
    return;
  }

  // Vérifier s'il a déjà misé
  const { data: existingBet } = await ctx.supabase
    .from('tournament_prediction_bets')
    .select('id, team, amount')
    .eq('match_id', matchId)
    .eq('user_id', interaction.user.id)
    .maybeSingle();

  if (existingBet) {
    const teamName = existingBet.team === 'a' ? match.team_a : match.team_b;
    await interaction.reply({
      content: `⚠️ Tu as déjà misé **${existingBet.amount} pts** sur **${teamName}**. Une seule mise par match.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const wallet = await getOrCreateWallet(interaction.guild.id, interaction.user.id);
  const teamName = team === 'a' ? match.team_a : match.team_b;
  const odds = team === 'a' ? match.odds_a : match.odds_b;

  const modal = new ModalBuilder()
    .setCustomId(`tpred:betmodal:${matchId}:${team}`)
    .setTitle(`Miser sur ${teamName} (côte x${odds})`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('amount')
          .setLabel(`Montant (solde : ${wallet.balance} pts, min ${MIN_BET})`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(`Entre ${MIN_BET} et ${wallet.balance}`)
          .setRequired(true)
          .setMaxLength(6)
      )
    );

  await interaction.showModal(modal);
}

async function handleBetModal(interaction) {
  const parts = interaction.customId.split(':');
  const matchId = parts[2];
  const team = parts[3];

  const rawAmount = interaction.fields.getTextInputValue('amount');
  const amount = parseInt(rawAmount, 10);

  const { data: match } = await ctx.supabase
    .from('tournament_prediction_matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();

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

  // Déduire la mise
  await updateWalletBalance(interaction.guild.id, interaction.user.id, -amount, 0, amount);

  // Enregistrer la mise
  const { error } = await ctx.supabase
    .from('tournament_prediction_bets')
    .insert({
      match_id: matchId,
      guild_id: interaction.guild.id,
      user_id: interaction.user.id,
      team,
      amount,
      odds_at_bet: odds,
      potential_gain: potentialGain
    });

  if (error) {
    // Rembourser en cas d'erreur
    await updateWalletBalance(interaction.guild.id, interaction.user.id, amount, 0, -amount);
    await interaction.reply({ content: '❌ Erreur lors de la mise.', flags: MessageFlags.Ephemeral });
    return;
  }

  // Rafraîchir l'embed
  const { data: updatedMatch } = await ctx.supabase
    .from('tournament_prediction_matches')
    .select('*').eq('id', matchId).maybeSingle();
  if (updatedMatch) await refreshMatchMessage(updatedMatch);

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
          { name: 'Nouveau solde', value: `${wallet.balance - amount} pts`, inline: true }
        )
    ],
    flags: MessageFlags.Ephemeral
  });
}

async function handleMyBet(interaction) {
  const matchId = interaction.customId.split(':')[2];

  const { data: match } = await ctx.supabase
    .from('tournament_prediction_matches')
    .select('*').eq('id', matchId).maybeSingle();

  const wallet = await getOrCreateWallet(interaction.guild.id, interaction.user.id);

  const { data: bet } = await ctx.supabase
    .from('tournament_prediction_bets')
    .select('*')
    .eq('match_id', matchId)
    .eq('user_id', interaction.user.id)
    .maybeSingle();

  const fields = [
    { name: '💰 Solde actuel', value: `**${wallet.balance} pts**`, inline: true }
  ];

  if (bet && match) {
    const teamName = bet.team === 'a' ? match.team_a : match.team_b;
    fields.push(
      { name: 'Ta mise', value: `${bet.amount} pts sur **${teamName}**`, inline: true },
      { name: 'Gain potentiel', value: `**${bet.potential_gain} pts**`, inline: true },
      { name: 'Statut', value: bet.status === 'pending' ? '⏳ En attente' : bet.status === 'won' ? '✅ Gagné' : '❌ Perdu', inline: true }
    );
  } else {
    fields.push({ name: 'Ta mise', value: 'Aucune mise sur ce match', inline: true });
  }

  await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x3498db).setTitle('Ton statut').addFields(fields)], flags: MessageFlags.Ephemeral });
}

// ========================
// HANDLER PRINCIPAL
// ========================

async function handleInteraction(_interaction) {
  // Prédictions désactivées à la demande de l'utilisateur.
  return false;
}

module.exports = { init, slashCommands, handleInteraction };
