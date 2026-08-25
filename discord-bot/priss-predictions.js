'use strict';

// "PrissCoins" predictions module (LFN).
// An admin creates a prediction with 2 propositions ("/predictions"), members bet
// PrissCoins on it (everyone gets 300 to start), odds move live based on the bets
// ("parimutuel" system, like a real community sportsbook), then an admin validates
// the result or cancels it via "/validate_predictions".

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ApplicationCommandOptionType,
  PermissionsBitField
} = require('discord.js');

const LOG_PREFIX = '[PrissPredictions]';
const STARTING_BALANCE = 300;
const MIN_BET = 10;
const MAX_BET = 100000;

const WALLET_TABLE = 'lfn_prisscoins_wallets';
const PREDICTIONS_TABLE = 'lfn_priss_predictions';
const BETS_TABLE = 'lfn_priss_prediction_bets';

const BET_BUTTON_PREFIX = 'pcoin:bet';
const BALANCE_BUTTON_PREFIX = 'pcoin:balance';
const BET_MODAL_PREFIX = 'pcoin:betmodal';

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
// PRISSCOINS WALLET
// ========================

async function getOrCreateWallet(guildId, userId) {
  const { data, error } = await ctx.supabase
    .from(WALLET_TABLE)
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  if (data) return data;

  const { data: created, error: insertError } = await ctx.supabase
    .from(WALLET_TABLE)
    .insert({ guild_id: guildId, user_id: userId, balance: STARTING_BALANCE })
    .select()
    .single();

  if (insertError) throw insertError;
  return created;
}

// Adjusts a player's balance. `wonDelta`/`lostDelta` only feed the stats shown
// in the wallet embed (net profit, total lost), they don't affect the balance itself.
async function adjustWallet(guildId, userId, delta, { wagerDelta = 0, wonDelta = 0, lostDelta = 0 } = {}) {
  const wallet = await getOrCreateWallet(guildId, userId);
  const newBalance = Math.max(0, wallet.balance + delta);

  const { error } = await ctx.supabase
    .from(WALLET_TABLE)
    .update({
      balance: newBalance,
      total_wagered: (wallet.total_wagered || 0) + wagerDelta,
      total_won: (wallet.total_won || 0) + wonDelta,
      total_lost: (wallet.total_lost || 0) + lostDelta,
      updated_at: new Date().toISOString()
    })
    .eq('guild_id', guildId)
    .eq('user_id', userId);

  if (error) throw error;
  return newBalance;
}

// ========================
// DYNAMIC (PARIMUTUEL) ODDS
// ========================

// Live odds = total pool / total pool bet on that option.
// The more an option receives, the lower its odds get (like a real sportsbook).
function computeLiveOdds(pool1, pool2) {
  const total = pool1 + pool2;
  if (!total) return { odds1: null, odds2: null };

  return {
    odds1: pool1 ? Math.round((total / pool1) * 100) / 100 : null,
    odds2: pool2 ? Math.round((total / pool2) * 100) / 100 : null
  };
}

function formatOdds(odds) {
  return odds ? `x${odds.toFixed(2)}` : '—';
}

// ========================
// EMBED / BUTTONS
// ========================

async function fetchBets(predictionId) {
  const { data, error } = await ctx.supabase
    .from(BETS_TABLE)
    .select('*')
    .eq('prediction_id', predictionId);

  if (error) throw error;
  return data || [];
}

function buildProgressBar(count, total) {
  const totalBlocks = 10;
  const ratio = total ? count / total : 0;
  const filled = Math.round(ratio * totalBlocks);
  return `${'▰'.repeat(filled)}${'▱'.repeat(totalBlocks - filled)}`;
}

