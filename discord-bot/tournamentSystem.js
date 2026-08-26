/**
 * tournamentSystem.js
 * ───────────────────
 * Guide statique des tournois PTV (discord.js v14).
 * Remplace l'ancien système de calendrier dynamique (Supabase lfn_tournaments) :
 * les PrissCup OPEN/ELITE et les International Scrims sont des événements
 * récurrents, donc ce guide est écrit en dur et n'a jamais besoin d'être
 * mis à jour manuellement.
 */

const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
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
 * Génère l'embed principal du guide (statique, aucune requête DB).
 */
function buildGuideMenu() {
    const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR_MAIN)
        .setThumbnail('attachment://PTV.webp')
        .setImage('attachment://Tournois.webp')
        .setDescription(
            "# 🏆 PTV Tournaments Guide\n" +
            "Click a cup below for its full rules and entry conditions.\n\u200b\n" +
            "🥈 **PrissCup OPEN** — every **Saturday at 4:00 PM (CET)**\n" +
            "No cashprize · open to Low Tier teams\n\n" +
            "👑 **PrissCup ELITE** — every **Sunday at 4:00 PM (CET)**\n" +
            "💰 10€ cashprize · reserved for High Tier teams\n\n" +
            `Both cups are streamed live on Twitch → ${TWITCH_URL}\n\u200b\n` +
            "🌍 **International Scrims (IS)** — held from time to time\n" +
            "2 country teams face off to prepare for the **NWC in November**."
        )
        .setFooter({ text: FOOTER_TEXT });

    const buttons = [
        new ButtonBuilder()
            .setCustomId('guide_btn:open')
            .setLabel('PrissCup OPEN')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji({ id: '1510208177541611540', name: 'WinnerPin' }),
        new ButtonBuilder()
            .setCustomId('guide_btn:elite')
            .setLabel('PrissCup ELITE')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji({ id: '1510208177541611540', name: 'WinnerPin' })
    ];

    return { embed, buttons };
}

/**
 * Détail statique de chaque cup, affiché en éphémère au clic sur un bouton.
 */
function buildCupDetailEmbed(kind) {
    if (kind === 'elite') {
        return new EmbedBuilder()
            .setDescription("# 👑  PrissCup ELITE\nWeekly cup reserved for High Tier teams.\n\u200b")
            .setColor(EMBED_COLOR_DETAIL)
            .addFields(
                { name: "📅  Schedule", value: "Every Sunday, 4:00 PM (CET)", inline: true },
                { name: "💰  Cashprize", value: "10€", inline: true },
                { name: "🎯  Entry conditions", value: "High Tier teams only", inline: true },
                { name: "📺  Live on Twitch", value: TWITCH_URL, inline: false }
            )
            .setThumbnail('attachment://PTV.webp');
    }

    return new EmbedBuilder()
        .setDescription("# 🥈  PrissCup OPEN\nWeekly cup open to Low Tier teams.\n\u200b")
        .setColor(EMBED_COLOR_DETAIL)
        .addFields(
            { name: "📅  Schedule", value: "Every Saturday, 4:00 PM (CET)", inline: true },
            { name: "💰  Cashprize", value: "None", inline: true },
            { name: "🎯  Entry conditions", value: "Low Tier teams only", inline: true },
            { name: "📺  Live on Twitch", value: TWITCH_URL, inline: false }
        )
        .setThumbnail('attachment://PTV.webp');
}

/**
 * Met à jour le message du guide déjà posté (utile si on veut forcer un refresh visuel,
 * par ex. après un changement de texte dans le code). Le guide étant statique, ce n'est
 * jamais requis automatiquement.
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

        const { embed, buttons } = buildGuideMenu();
        const row = new ActionRowBuilder().addComponents(buttons);

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
 * Intercepteur principal des interactions (Commandes, Boutons)
 */
async function handleTournamentInteractions(interaction) {
    if (!interaction) return false;

    // 1. CLIC SUR UN BOUTON DE CUP (détail statique)
    if (interaction.isButton() && interaction.customId?.startsWith('guide_btn:')) {
        try {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => null);
        } catch (e) {
            return true;
        }

        const kind = interaction.customId.split(':')[1];
        const detailEmbed = buildCupDetailEmbed(kind);

        const files = [];
        const filePTV = getPublicAttachment('PTV.webp');
        if (filePTV) files.push(filePTV);

        await interaction.followUp({ embeds: [detailEmbed], files, flags: [MessageFlags.Ephemeral] }).catch(() => null);
        return true;
    }

    // 2. COMMANDE SLASH
    if (interaction.isChatInputCommand() && interaction.commandName === 'cup_menu') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => null);

        const { embed, buttons } = buildGuideMenu();
        const row = new ActionRowBuilder().addComponents(buttons);

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
