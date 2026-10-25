/**
 * tournamentSystem.js
 * ───────────────────
 * Guide statique des tournois PTV (discord.js v14).
 * Les tournois sont récurrents, donc le guide est écrit en dur et n'a jamais besoin
 * d'être mis à jour automatiquement. Le détail de chaque tournoi s'affiche via un
 * menu déroulant (éphémère). Les textes marqués « Coming soon » restent à remplir.
 */

const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    MessageFlags,
    AttachmentBuilder
} = require('discord.js');
const path = require('path');
const fs = require('fs');

const EMBED_COLOR_MAIN = 0x0A192F;
const EMBED_COLOR_DETAIL = 0x0A192F;
const FOOTER_TEXT = "La course vers le first Tier A continue !";
const TWITCH_URL = 'https://www.twitch.tv/prissmetv';
const SELECT_CUSTOM_ID = 'guide_select:tournament';
const COMING_SOON = '🚧 Coming soon';

/**
 * Hebdomadaire : 3 tournois par semaine (heures en UTC+1).
 */
const WEEKLY_SCHEDULE = [
    { day: 'Wednesday', time: '8:00 PM (UTC+1)' },
    { day: 'Saturday', time: '4:00 PM (UTC+1)' },
    { day: 'Sunday', time: '4:00 PM (UTC+1)' }
];

/**
 * Tournois proposés dans le menu. Pour remplir un détail plus tard, modifie
 * `details` : chaque champ devient un champ de l'embed.
 */
const TOURNAMENTS = {
    open_elite: {
        label: 'PrissCup OPEN / ELITE',
        emoji: '🏆',
        summary: 'Weekly PrissCup cups (OPEN and ELITE)',
        details: {
            schedule: COMING_SOON,
            entry: COMING_SOON,
            format: COMING_SOON,
            prizes: COMING_SOON
        }
    },
    fearless: {
        label: 'PrissCup Fearless',
        emoji: '🏆',
        summary: 'PrissCup Fearless',
        details: {
            schedule: COMING_SOON,
            entry: COMING_SOON,
            format: COMING_SOON,
            prizes: COMING_SOON
        }
    },
    nations: {
        label: 'PrissCup Nations',
        emoji: '🏆',
        summary: 'PrissCup Nations',
        details: {
            schedule: COMING_SOON,
            entry: COMING_SOON,
            format: COMING_SOON,
            prizes: COMING_SOON
        }
    },
    mixer: {
        label: 'PrissCup Mixer',
        emoji: '🏆',
        summary: 'PrissCup Mixer',
        details: {
            schedule: COMING_SOON,
            entry: COMING_SOON,
            format: COMING_SOON,
            prizes: COMING_SOON
        }
    },
    swiss: {
        label: 'Swiss PrissCup',
        emoji: '🏆',
        summary: 'Swiss PrissCup',
        details: {
            schedule: COMING_SOON,
            entry: COMING_SOON,
            format: COMING_SOON,
            prizes: COMING_SOON
        }
    },
    paid: {
        label: 'Paid tournaments',
        emoji: '💰',
        summary: 'Paid tournaments',
        details: {
            schedule: COMING_SOON,
            entry: COMING_SOON,
            format: COMING_SOON,
            prizes: COMING_SOON
        }
    }
};

/**
 * Anciens boutons (messages déjà postés) : redirigés vers les nouveaux détails.
 */
const LEGACY_BUTTON_MAP = {
    open: 'open_elite',
    elite: 'open_elite'
};

/**
 * Fonction d'aide pour localiser une image dans le dossier public
 */
function getPublicAttachment(fileName) {
    const pathsToTest = [
        path.join(__dirname, '../public', fileName),
        path.join(__dirname, './public', fileName),
        path.join(__dirname, fileName),
        path.join(process.cwd(), 'public', fileName)
    ];

    for (const p of pathsToTest) {
        if (fs.existsSync(p)) {
            return new AttachmentBuilder(p, { name: fileName });
        }
    }
    console.warn(`[Tournament] ATTENTION : Fichier '${fileName}' introuvable.`);
    return null;
}

/**
 * Génère l'embed principal du guide et le menu déroulant (statique, aucune requête DB).
 */
function buildGuideMenu() {
    const scheduleLines = WEEKLY_SCHEDULE
        .map(({ day, time }) => `📅 **${day}** — ${time}`)
        .join('\n');

    const tournamentLines = Object.values(TOURNAMENTS)
        .map((t) => `${t.emoji} ${t.label}`)
        .join('\n');

    const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR_MAIN)
        .setThumbnail('attachment://PTV.webp')
        .setImage('attachment://Tournois.webp')
        .setDescription(
            "# 🏆 PTV Tournaments Guide\n" +
            "We run **3 tournaments every week**:\n" +
            `${scheduleLines}\n\u200b\n` +
            "**Tournaments**\n" +
            `${tournamentLines}\n\u200b\n` +
            "Pick a tournament in the menu below to see how it works.\n\n" +
            `Streamed live on Twitch → ${TWITCH_URL}`
        )
        .setFooter({ text: FOOTER_TEXT });

    const menu = new StringSelectMenuBuilder()
        .setCustomId(SELECT_CUSTOM_ID)
        .setPlaceholder('Choose a tournament to learn more')
        .addOptions(
            Object.entries(TOURNAMENTS).map(([value, t]) => ({
                label: t.label,
                value,
                description: t.summary.slice(0, 100),
                emoji: t.emoji
            }))
        );

    const row = new ActionRowBuilder().addComponents(menu);

    return { embed, row };
}

