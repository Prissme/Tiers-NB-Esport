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
    AttachmentBuilder // Indispensable pour attacher l'image locale Tournois.webp
} = require('discord.js');
const path = require('path');

// Couleur demandée : Bleu foncé (ex: #0A192F ou 0x0A192F)
const EMBED_COLOR_MAIN = 0x0A192F;   
const EMBED_COLOR_DETAIL = 0x0A192F; 
const EMBED_COLOR_CREATE = 0x0A2E1A; 
const FOOTER_TEXT = "La course vers le first Tier A continue !";

async function buildMainMenu() {
    const embed = new EmbedBuilder()
        .setTitle("🎮  Tournois disponibles")
        .setDescription("Clique sur une cup pour voir les détails, les conditions d'inscription et le cashprize.\n\u200b")
        .setColor(EMBED_COLOR_MAIN)
        .setTimestamp()
        // Ajout de l'image locale "Tournois.webp" comme Thumbnail de l'embed
        .setThumbnail('attachment://Tournois.webp')
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

    const buttons = [];
    tournaments.forEach(t => {
        const currentRegistered = t.registered_teams || 0; 
        const remaining = t.max_teams - currentRegistered;
        const statusIcon = remaining > 0 ? "✅" : "🔴";
        const statusText = remaining > 0 ? "🟢 Ouvert" : "🔴 Complet";

        embed.addFields({
            name: `**${t.name}**`,
            value: `📅 \`${t.date_string}\`  |  💰 \`${t.cashprize}\`  |  👥 \`${currentRegistered}/${t.max_teams} ${statusIcon}\`  |  ${statusText}`,
            inline: false
        });

        const label = t.name.length > 80 ? t.name.substring(0, 77) + "…" : t.name;
        
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`cup_btn:${t.slug}`)
                .setLabel(label)
                .setStyle(ButtonStyle.Primary)
                .setEmoji("🏆")
        );
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
        if (!channel) return;

        const message = await channel.messages.fetch(menuRef.message_id);
        if (!message) return;

        const { embed, buttons } = await buildMainMenu();
        
        const rows = [];
        for (let i = 0; i < buttons.length && i < 25; i += 5) {
            const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
            rows.push(row);
        }

        // On recrée l'attachement pour l'édition du menu si nécessaire
        const file = new AttachmentBuilder(path.join(__dirname, '../public/Tournois.webp'));

        await message.edit({ embeds: [embed], components: rows, files: [file] });
    } catch (err) {
        console.warn(`[Tournament] Synchronisation du menu ignorée ou message introuvable pour la guilde : ${guildId}`);
    }
}

