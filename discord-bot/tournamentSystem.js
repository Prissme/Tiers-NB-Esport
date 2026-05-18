/**
 * tournamentSystem.js
 * ───────────────────
 * Système de tournois interactif pour Discord (discord.js v14)
 * Connecté à Supabase pour la persistance globale.
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

// Couleur demandée : Bleu foncé
const EMBED_COLOR_MAIN = 0x0A192F;   
const EMBED_COLOR_DETAIL = 0x0A192F; 
const EMBED_COLOR_CREATE = 0x0A2E1A; 
const FOOTER_TEXT = "La course vers le first Tier A continue !";

// Fonction d'aide pour localiser de manière sûre le fichier Tournois.webp
function getTournamentIconAttachment() {
    const pathsToTest = [
        path.join(__dirname, '../public/Tournois.webp'),
        path.join(__dirname, './public/Tournois.webp'),
        path.join(__dirname, 'public/Tournois.webp'),
        path.join(process.cwd(), 'public/Tournois.webp')
    ];

    for (const p of pathsToTest) {
        if (fs.existsSync(p)) {
            return new AttachmentBuilder(p, { name: 'Tournois.webp' });
        }
    }
    console.warn("[Tournament] ATTENTION : Fichier 'Tournois.webp' introuvable.");
    return null;
}

/**
 * Convertit une chaîne de caractères ou un timestamp en balise de temps Discord
 */
function parseDiscordTimestamp(dateStr, format = 'F') {
    if (!dateStr) return "Non définie";
    
    if (/^\d+$/.test(dateStr.trim())) {
        return `<t:${dateStr.trim()}:${format}>`;
    }

    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
        return `<t:${Math.floor(parsed / 1000)}:${format}>`;
    }

    return dateStr;
}

async function buildMainMenu() {
    const embed = new EmbedBuilder()
        .setTitle("🎮  Tournois disponibles")
        .setDescription("Clique sur une cup pour voir les détails, les conditions d'inscription et le cashprize.\n\u200b")
        .setColor(EMBED_COLOR_MAIN)
        .setTimestamp()
        .setImage('attachment://Tournois.webp') // En GRAND au milieu de l'embed
        .setFooter({ text: FOOTER_TEXT });

    const { data: tournaments, error } = await global.supabase
        .from('lfn_tournaments')
        .select('*')
        .order('created_at', { ascending: true });

    if (error || !tournaments || tournaments.length === 0) {
        embed.addFields({
            name: "Aucun tournoi actif",
            value: "Reviens bientôt ou contacte un admin pour créer une cup.",
            inline: false
        });
        return { embed, buttons: [] };
    }

    tournaments.forEach(t => {
        const currentRegistered = t.registered_teams || 0; 
        const remaining = t.max_teams - currentRegistered;
        const statusIcon = remaining > 0 ? "✅" : "🔴";
        const statusText = remaining > 0 ? "🟢 Ouvert" : "🔴 Complet";
        const discordTime = parseDiscordTimestamp(t.date_string, 'f');

        embed.addFields({
            name: `**${t.name}**`,
            value: `📅 ${discordTime}  |  💰 \`${t.cashprize}\`  |  👥 \`${currentRegistered}/${t.max_teams} ${statusIcon}\`  |  ${statusText}`,
            inline: false
        });
    });

    const buttons = tournaments.map(t => {
        const label = t.name.length > 80 ? t.name.substring(0, 77) + "…" : t.name;
        return new ButtonBuilder()
            .setCustomId(`cup_btn:${t.slug}`)
            .setLabel(label)
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🏆");
    });

    return { embed, buttons };
}

async function refreshMainMenu(client, guildId) {
    const { data: menuRef, error } = await global.supabase
        .from('lfn_tournament_menus')
        .select('*')
        .eq('guild_id', guildId)
        .maybeSingle();

    if (error || !menuRef) return;

    try {
        const channel = await client.channels.fetch(menuRef.channel_id);
        if (!channel || !channel.isTextBased()) return;

        const message = await channel.messages.fetch(menuRef.message_id);
        if (!message) return;

        const { embed, buttons } = await buildMainMenu();
        
        const rows = [];
        for (let i = 0; i < buttons.length && i < 25; i += 5) {
            const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
            rows.push(row);
        }

        const files = [];
        const fileIcon = getTournamentIconAttachment();
        if (fileIcon) files.push(fileIcon);

        await message.edit({ embeds: [embed], components: rows, files: files });
    } catch (err) {
        console.warn(`[Tournament] Synchronisation du menu ignorée : ${err.message}`);
    }
}