function buildPredictionEmbed(prediction, bets) {
  const pool1 = bets.filter((b) => b.option === 1).reduce((s, b) => s + b.amount, 0);
  const pool2 = bets.filter((b) => b.option === 2).reduce((s, b) => s + b.amount, 0);
  const totalPool = pool1 + pool2;
  const { odds1, odds2 } = computeLiveOdds(pool1, pool2);

  const isCancelled = prediction.status === 'cancelled';
  const isClosed = prediction.status === 'closed';
  const isResolved = isClosed && prediction.winner_option;

  let title = `🔮 ${prediction.question}`;
  let color = 0x5865f2;
  if (isCancelled) {
    title = `🚫 Cancelled — ${prediction.question}`;
    color = 0x95a5a6;
  } else if (isResolved) {
    const winnerLabel = prediction.winner_option === 1 ? prediction.option1_label : prediction.option2_label;
    title = `🏆 ${prediction.question} — Winner: ${winnerLabel}`;
    color = 0xf1c40f;
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .addFields(
      {
        name: `🔵 ${prediction.option1_label} — Odds ${formatOdds(odds1)}`,
        value: `${buildProgressBar(pool1, totalPool)}\n${pool1} PrissCoins wagered`,
        inline: false
      },
      {
        name: `🔴 ${prediction.option2_label} — Odds ${formatOdds(odds2)}`,
        value: `${buildProgressBar(pool2, totalPool)}\n${pool2} PrissCoins wagered`,
        inline: false
      },
      {
        name: '📊 Total pot',
        value: `${totalPool} PrissCoins wagered by ${bets.length} bettor(s)`,
        inline: false
      }
    )
    .setTimestamp(new Date());

  if (isCancelled) {
    embed.setFooter({ text: 'Prediction cancelled — every bet has been refunded.' });
  } else if (isResolved) {
    embed.setFooter({ text: 'Result validated — winnings have been distributed.' });
  } else {
    embed.setFooter({ text: `Minimum bet: ${MIN_BET} PrissCoins • One bet per player` });
  }

  return embed;
}

function buildBetButtons(predictionId, prediction, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${BET_BUTTON_PREFIX}:${predictionId}:1`)
      .setLabel(prediction.option1_label.slice(0, 60))
      .setEmoji('🔵')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`${BET_BUTTON_PREFIX}:${predictionId}:2`)
      .setLabel(prediction.option2_label.slice(0, 60))
      .setEmoji('🔴')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`${BALANCE_BUTTON_PREFIX}:${predictionId}`)
      .setLabel('My balance')
      .setEmoji('💰')
      .setStyle(ButtonStyle.Secondary)
  );
}

async function refreshPredictionMessage(prediction) {
  if (!prediction.channel_id || !prediction.message_id) return;

  const channel = await ctx.client.channels.fetch(prediction.channel_id).catch(() => null);
  if (!channel?.isTextBased()) return;

  const message = await channel.messages.fetch(prediction.message_id).catch(() => null);
  if (!message) return;

  const bets = await fetchBets(prediction.id);
  const isOpen = prediction.status === 'open';

  await message.edit({
    embeds: [buildPredictionEmbed(prediction, bets)],
    components: isOpen ? [buildBetButtons(prediction.id, prediction, false)] : []
  }).catch((err) => ctx.warn('Unable to refresh prediction message:', err?.message || err));
}

async function fetchPrediction(guildId, predictionId) {
  const { data, error } = await ctx.supabase
    .from(PREDICTIONS_TABLE)
    .select('*')
    .eq('guild_id', guildId)
    .eq('id', predictionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ========================
// SLASH COMMANDS
// ========================

const slashCommands = [
  {
    name: 'predictions',
    description: 'Create a PrissCoins prediction with 2 propositions to bet on',
    dm_permission: false,
    default_member_permissions: String(PermissionsBitField.Flags.ManageGuild),
    options: [
      {
        name: 'option1',
        description: 'First proposition (e.g. "PSG wins")',
        type: ApplicationCommandOptionType.String,
        required: true,
        max_length: 80
      },
      {
        name: 'option2',
        description: 'Second proposition (e.g. "Real Madrid wins")',
        type: ApplicationCommandOptionType.String,
        required: true,
        max_length: 80
      },
      {
        name: 'question',
        description: 'Prediction title (default: "Who is going to win?")',
        type: ApplicationCommandOptionType.String,
        required: false,
        max_length: 150
      },
      {
        name: 'channel',
        description: 'Channel to post the prediction in (default: current channel)',
        type: ApplicationCommandOptionType.Channel,
        required: false
      }
    ]
  },
  {
    name: 'validate_predictions',
    description: 'Validate the result of a prediction or delete it',
    dm_permission: false,
    default_member_permissions: String(PermissionsBitField.Flags.ManageGuild),
    options: [
      {
        name: 'prediction',
        description: 'The prediction to resolve',
        type: ApplicationCommandOptionType.Integer,
        required: true,
        autocomplete: true
      },
      {
        name: 'result',
        description: 'Result to apply',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: '✅ Option 1 wins', value: 'option1' },
          { name: '✅ Option 2 wins', value: 'option2' },
          { name: '🚫 Delete / Cancel (refunds everyone)', value: 'cancel' }
        ]
      }
    ]
  }
];

async function handleCreateCommand(interaction) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'predictions') return false;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const option1 = interaction.options.getString('option1', true).trim();
  const option2 = interaction.options.getString('option2', true).trim();
  const question = interaction.options.getString('question')?.trim() || 'Who is going to win?';
  const channelOption = interaction.options.getChannel('channel');
  const targetChannel = channelOption?.isTextBased() ? channelOption : interaction.channel;

  if (!targetChannel?.isTextBased()) {
    await interaction.editReply({ content: '❌ Invalid channel.' });
    return true;
  }

  const { data: prediction, error } = await ctx.supabase
    .from(PREDICTIONS_TABLE)
    .insert({
      guild_id: interaction.guild.id,
      channel_id: targetChannel.id,
      question,
      option1_label: option1,
      option2_label: option2,
      status: 'open',
      created_by: interaction.user.id
    })
    .select()
    .single();

  if (error) {
    ctx.error('Failed to create prediction:', error);
    await interaction.editReply({ content: '❌ Error while creating the prediction.' });
    return true;
  }

  const sentMessage = await targetChannel.send({
    embeds: [buildPredictionEmbed(prediction, [])],
    components: [buildBetButtons(prediction.id, prediction, false)]
  });

  await ctx.supabase.from(PREDICTIONS_TABLE).update({ message_id: sentMessage.id }).eq('id', prediction.id);

  await interaction.editReply({
    content: `✅ Prediction #${prediction.id} posted in ${targetChannel}!`
  });

  return true;
}