async function handleTournamentInteractions(interaction) {
    if (interaction.isButton() && interaction.customId?.startsWith('cup_btn:')) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const slug = interaction.customId.split(':')[1];

        const { data: t, error } = await global.supabase
            .from('lfn_tournaments')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();

        if (error || !t) {
            await interaction.followup.send({ content: "❌ Ce tournoi n'existe plus dans la base de données.", flags: [MessageFlags.Ephemeral] });
            return true;
        }

        const organizerMention = `<@${t.organizer_id}>`;
        const channelMention = `<#${t.signup_channel_id}>`;
        const currentRegistered = t.registered_teams || 0;
        const statusText = currentRegistered < t.max_teams ? "🟢 **Ouvert**" : "🔴 **Complet**";

        const detailEmbed = new EmbedBuilder()
            .setTitle(`🏆  ${t.name}`)
            .setDescription(`La Cup organisée par ${organizerMention}\n\u200b`)
            .setColor(EMBED_COLOR_DETAIL)
            .addFields(
                { name: "💰  Cashprize", value: `**${t.cashprize}** ✅`, inline: true },
                { name: "📅  Date", value: `**${t.date_string}**`, inline: true },
                { name: "👥  Équipes", value: `**${t.max_teams} MAX** ❗`, inline: true },
                { name: "📋  Inscrits", value: `**${currentRegistered}/${t.max_teams}**`, inline: true },
                { name: "🔗  Inscriptions", value: channelMention, inline: true },
                { name: "📊  Statut", value: statusText, inline: true }
            )
            .setThumbnail('attachment://Tournois.webp')
            .setFooter({ text: FOOTER_TEXT })
            .setTimestamp(new Date(t.created_at));

        // Si l'événement possède une bannière enregistrée, on l'affiche sur l'embed de détail
        if (t.banner_url) {
            detailEmbed.setImage(t.banner_url);
        }

        const file = new AttachmentBuilder(path.join(__dirname, '../public/Tournois.webp'));
        await interaction.followup.send({ embeds: [detailEmbed], files: [file], flags: [MessageFlags.Ephemeral] });
        return true;
    }

    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'cup_menu') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const textChannel = interaction.channel || await interaction.client.channels.fetch(interaction.channelId);
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

            // Récupération et attachement de l'image locale dans le dossier public
            const file = new AttachmentBuilder(path.join(__dirname, '../public/Tournois.webp'));

            const msg = await textChannel.send({ embeds: [embed], components: rows, files: [file] });

            await global.supabase
                .from('lfn_tournament_menus')
                .upsert({
                    guild_id: interaction.guild.id,
                    channel_id: textChannel.id,
                    message_id: msg.id
                });

            await interaction.followup.send({ content: "✅ Menu principal initialisé !", flags: [MessageFlags.Ephemeral] });
            return true;
        }

        if (commandName === 'cup_create') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const name = interaction.options.getString('name');
            const maxTeams = interaction.options.getInteger('max_teams');
            const dateStr = interaction.options.getString('date');
            const cashprize = interaction.options.getString('cashprize');
            const signupChannel = interaction.options.getChannel('signup_channel');
            // Récupération de l'image (bannière) fournie en argument
            const bannerAttachment = interaction.options.getAttachment('banner');

            if (maxTeams < 2 || maxTeams > 256) {
                await interaction.followup.send({ content: "❌ Le paramètre `max_teams` doit être configuré entre 2 et 256.", flags: [MessageFlags.Ephemeral] });
                return true;
            }

            if (name.length > 80) {
                await interaction.followup.send({ content: "❌ Le titre de la Cup ne doit pas dépasser le seuil de 80 caractères.", flags: [MessageFlags.Ephemeral] });
                return true;
            }

            const { count, error: countErr } = await global.supabase
                .from('lfn_tournaments')
                .select('*', { count: 'exact', head: true });

            if (countErr) {
                await interaction.followup.send({ content: "❌ Erreur d'accès à la table de données Supabase.", flags: [MessageFlags.Ephemeral] });
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
                    banner_url: bannerUrl // Optionnel : à ajouter dans ta colonne de BDD si souhaité
                });

            const confirmEmbed = new EmbedBuilder()
                .setTitle("✅  Tournoi créé avec succès")
                .setColor(EMBED_COLOR_CREATE)
                .addFields(
                    { name: "Nom", value: name, inline: true },
                    { name: "Équipes max", value: String(maxTeams), inline: true },
                    { name: "Date", value: dateStr, inline: true },
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
            return true;
        }

        if (commandName === 'cup_list') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const { data: tournaments, error } = await global.supabase
                .from('lfn_tournaments')
                .select('*')
                .order('created_at', { ascending: true });

            if (error || !tournaments || tournaments.length === 0) {
                await interaction.followup.send({ content: "Aucun tournoi actif répertorié pour le moment.", flags: [MessageFlags.Ephemeral] });
                return true;
            }

            const lines = tournaments.map((t, i) => {
                const currentRegistered = t.registered_teams || 0;
                const icon = (t.max_teams - currentRegistered) > 0 ? "✅" : "🔴";
                return `**${i + 1}.** \`${t.slug}\` — **${t.name}** · ${t.date_string} · ${t.cashprize} · \`[${currentRegistered}/${t.max_teams} ${icon}]\``;
            });

            const listEmbed = new EmbedBuilder()
                .setTitle("📋  Liste des tournois actifs")
                .setDescription(lines.join('\n'))
                .setColor(EMBED_COLOR_MAIN)
                .setFooter({ text: FOOTER_TEXT });

            await interaction.followup.send({ embeds: [listEmbed], flags: [MessageFlags.Ephemeral] });
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
        .addStringOption(opt => opt.setName('date').setDescription('Date et heure de l’événement (ex: 24 Mai - 20h)').setRequired(true))
        .addStringOption(opt => opt.setName('cashprize').setDescription('Récompense promise (ex: 50€, rôles...)').setRequired(true))
        .addChannelOption(opt => opt.setName('signup_channel').setDescription("Lien vers le salon dédié aux inscriptions").setRequired(true))
        // Ajout de l'option d'attachement d'image (Bannière de l'event)
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
