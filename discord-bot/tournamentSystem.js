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
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    MessageFlags,
    AttachmentBuilder 
} = require('discord.js');
const path = require('path');
const fs = require('fs');

// Couleurs V1 (Bleu foncé premium)
const EMBED_COLOR_MAIN = 0x0A192F;   
const EMBED_COLOR_DETAIL = 0x0A192F; 
const EMBED_COLOR_DELETE = 0x0A192F; 
const FOOTER_TEXT = "La course vers le first Tier A continue !";

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

/**
 * Génère l'embed du menu principal (Avec le texte promotionnel à la fin)
 */
async function buildMainMenu() {
    // Intégration de ta promotion à la fin de la description principale
    const descriptionText = 
        "Clique sur une cup pour voir les détails, les conditions d'inscription et le cashprize.\n\n" +
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
        "💡 **Tu veux TON propre tournoi ?**\n\n" +
        "Je peux organiser un tournoi personnalisé pour toi (format, règles, cashprize…)\n\n" +
        "👉 **Prix : 9,99€**\n" +
        "📩 **DM-moi si t’es chaud**\n" +
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\u200b";

    const embed = new EmbedBuilder()
        .setTitle("VOICI LES TOURNOIS QUI ARRIVENT SUR PTV")
        .setDescription(descriptionText)
        .setColor(EMBED_COLOR_MAIN)
        .setTimestamp()
        .setThumbnail('attachment://PTV.webp') // Image PTV.webp dans le coin droit
        .setImage('attachment://Tournois.webp')  // Grosse image centrale Tournois.webp
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
            value: `📅 ${discordTime}  |  💰 ${t.cashprize}  |  👥 \`${currentRegistered}/${t.max_teams} ${statusIcon}\`  |  ${statusText}`,
            inline: false
        });
    });

    const buttons = tournaments.map(t => {
        const label = t.name.length > 80 ? t.name.substring(0, 77) + "…" : t.name;
        return new ButtonBuilder()
            .setCustomId(`cup_btn:${t.slug}`)
            .setLabel(label)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("🏆");
    });

    return { embed, buttons };
}

/**
 * Met à jour le menu principal de manière synchronisée
 */
async function refreshMainMenuDirect(interaction) {
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

        const { embed, buttons } = await buildMainMenu();
        
        const rows = [];
        for (let i = 0; i < buttons.length && i < 25; i += 5) {
            const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
            rows.push(row);
        }

        const files = [];
        const fileTournois = getPublicAttachment('Tournois.webp');
        const filePTV = getPublicAttachment('PTV.webp');
        if (fileTournois) files.push(fileTournois);
        if (filePTV) files.push(filePTV);

        await message.edit({ embeds: [embed], components: rows, files: files }).catch(() => null);
    } catch (err) {
        console.warn(`[Tournament] Synchronisation du menu ignorée.`);
    }
}

/**
 * Intercepteur principal des interactions (Commandes, Boutons, Select Menus)
 */
