'use strict';

// Module de prédictions "PrissCoins" (LFN).
// Un admin crée une prédiction avec 2 propositions ("/predictions"), les membres
// misent des PrissCoins dessus (300 offerts au départ à chaque joueur), les côtes
// évoluent en temps réel selon les mises (système "parimutuel", comme un vrai book
// de paris communautaire), puis un admin valide le résultat ou annule via
// "/validate_predictions".

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
// PORTEFEUILLE PRISSCOINS
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

// Ajuste le solde d'un joueur. `wonDelta`/`lostDelta` ne servent qu'aux stats
// affichées dans /pcoin (profit net gagné, total perdu), pas au solde lui-même.
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
// CÔTES DYNAMIQUES (PARIMUTUEL)
// ========================

// Côte "live" = mise totale du pot / mise totale sur cette option.
// Plus une option reçoit de mises, plus sa côte baisse (comme un vrai book).
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
// EMBED / BOUTONS
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
    title = `🚫 Annulé — ${prediction.question}`;
    color = 0x95a5a6;
  } else if (isResolved) {
    const winnerLabel = prediction.winner_option === 1 ? prediction.option1_label : prediction.option2_label;
    title = `🏆 ${prediction.question} — Gagnant : ${winnerLabel}`;
    color = 0xf1c40f;
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .addFields(
      {
        name: `🔵 ${prediction.option1_label} — Côte ${formatOdds(odds1)}`,
        value: `${buildProgressBar(pool1, totalPool)}\n${pool1} PrissCoins misés`,
        inline: false
      },
      {
        name: `🔴 ${prediction.option2_label} — Côte ${formatOdds(odds2)}`,
        value: `${buildProgressBar(pool2, totalPool)}\n${pool2} PrissCoins misés`,
        inline: false
      },
      {
        name: '📊 Cagnotte totale',
        value: `${totalPool} PrissCoins misés par ${bets.length} parieur(s)`,
        inline: false
      }
    )
    .setTimestamp(new Date());

  if (isCancelled) {
    embed.setFooter({ text: 'Prédiction annulée — toutes les mises ont été remboursées.' });
  } else if (isResolved) {
    embed.setFooter({ text: 'Résultat validé — les gains ont été distribués.' });
  } else {
    embed.setFooter({ text: `Mise minimum : ${MIN_BET} PrissCoins • Une seule mise par joueur` });
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
      .setLabel('Mon solde')
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
  }).catch((err) => ctx.warn('Impossible de rafraîchir le message de prédiction:', err?.message || err));
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
    description: 'Créer une prédiction PrissCoins avec 2 propositions à parier',
    dm_permission: false,
    default_member_permissions: String(PermissionsBitField.Flags.ManageGuild),
    options: [
      {
        name: 'option1',
        description: 'Première proposition (ex: "PSG gagne")',
        type: ApplicationCommandOptionType.String,
        required: true,
        max_length: 80
      },
      {
        name: 'option2',
        description: 'Deuxième proposition (ex: "Real Madrid gagne")',
        type: ApplicationCommandOptionType.String,
        required: true,
        max_length: 80
      },
      {
        name: 'question',
        description: 'Titre de la prédiction (défaut : "Qui va gagner ?")',
        type: ApplicationCommandOptionType.String,
        required: false,
        max_length: 150
      },
      {
        name: 'channel',
        description: 'Salon où publier la prédiction (défaut : salon actuel)',
        type: ApplicationCommandOptionType.Channel,
        required: false
      }
    ]
  },
  {
    name: 'validate_predictions',
    description: 'Valider le résultat d\'une prédiction ou la supprimer',
    dm_permission: false,
    default_member_permissions: String(PermissionsBitField.Flags.ManageGuild),
    options: [
      {
        name: 'prediction',
        description: 'La prédiction concernée',
        type: ApplicationCommandOptionType.Integer,
        required: true,
        autocomplete: true
      },
      {
        name: 'resultat',
        description: 'Résultat à appliquer',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: '✅ Option 1 gagne', value: 'option1' },
          { name: '✅ Option 2 gagne', value: 'option2' },
          { name: '🚫 Supprimer / Annuler (rembourse tout le monde)', value: 'cancel' }
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
  const question = interaction.options.getString('question')?.trim() || 'Qui va gagner ?';
  const channelOption = interaction.options.getChannel('channel');
  const targetChannel = channelOption?.isTextBased() ? channelOption : interaction.channel;

  if (!targetChannel?.isTextBased()) {
    await interaction.editReply({ content: '❌ Salon invalide.' });
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
    ctx.error('Échec de création de la prédiction:', error);
    await interaction.editReply({ content: '❌ Erreur lors de la création de la prédiction.' });
    return true;
  }

  const sentMessage = await targetChannel.send({
    embeds: [buildPredictionEmbed(prediction, [])],
    components: [buildBetButtons(prediction.id, prediction, false)]
  });

  await ctx.supabase.from(PREDICTIONS_TABLE).update({ message_id: sentMessage.id }).eq('id', prediction.id);

  await interaction.editReply({
    content: `✅ Prédiction #${prediction.id} publiée dans ${targetChannel} !`
  });

  return true;
}

async function handleBetButton(interaction) {
  const [, , predictionId, option] = interaction.customId.split(':');

  const prediction = await fetchPrediction(interaction.guild.id, predictionId);
  if (!prediction || prediction.status !== 'open') {
    await interaction.reply({ content: '❌ Cette prédiction n\'accepte plus de mises.', flags: MessageFlags.Ephemeral });
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
      content: `⚠️ Tu as déjà misé **${existingBet.amount} PrissCoins** sur **${label}**. Une seule mise par prédiction.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const wallet = await getOrCreateWallet(interaction.guild.id, interaction.user.id);
  const label = option === '1' ? prediction.option1_label : prediction.option2_label;

  const modal = new ModalBuilder()
    .setCustomId(`${BET_MODAL_PREFIX}:${predictionId}:${option}`)
    .setTitle(`Miser sur : ${label}`.slice(0, 45))
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('amount')
          .setLabel(`Montant (solde : ${wallet.balance} PrissCoins)`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(`Entre ${MIN_BET} et ${wallet.balance}`)
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
    await interaction.reply({ content: '❌ Cette prédiction n\'accepte plus de mises.', flags: MessageFlags.Ephemeral });
    return;
  }

  const rawAmount = interaction.fields.getTextInputValue('amount');
  const amount = parseInt(rawAmount, 10);
  const wallet = await getOrCreateWallet(interaction.guild.id, interaction.user.id);

  if (!Number.isFinite(amount) || amount < MIN_BET) {
    await interaction.reply({ content: `❌ Mise minimum : ${MIN_BET} PrissCoins.`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (amount > MAX_BET) {
    await interaction.reply({ content: `❌ Mise maximum : ${MAX_BET} PrissCoins.`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (amount > wallet.balance) {
    await interaction.reply({ content: `❌ Solde insuffisant (${wallet.balance} PrissCoins).`, flags: MessageFlags.Ephemeral });
    return;
  }

  // On revérifie qu'aucune mise n'a été posée entre-temps (double-clic, deux modals ouverts...).
  const { data: existingBet } = await ctx.supabase
    .from(BETS_TABLE)
    .select('id')
    .eq('prediction_id', predictionId)
    .eq('user_id', interaction.user.id)
    .maybeSingle();

  if (existingBet) {
    await interaction.reply({ content: '⚠️ Tu as déjà une mise sur cette prédiction.', flags: MessageFlags.Ephemeral });
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
    // Remboursement en cas d'échec d'enregistrement de la mise.
    await adjustWallet(interaction.guild.id, interaction.user.id, amount, { wagerDelta: -amount });
    ctx.error('Échec d\'enregistrement de la mise:', error);
    await interaction.reply({ content: '❌ Erreur lors de la mise.', flags: MessageFlags.Ephemeral });
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
        .setTitle('✅ Mise enregistrée !')
        .addFields(
          { name: 'Proposition', value: label, inline: true },
          { name: 'Mise', value: `${amount} PrissCoins`, inline: true },
          { name: 'Gain potentiel (estimé)', value: `**${estimatedGain} PrissCoins**`, inline: true },
          { name: 'Nouveau solde', value: `${wallet.balance - amount} PrissCoins`, inline: true }
        )
        .setFooter({ text: 'Le gain final dépend des mises totales au moment de la validation.' })
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

  const fields = [{ name: '💰 Solde', value: `**${wallet.balance} PrissCoins**`, inline: true }];

  if (bet && prediction) {
    const label = bet.option === 1 ? prediction.option1_label : prediction.option2_label;
    const statusText = { pending: '⏳ En attente', won: '✅ Gagné', lost: '❌ Perdu', refunded: '↩️ Remboursé' }[bet.status] || bet.status;
    fields.push(
      { name: 'Ta mise', value: `${bet.amount} PrissCoins sur **${label}**`, inline: true },
      { name: 'Statut', value: statusText, inline: true }
    );
  } else {
    fields.push({ name: 'Ta mise', value: 'Aucune mise sur cette prédiction', inline: true });
  }

  await interaction.reply({
    embeds: [new EmbedBuilder().setColor(0x3498db).setTitle('Ton portefeuille PrissCoins').addFields(fields)],
    flags: MessageFlags.Ephemeral
  });
}

async function handleValidateCommand(interaction) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'validate_predictions') return false;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const predictionId = interaction.options.getInteger('prediction', true);
  const resultat = interaction.options.getString('resultat', true);

  const prediction = await fetchPrediction(interaction.guild.id, predictionId);
  if (!prediction) {
    await interaction.editReply({ content: `❌ Prédiction #${predictionId} introuvable.` });
    return true;
  }

  if (prediction.status !== 'open') {
    await interaction.editReply({ content: `❌ Cette prédiction est déjà ${prediction.status === 'cancelled' ? 'annulée' : 'validée'}.` });
    return true;
  }

  const bets = await fetchBets(predictionId);

  if (resultat === 'cancel') {
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
      content: `🚫 Prédiction #${predictionId} annulée. ${bets.length} mise(s) remboursée(s).`
    });
    return true;
  }

  const winnerOption = resultat === 'option1' ? 1 : 2;
  const winningBets = bets.filter((b) => b.option === winnerOption);
  const losingBets = bets.filter((b) => b.option !== winnerOption);
  const winningPool = winningBets.reduce((s, b) => s + b.amount, 0);
  const losingPool = losingBets.reduce((s, b) => s + b.amount, 0);
  const totalPool = winningPool + losingPool;

  const gainLines = [];

  for (const bet of winningBets) {
    // Chaque gagnant récupère sa mise + une part de la cagnotte des perdants
    // proportionnelle à sa mise (parimutuel classique).
    const payout = Math.floor(bet.amount * (totalPool / winningPool));
    const profit = payout - bet.amount;

    await adjustWallet(interaction.guild.id, bet.user_id, payout, { wonDelta: Math.max(0, profit) });
    await ctx.supabase.from(BETS_TABLE).update({ status: 'won', payout }).eq('id', bet.id);
    gainLines.push(`<@${bet.user_id}> : ${bet.amount} → **${payout} PrissCoins**`);
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
            .setTitle(`🏆 Résultat — ${prediction.question}`)
            .setDescription(
              `**${winnerLabel}** l'emporte !\n\n${
                gainLines.length ? `**Gagnants :**\n${gainLines.join('\n')}` : 'Aucun gagnant sur ce coup-ci.'
              }${losingBets.length ? `\n\n${losingBets.length} parieur(s) reparten(t) bredouille.` : ''}`
            )
            .setTimestamp(new Date())
        ]
      });
    }
  }

  await interaction.editReply({
    content: `✅ Prédiction #${predictionId} validée : **${winnerLabel}** gagne. ${winningBets.length} gagnant(s), ${losingBets.length} perdant(s).`
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
        name: `#${p.id} — ${p.question} (${p.status === 'open' ? 'ouverte' : p.status === 'closed' ? 'validée' : 'annulée'})`.slice(0, 100),
        value: p.id
      }));

    await interaction.respond(suggestions);
  } catch (err) {
    ctx.warn('Autocomplete /validate_predictions échoué:', err?.message || err);
    try {
      await interaction.respond([]);
    } catch {
      // no-op
    }
  }

  return true;
}

// ========================
// HANDLER PRINCIPAL
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