/**
 * Détail d'un tournoi, affiché en éphémère après sélection dans le menu.
 */
function buildTournamentDetailEmbed(key) {
    const tournament = TOURNAMENTS[key];
    if (!tournament) return null;

    return new EmbedBuilder()
        .setDescription(`# ${tournament.emoji}  ${tournament.label}\n${tournament.summary}\n\u200b`)
        .setColor(EMBED_COLOR_DETAIL)
        .addFields(
            { name: '📅  Schedule', value: tournament.details.schedule, inline: true },
            { name: '🎯  Entry conditions', value: tournament.details.entry, inline: true },
            { name: '⚙️  Format', value: tournament.details.format, inline: true },
            { name: '💰  Prizes', value: tournament.details.prizes, inline: true },
            { name: '📺  Live on Twitch', value: TWITCH_URL, inline: false }
        )
        .setThumbnail('attachment://PTV.webp');
}

/**
 * Met à jour le message du guide déjà posté (utile après un changement de texte dans le code).
 */
async function refreshGuideMenuDirect(interaction) {
    if (!interaction) return;

    const { data: menuRef, error } = await global.supabase
        .from('lfn_tournament_menus')
        .select('*')
        .eq('guild_id', interaction.guildId || interaction.guild?.id)
        .maybeSingle();

    if (error || !menuRef) return;

    try {
        let channel = interaction.channel;
        if (!channel && interaction.client) {
            channel = await interaction.client.channels.fetch(menuRef.channel_id).catch(() => null);
        }
        if (!channel) return;

        const message = await channel.messages.fetch(menuRef.message_id).catch(() => null);
        if (!message || typeof message.edit !== 'function') return;

        const { embed, row } = buildGuideMenu();

        const files = [];
        const fileTournois = getPublicAttachment('Tournois.webp');
        const filePTV = getPublicAttachment('PTV.webp');
        if (fileTournois) files.push(fileTournois);
        if (filePTV) files.push(filePTV);

        await message.edit({ embeds: [embed], components: [row], files }).catch(() => null);
    } catch (err) {
        console.warn(`[Tournament] Synchronisation du guide ignorée.`);
    }
}

/**
 * Intercepteur principal des interactions (Commandes, menu, anciens boutons)
 */
async function handleTournamentInteractions(interaction) {
    if (!interaction) return false;

    // 1. SÉLECTION D'UN TOURNOI DANS LE MENU
    if (interaction.isStringSelectMenu() && interaction.customId === SELECT_CUSTOM_ID) {
        const key = interaction.values?.[0];
        const detailEmbed = buildTournamentDetailEmbed(key);
        if (!detailEmbed) return true;

        const files = [];
        const filePTV = getPublicAttachment('PTV.webp');
        if (filePTV) files.push(filePTV);

        await interaction.reply({ embeds: [detailEmbed], files, flags: [MessageFlags.Ephemeral] }).catch(() => null);
        return true;
    }

    // 2. ANCIENS BOUTONS (messages postés avant le menu déroulant)
    if (interaction.isButton() && interaction.customId?.startsWith('guide_btn:')) {
        const legacyKey = interaction.customId.split(':')[1];
        const key = LEGACY_BUTTON_MAP[legacyKey];
        const detailEmbed = key ? buildTournamentDetailEmbed(key) : null;
        if (!detailEmbed) return true;

        const files = [];
        const filePTV = getPublicAttachment('PTV.webp');
        if (filePTV) files.push(filePTV);

        await interaction.reply({ embeds: [detailEmbed], files, flags: [MessageFlags.Ephemeral] }).catch(() => null);
        return true;
    }

    // 3. COMMANDE SLASH
    if (interaction.isChatInputCommand() && interaction.commandName === 'cup_menu') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => null);

        const { embed, row } = buildGuideMenu();

        const files = [];
        const fileTournois = getPublicAttachment('Tournois.webp');
        const filePTV = getPublicAttachment('PTV.webp');
        if (fileTournois) files.push(fileTournois);
        if (filePTV) files.push(filePTV);

        try {
            let targetChannel = interaction.channel;
            if (!targetChannel || typeof targetChannel.send !== 'function') {
                targetChannel = await interaction.client.channels.fetch(interaction.channelId).catch(() => null);
            }

            if (!targetChannel || typeof targetChannel.send !== 'function') {
                await interaction.followUp({ content: "❌ Impossible de générer le guide dans ce salon.", flags: [MessageFlags.Ephemeral] }).catch(() => null);
                return true;
            }

            const msg = await targetChannel.send({ embeds: [embed], components: [row], files });

            await global.supabase
                .from('lfn_tournament_menus')
                .upsert({
                    guild_id: interaction.guild.id,
                    channel_id: targetChannel.id,
                    message_id: msg.id
                });

            await interaction.followUp({ content: "✅ Guide des tournois posté !", flags: [MessageFlags.Ephemeral] }).catch(() => null);
        } catch (sendError) {
            await interaction.followUp({ content: "❌ Impossible d'envoyer le guide. Vérifie les permissions.", flags: [MessageFlags.Ephemeral] }).catch(() => null);
        }
        return true;
    }

    return false;
}

const slashCommandsData = [
    new SlashCommandBuilder()
        .setName('cup_menu')
        .setDescription("(Re)poste le guide statique des tournois PTV.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
];

module.exports = {
    handleTournamentInteractions,
    slashCommandsData
};