async function handleTournamentInteractions(interaction) {
    // 1. Gestion du clic sur un bouton de Cup
    if (interaction.isButton() && interaction.customId?.startsWith('cup_btn:')) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const slug = interaction.customId.split(':')[1];

        const { data: t, error } = await global.supabase
            .from('lfn_tournaments')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();

        if (error || !t) {
            await interaction.followup.send({ content: "❌ Ce tournoi n'existe plus.", flags: [MessageFlags.Ephemeral] });
            return true; // Interaction gérée
        }

        const organizerMention = `<@${t.organizer_id}>`;
        const channelMention = `<#${t.signup_channel_id}>`;
        const currentRegistered = t.registered_teams || 0;
        const statusText = currentRegistered < t.max_teams ? "🟢 **Ouvert**" : "🔴 **Complet**";
        
        const fullTime = parseDiscordTimestamp(t.date_string, 'F');
        const relativeTime = parseDiscordTimestamp(t.date_string, 'R');

        const detailEmbed = new EmbedBuilder()
            .setTitle(`🏆  ${t.name}`)
            .setDescription(`La Cup organisée par ${organizerMention}\n📅 Début : ${fullTime} (${relativeTime})\n\u200b`)
            .setColor(EMBED_COLOR_DETAIL)
            .addFields(
                { name: "💰  Cashprize", value: `**${t.cashprize}** ✅`, inline: true },
                { name: "👥  Équipes", value: `**${t.max_teams} MAX** ❗`, inline: true },
                { name: "📋  Inscrits", value: `**${currentRegistered}/${t.max_teams}**`, inline: true },
                { name: "🔗  Inscriptions", value: channelMention, inline: true },
                { name: "📊  Statut", value: statusText, inline: true }
            )
            .setImage('attachment://Tournois.webp')
            .setFooter({ text: FOOTER_TEXT })
            .setTimestamp(new Date(t.created_at));

        if (t.banner_url) {
            detailEmbed.setImage(t.banner_url);
            detailEmbed.setThumbnail('attachment://Tournois.webp');
        }

        const files = [];
        const fileIcon = getTournamentIconAttachment();
        if (fileIcon) files.push(fileIcon);

        await interaction.followup.send({ embeds: [detailEmbed], files: files, flags: [MessageFlags.Ephemeral] });
        return true; // Interaction gérée
    }

    // 2. Gestion des Commandes Slash
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'cup_menu') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            let textChannel = interaction.channel;
            if (!textChannel || typeof textChannel.send !== 'function') {
                try {
                    textChannel = await interaction.client.channels.fetch(interaction.channelId);
                } catch (e) {
                    textChannel = null;
                }
            }

            if (!textChannel || !textChannel.isTextBased()) {
                await interaction.followup.send({ content: "❌ Impossible d'accéder au salon textuel.", flags: [MessageFlags.Ephemeral] });
                return true;
            }

            const { embed, buttons } = await buildMainMenu();
            const rows = [];
            for (let i = 0; i < buttons.length && i < 25; i += 5) {
                const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
                rows.push(row);
            }

            const files = [];
            const fileIcon = getTournamentIconAttachment();
            if (fileIcon) files.push(fileIcon);

            const msg = await textChannel.send({ embeds: [embed], components: rows, files: files });

            await global.supabase
                .from('lfn_tournament_menus')
                .upsert({
                    guild_id: interaction.guild.id,
                    channel_id: textChannel.id,
                    message_id: msg.id
                });

            await interaction.followup.send({ content: "✅ Menu principal initialisé !", flags: [MessageFlags.Ephemeral] });
            return true; // Interaction gérée
        }

        if (commandName === 'cup_create') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const name = interaction.options.getString('name');
            const maxTeams = interaction.options.getInteger('max_teams');
            const dateStr = interaction.options.getString('date');
            const cashprize = interaction.options.getString('cashprize');
            const signupChannel = interaction.options.getChannel('signup_channel');
            const bannerAttachment = interaction.options.getAttachment('banner');

            if (maxTeams < 2 || maxTeams > 256) {
                await interaction.followup.send({ content: "❌ Le paramètre `max_teams` doit être configuré entre 2 et 256.", flags: [MessageFlags.Ephemeral] });
                return true;
            }

            if (name.length > 80) {
                await interaction.followup.send({ content: "❌ Le titre ne doit pas dépasser 80 caractères.", flags: [MessageFlags.Ephemeral] });
                return true;
            }

            const { count, error: countErr } = await global.supabase
                .from('lfn_tournaments')
                .select('*', { count: 'exact', head: true });

            if (countErr) {
                await interaction.followup.send({ content: "❌ Erreur d'accès à Supabase.", flags: [MessageFlags.Ephemeral] });
                return true;
            }

            const slug = `t${(count || 0) + 1}`;
            const bannerUrl = bannerAttachment ? bannerAttachment.url : null;

            await global.supabase
                .from('lfn_tournaments')
                .insert({
                    slug: slug,
                    name: name,
                    max_teams: maxTeams,
                    registered_teams: 0,
                    date_string: dateStr,
                    cashprize: cashprize,
                    signup_channel_id: signupChannel.id,
                    organizer_id: interaction.user.id,
                    banner_url: bannerUrl 
                });

            const displayTime = parseDiscordTimestamp(dateStr, 'F');

            const confirmEmbed = new EmbedBuilder()
                .setTitle("✅  Tournoi créé avec succès")
                .setColor(EMBED_COLOR_CREATE)
                .addFields(
                    { name: "Nom", value: name, inline: true },
                    { name: "Équipes max", value: String(maxTeams), inline: true },
                    { name: "Date", value: displayTime, inline: true },
                    { name: "Cashprize", value: cashprize, inline: true },
                    { name: "Salon", value: `<#${signupChannel.id}>`, inline: true },
                    { name: "ID interne (Slug)", value: `\`${slug}\``, inline: true }
                )
                .setFooter({ text: FOOTER_TEXT });

            if (bannerUrl) {
                confirmEmbed.setImage(bannerUrl);
            }

            await interaction.followup.send({ embeds: [confirmEmbed], flags: [MessageFlags.Ephemeral] });

            await refreshMainMenu(interaction.client, interaction.guild.id);
            return true; // Interaction gérée
        }

        if (commandName === 'cup_list') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const { data: tournaments, error } = await global.supabase
                .from('lfn_tournaments')
                .select('*')
                .order('created_at', { ascending: true });

            if (error || !tournaments || tournaments.length === 0) {
                await interaction.followup.send({ content: "Aucun tournoi actif répertorié.", flags: [MessageFlags.Ephemeral] });
                return true;
            }

            const lines = tournaments.map((t, i) => {
                const currentRegistered = t.registered_teams || 0;
                const icon = (t.max_teams - currentRegistered) > 0 ? "✅" : "🔴";
                const displayTime = parseDiscordTimestamp(t.date_string, 'd');
                return `**${i + 1}.** \`${t.slug}\` — **${t.name}** · ${displayTime} · ${t.cashprize} · \`[${currentRegistered}/${t.max_teams} ${icon}]\``;
            });

            const listEmbed = new EmbedBuilder()
                .setTitle("📋  Liste des tournois actifs")
                .setDescription(lines.join('\n'))
                .setColor(EMBED_COLOR_MAIN)
                .setFooter({ text: FOOTER_TEXT });

            await interaction.followup.send({ embeds: [listEmbed], flags: [MessageFlags.Ephemeral] });
            return true; // Interaction gérée
        }
    }

    return false; // L'interaction ne concernait pas les tournois
}