async function handleTournamentInteractions(interaction) {
    if (!interaction) return false;

    // 1. GESTION DES CLICS SUR LES BOUTONS (Affichage d'une Cup)
    if (interaction.isButton() && interaction.customId?.startsWith('cup_btn:')) {
        try {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => null);
        } catch (e) {
            return true;
        }

        const slug = interaction.customId.split(':')[1];

        const { data: t, error } = await global.supabase
            .from('lfn_tournaments')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();

        if (error || !t) {
            await interaction.followUp({ content: "❌ Ce tournoi n'existe plus.", flags: [MessageFlags.Ephemeral] }).catch(() => null);
            return true;
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
                { name: "💰  Cashprize / Récompense", value: t.cashprize, inline: true },
                { name: "👥  Équipes Max", value: `**${t.max_teams}**`, inline: true },
                { name: "📋  Inscrits", value: `**${currentRegistered}/${t.max_teams}**`, inline: true },
                { name: "🔗  Inscriptions", value: channelMention, inline: true },
                { name: "📊  Statut", value: statusText, inline: true }
            )
            .setThumbnail('attachment://PTV.webp')
            .setImage('attachment://Tournois.webp')
            .setFooter({ text: FOOTER_TEXT })
            .setTimestamp(new Date(t.created_at));

        if (t.banner_url) {
            detailEmbed.setImage(t.banner_url);
        }

        const files = [];
        const fileTournois = getPublicAttachment('Tournois.webp');
        const filePTV = getPublicAttachment('PTV.webp');
        if (fileTournois) files.push(fileTournois);
        if (filePTV) files.push(filePTV);

        await interaction.followUp({ embeds: [detailEmbed], files: files, flags: [MessageFlags.Ephemeral] }).catch(() => null);
        
        await refreshMainMenuDirect(interaction);
        return true;
    }

    // 2. INTERCEPTION DU SELECT MENU DE SUPPRESSION
    if (interaction.isStringSelectMenu() && interaction.customId === 'cup_delete_select') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => null);
        const selectedSlug = interaction.values[0];

        const { error } = await global.supabase
            .from('lfn_tournaments')
            .delete()
            .eq('slug', selectedSlug);

        if (error) {
            await interaction.followUp({ content: "❌ Erreur lors de la suppression du tournoi dans la base Supabase.", flags: [MessageFlags.Ephemeral] }).catch(() => null);
            return true;
        }

        await interaction.followUp({ content: `✅ Le tournoi (\`${selectedSlug}\`) a bien été définitivement supprimé !`, flags: [MessageFlags.Ephemeral] }).catch(() => null);
        
        await refreshMainMenuDirect(interaction);
        return true;
    }

    // 3. GESTION DES COMMANDES SLASH
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        // COMMAND : /cup_menu
        if (commandName === 'cup_menu') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => null);

            const { embed, buttons } = await buildMainMenu();
            const rows = [];
            for (let i = 0; i < buttons.length && i < 25; i += 5) {
                const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
                rows.push(row);
            }

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
                    await interaction.followUp({ content: "❌ Impossible de générer le menu dans ce salon.", flags: [MessageFlags.Ephemeral] }).catch(() => null);
                    return true;
                }

                const msg = await targetChannel.send({ embeds: [embed], components: rows, files: files });

                await global.supabase
                    .from('lfn_tournament_menus')
                    .upsert({
                        guild_id: interaction.guild.id,
                        channel_id: targetChannel.id,
                        message_id: msg.id
                    });

                await interaction.followUp({ content: "✅ Menu principal initialisé !", flags: [MessageFlags.Ephemeral] }).catch(() => null);
            } catch (sendError) {
                await interaction.followUp({ content: "❌ Impossible d'envoyer le menu. Vérifie les permissions.", flags: [MessageFlags.Ephemeral] }).catch(() => null);
            }
            return true;
        }

        // COMMAND : /cup_create
        if (commandName === 'cup_create') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => null);

            const name = interaction.options.getString('name');
            const maxTeams = interaction.options.getInteger('max_teams');
            const dateStr = interaction.options.getString('date');
            const cashprize = interaction.options.getString('cashprize');
            const signupChannel = interaction.options.getChannel('signup_channel');
            const bannerAttachment = interaction.options.getAttachment('banner');
            const targetOrganizer = interaction.options.getUser('organizer') || interaction.user;

            if (maxTeams < 2 || maxTeams > 256) {
                await interaction.followUp({ content: "❌ Le paramètre `max_teams` doit être configuré entre 2 et 256.", flags: [MessageFlags.Ephemeral] }).catch(() => null);
                return true;
            }

            if (name.length > 80) {
                await interaction.followUp({ content: "❌ Le titre ne doit pas dépasser 80 caractères.", flags: [MessageFlags.Ephemeral] }).catch(() => null);
                return true;
            }

            const { count, error: countErr } = await global.supabase
                .from('lfn_tournaments')
                .select('*', { count: 'exact', head: true });

            if (countErr) {
                await interaction.followUp({ content: "❌ Erreur de liaison Supabase.", flags: [MessageFlags.Ephemeral] }).catch(() => null);
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
                    organizer_id: targetOrganizer.id,
                    banner_url: bannerUrl 
                });

            const displayTime = parseDiscordTimestamp(dateStr, 'F');

            const confirmEmbed = new EmbedBuilder()
                .setTitle("✅  Tournoi créé avec succès")
                .setColor(EMBED_COLOR_MAIN)
                .addFields(
                    { name: "Nom", value: name, inline: true },
                    { name: "Organisateur", value: `<@${targetOrganizer.id}>`, inline: true },
                    { name: "Équipes max", value: String(maxTeams), inline: true },
                    { name: "Date", value: displayTime, inline: true },
                    { name: "Cashprize / Rôles", value: cashprize, inline: true },
                    { name: "Salon d'inscription", value: `<#${signupChannel.id}>`, inline: true }
                )
                .setFooter({ text: FOOTER_TEXT });

            if (bannerUrl) {
                confirmEmbed.setImage(bannerUrl);
            }

            await interaction.followUp({ embeds: [confirmEmbed], flags: [MessageFlags.Ephemeral] }).catch(() => null);

            await refreshMainMenuDirect(interaction);
            return true;
        }

        // COMMAND : /cup_list
        if (commandName === 'cup_list') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => null);

            const { data: tournaments, error } = await global.supabase
                .from('lfn_tournaments')
                .select('*')
                .order('created_at', { ascending: true });

            if (error || !tournaments || tournaments.length === 0) {
                await interaction.followUp({ content: "Aucun tournoi actif répertorié.", flags: [MessageFlags.Ephemeral] }).catch(() => null);
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

            await interaction.followUp({ embeds: [listEmbed], flags: [MessageFlags.Ephemeral] }).catch(() => null);
            return true;
        }

        // COMMAND : /cup_delete
        if (commandName === 'cup_delete') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => null);

            const { data: tournaments, error } = await global.supabase
                .from('lfn_tournaments')
                .select('*')
                .order('created_at', { ascending: true });

            if (error || !tournaments || tournaments.length === 0) {
                await interaction.followUp({ content: "❌ Aucun tournoi enregistré trouvé dans la base de données.", flags: [MessageFlags.Ephemeral] }).catch(() => null);
                return true;
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('cup_delete_select')
                .setPlaceholder('Sélectionne la Cup à supprimer définitivement...');

            tournaments.forEach((t) => {
                const desc = t.cashprize.replace(/<@&|>/g, ''); 
                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(t.name.substring(0, 99))
                        .setDescription(`ID: ${t.slug} | Prize: ${desc.substring(0, 50)}`)
                        .setValue(t.slug)
                        .setEmoji('🗑️')
                );
            });

            const deleteEmbed = new EmbedBuilder()
                .setTitle("🗑️  Suppression d'un tournoi")
                .setDescription("Choisis le tournoi à retirer à l'aide de la liste déroulante ci-dessous.\n*Cette action mettra à jour le menu principal.*")
                .setColor(EMBED_COLOR_DELETE);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.followUp({ embeds: [deleteEmbed], components: [row], flags: [MessageFlags.Ephemeral] }).catch(() => null);
            return true;
        }
    }

    return false;
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
        .addStringOption(opt => opt.setName('cashprize').setDescription('Récompense promise (ex: 50€, @Role Gagnant...)').setRequired(true))
        .addChannelOption(opt => opt.setName('signup_channel').setDescription("Lien vers le salon dédié aux inscriptions").setRequired(true))
        .addUserOption(opt => opt.setName('organizer').setDescription("Mentionne le membre responsable de la Cup (Optionnel)").setRequired(false))
        .addAttachmentOption(opt => opt.setName('banner').setDescription("L'image de la bannière du tournoi (Optionnel)").setRequired(false)),

    new SlashCommandBuilder()
        .setName('cup_list')
        .setDescription("Affiche la liste textuelle épurée des compétitions actives."),

    new SlashCommandBuilder()
        .setName('cup_delete')
        .setDescription("Supprime définitivement un tournoi actif via une liste déroulante.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
];

module.exports = {
    handleTournamentInteractions,
    slashCommandsData
};