async function handleBetButton(interaction) {
  const [, , predictionId, option] = interaction.customId.split(':');

  const prediction = await fetchPrediction(interaction.guild.id, predictionId);
  if (!prediction || prediction.status !== 'open') {
    await interaction.reply({ content: '❌ This prediction no longer accepts bets.', flags: MessageFlags.Ephemeral });
    return;
  }

  const { data: existingBet } = await ctx.supabase
    .from(BETS_TABLE)
    .select('id, option, amount')
    .eq('prediction_id', predictionId)
    .eq('user_id', interaction.user.id)
    .maybeSingle();

  if (existingBet) {
    const label = existingBet.option === 1 ? prediction.option1_label : prediction.option2_label;
    await interaction.reply({
      content: `⚠️ You already bet **${existingBet.amount} PrissCoins** on **${label}**. Only one bet per prediction.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const wallet = await getOrCreateWallet(interaction.guild.id, interaction.user.id);
  const label = option === '1' ? prediction.option1_label : prediction.option2_label;

  const modal = new ModalBuilder()
    .setCustomId(`${BET_MODAL_PREFIX}:${predictionId}:${option}`)
    .setTitle(`Bet on: ${label}`.slice(0, 45))
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('amount')
          .setLabel(`Amount (balance: ${wallet.balance} PrissCoins)`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(`Between ${MIN_BET} and ${wallet.balance}`)
          .setRequired(true)
          .setMaxLength(7)
      )
    );

  await interaction.showModal(modal);
}

async function handleBetModalSubmit(interaction) {
  const [, , predictionId, option] = interaction.customId.split(':');
  const optionNumber = Number(option);

  const prediction = await fetchPrediction(interaction.guild.id, predictionId);
  if (!prediction || prediction.status !== 'open') {
    await interaction.reply({ content: '❌ This prediction no longer accepts bets.', flags: MessageFlags.Ephemeral });
    return;
  }

  const rawAmount = interaction.fields.getTextInputValue('amount');
  const amount = parseInt(rawAmount, 10);
  const wallet = await getOrCreateWallet(interaction.guild.id, interaction.user.id);

  if (!Number.isFinite(amount) || amount < MIN_BET) {
    await interaction.reply({ content: `❌ Minimum bet: ${MIN_BET} PrissCoins.`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (amount > MAX_BET) {
    await interaction.reply({ content: `❌ Maximum bet: ${MAX_BET} PrissCoins.`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (amount > wallet.balance) {
    await interaction.reply({ content: `❌ Insufficient balance (${wallet.balance} PrissCoins).`, flags: MessageFlags.Ephemeral });
    return;
  }

  // Re-check that no bet was placed in the meantime (double-click, two modals open...).
  const { data: existingBet } = await ctx.supabase
    .from(BETS_TABLE)
    .select('id')
    .eq('prediction_id', predictionId)
    .eq('user_id', interaction.user.id)
    .maybeSingle();

  if (existingBet) {
    await interaction.reply({ content: '⚠️ You already have a bet on this prediction.', flags: MessageFlags.Ephemeral });
    return;
  }

  await adjustWallet(interaction.guild.id, interaction.user.id, -amount, { wagerDelta: amount });

  const { error } = await ctx.supabase.from(BETS_TABLE).insert({
    prediction_id: predictionId,
    guild_id: interaction.guild.id,
    user_id: interaction.user.id,
    option: optionNumber,
    amount,
    status: 'pending'
  });

  if (error) {
    // Refund if the bet failed to save.
    await adjustWallet(interaction.guild.id, interaction.user.id, amount, { wagerDelta: -amount });
    ctx.error('Failed to save bet:', error);
    await interaction.reply({ content: '❌ Error while placing the bet.', flags: MessageFlags.Ephemeral });
    return;
  }

  const bets = await fetchBets(predictionId);
  await refreshPredictionMessage(prediction);

  const pool1 = bets.filter((b) => b.option === 1).reduce((s, b) => s + b.amount, 0);
  const pool2 = bets.filter((b) => b.option === 2).reduce((s, b) => s + b.amount, 0);
  const totalPool = pool1 + pool2;
  const myPool = optionNumber === 1 ? pool1 : pool2;
  const estimatedGain = Math.floor(amount * (totalPool / myPool));
  const label = optionNumber === 1 ? prediction.option1_label : prediction.option2_label;

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Bet placed!')
        .addFields(
          { name: 'Proposition', value: label, inline: true },
          { name: 'Bet', value: `${amount} PrissCoins`, inline: true },
          { name: 'Estimated gain', value: `**${estimatedGain} PrissCoins**`, inline: true },
          { name: 'New balance', value: `${wallet.balance - amount} PrissCoins`, inline: true }
        )
        .setFooter({ text: 'The final payout depends on total bets at the time of validation.' })
    ],
    flags: MessageFlags.Ephemeral
  });
}

async function handleBalanceButton(interaction) {
  const predictionId = interaction.customId.split(':')[2];

  const wallet = await getOrCreateWallet(interaction.guild.id, interaction.user.id);
  const { data: bet } = await ctx.supabase
    .from(BETS_TABLE)
    .select('*')
    .eq('prediction_id', predictionId)
    .eq('user_id', interaction.user.id)
    .maybeSingle();

  const prediction = await fetchPrediction(interaction.guild.id, predictionId);

  const fields = [{ name: '💰 Balance', value: `**${wallet.balance} PrissCoins**`, inline: true }];

  if (bet && prediction) {
    const label = bet.option === 1 ? prediction.option1_label : prediction.option2_label;
    const statusText = { pending: '⏳ Pending', won: '✅ Won', lost: '❌ Lost', refunded: '↩️ Refunded' }[bet.status] || bet.status;
    fields.push(
      { name: 'Your bet', value: `${bet.amount} PrissCoins on **${label}**`, inline: true },
      { name: 'Status', value: statusText, inline: true }
    );
  } else {
    fields.push({ name: 'Your bet', value: 'No bet on this prediction', inline: true });
  }

  await interaction.reply({
    embeds: [new EmbedBuilder().setColor(0x3498db).setTitle('Your PrissCoins wallet').addFields(fields)],
    flags: MessageFlags.Ephemeral
  });
}

async function handleValidateCommand(interaction) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'validate_predictions') return false;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const predictionId = interaction.options.getInteger('prediction', true);
  const result = interaction.options.getString('result', true);

  const prediction = await fetchPrediction(interaction.guild.id, predictionId);
  if (!prediction) {
    await interaction.editReply({ content: `❌ Prediction #${predictionId} not found.` });
    return true;
  }

  if (prediction.status !== 'open') {
    await interaction.editReply({ content: `❌ This prediction is already ${prediction.status === 'cancelled' ? 'cancelled' : 'validated'}.` });
    return true;
  }

  const bets = await fetchBets(predictionId);

  if (result === 'cancel') {
    for (const bet of bets) {
      await adjustWallet(interaction.guild.id, bet.user_id, bet.amount, { wagerDelta: -bet.amount });
      await ctx.supabase.from(BETS_TABLE).update({ status: 'refunded' }).eq('id', bet.id);
    }

    await ctx.supabase
      .from(PREDICTIONS_TABLE)
      .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
      .eq('id', predictionId);

    const updatedPrediction = await fetchPrediction(interaction.guild.id, predictionId);
    await refreshPredictionMessage(updatedPrediction);

    await interaction.editReply({
      content: `🚫 Prediction #${predictionId} cancelled. ${bets.length} bet(s) refunded.`
    });
    return true;
  }

  const winnerOption = result === 'option1' ? 1 : 2;
  const winningBets = bets.filter((b) => b.option === winnerOption);
  const losingBets = bets.filter((b) => b.option !== winnerOption);
  const winningPool = winningBets.reduce((s, b) => s + b.amount, 0);
  const losingPool = losingBets.reduce((s, b) => s + b.amount, 0);
  const totalPool = winningPool + losingPool;

  const gainLines = [];

  for (const bet of winningBets) {
    // Each winner gets their stake back plus a share of the losers' pool
    // proportional to their bet (classic parimutuel payout).
    const payout = Math.floor(bet.amount * (totalPool / winningPool));
    const profit = payout - bet.amount;

    await adjustWallet(interaction.guild.id, bet.user_id, payout, { wonDelta: Math.max(0, profit) });
    await ctx.supabase.from(BETS_TABLE).update({ status: 'won', payout }).eq('id', bet.id);
    gainLines.push(`<@${bet.user_id}>: ${bet.amount} → **${payout} PrissCoins**`);
  }

  for (const bet of losingBets) {
    await adjustWallet(interaction.guild.id, bet.user_id, 0, { lostDelta: bet.amount });
    await ctx.supabase.from(BETS_TABLE).update({ status: 'lost', payout: 0 }).eq('id', bet.id);
  }

  await ctx.supabase
    .from(PREDICTIONS_TABLE)
    .update({ status: 'closed', winner_option: winnerOption, resolved_at: new Date().toISOString() })
    .eq('id', predictionId);

  const updatedPrediction = await fetchPrediction(interaction.guild.id, predictionId);
  await refreshPredictionMessage(updatedPrediction);

  const winnerLabel = winnerOption === 1 ? prediction.option1_label : prediction.option2_label;

  if (prediction.channel_id) {
    const channel = await ctx.client.channels.fetch(prediction.channel_id).catch(() => null);
    if (channel?.isTextBased()) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle(`🏆 Result — ${prediction.question}`)
            .setDescription(
              `**${winnerLabel}** wins!\n\n${
                gainLines.length ? `**Winners:**\n${gainLines.join('\n')}` : 'No winner this time.'
              }${losingBets.length ? `\n\n${losingBets.length} bettor(s) walk away empty-handed.` : ''}`
            )
            .setTimestamp(new Date())
        ]
      });
    }
  }

  await interaction.editReply({
    content: `✅ Prediction #${predictionId} validated: **${winnerLabel}** wins. ${winningBets.length} winner(s), ${losingBets.length} loser(s).`
  });

  return true;
}