const slashCommandsData = [
    new SlashCommandBuilder()
        .setName('cup_menu')
        .setDescription("(Re)poste le menu principal d'affichage des tournois.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    new SlashCommandBuilder()
        .setName('cup_create')
        .setDescription("Crée un nouveau tournoi et met à jour le menu d'affichage.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(opt => opt.setName('name').setDescription('Nom de la compétition').setRequired(true))
        .addIntegerOption(opt => opt.setName('max_teams').setDescription("Nombre maximum d'équipes acceptées (2-256)").setRequired(true))
        .addStringOption(opt => opt.setName('date').setDescription('Timestamp Unix pur (ex: 1716573600) ou format ISO (YYYY-MM-DD)').setRequired(true))
        .addStringOption(opt => opt.setName('cashprize').setDescription('Récompense promise (ex: 50€, rôles...)').setRequired(true))
        .addChannelOption(opt => opt.setName('signup_channel').setDescription("Lien vers le salon dédié aux inscriptions").setRequired(true))
        .addAttachmentOption(opt => opt.setName('banner').setDescription("L'image de la bannière du tournoi").setRequired(false)),

    new SlashCommandBuilder()
        .setName('cup_list')
        .setDescription("Affiche la liste textuelle épurée des compétitions actives.")
];

module.exports = {
    handleTournamentInteractions,
    slashCommandsData,
    refreshMainMenu
};