async function handleAutocomplete(interaction) {
  if (!interaction.isAutocomplete() || interaction.commandName !== 'validate_predictions') return false;

  try {
    const focused = String(interaction.options.getFocused() || '').toLowerCase();

    const { data, error } = await ctx.supabase
      .from(PREDICTIONS_TABLE)
      .select('id, question, option1_label, option2_label, status')
      .eq('guild_id', interaction.guild.id)
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) throw error;

    const suggestions = (data || [])
      .filter((p) => {
        const haystack = `${p.id} ${p.question} ${p.option1_label} ${p.option2_label}`.toLowerCase();
        return haystack.includes(focused);
      })
      .slice(0, 25)
      .map((p) => ({
        name: `#${p.id} — ${p.question} (${p.status === 'open' ? 'open' : p.status === 'closed' ? 'validated' : 'cancelled'})`.slice(0, 100),
        value: p.id
      }));

    await interaction.respond(suggestions);
  } catch (err) {
    ctx.warn('Autocomplete for /validate_predictions failed:', err?.message || err);
    try {
      await interaction.respond([]);
    } catch {
      // no-op
    }
  }

  return true;
}

// ========================
// MAIN HANDLER
// ========================

async function handleInteraction(interaction) {
  if (await handleAutocomplete(interaction)) return true;
  if (await handleCreateCommand(interaction)) return true;
  if (await handleValidateCommand(interaction)) return true;

  if (interaction.isButton() && interaction.customId?.startsWith(`${BET_BUTTON_PREFIX}:`)) {
    await handleBetButton(interaction);
    return true;
  }

  if (interaction.isButton() && interaction.customId?.startsWith(`${BALANCE_BUTTON_PREFIX}:`)) {
    await handleBalanceButton(interaction);
    return true;
  }

  if (interaction.isModalSubmit() && interaction.customId?.startsWith(`${BET_MODAL_PREFIX}:`)) {
    await handleBetModalSubmit(interaction);
    return true;
  }

  return false;
}

module.exports = { init, slashCommands, handleInteraction };
