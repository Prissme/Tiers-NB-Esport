/**
 * tournamentSystem.js
 * ───────────────────
 * Système de tournois interactif pour Discord (discord.js v14)
 * Connecté à Supabase pour la persistance globale.
 * * Commandes incluses :
 * /cup_create  – Crée un tournoi, l'ajoute en BDD et met à jour le menu
 * /cup_menu    – (Re)poste le menu principal d'affichage dans le salon courant
 * /cup_list    – Affiche la liste textuelle épurée des compétitions actives
 */

const { 
    SlashCommandBuilder, 
    PermissionFlagsBitField, 
    EmbedBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder 
} = require('discord.js');

// ──────────────────────────────────────────────────────────────────────────────
// Configuration visuelle
// ──────────────────────────────────────────────────────────────────────────────
const EMBED_COLOR_MAIN = 0x0F0F1A;   // Fond très sombre (menu principal)
const EMBED_COLOR_DETAIL = 0x1A0F2E; // Violet profond (détail tournoi)
const EMBED_COLOR_CREATE = 0x0A2E1A; // Vert sombre (confirmation création)
const FOOTER_TEXT = "La course vers le first Tier A continue !";

// Récupération de l'instance globale de Supabase configurée dans ton projet Next.js
const supabase = global.supabase;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers de construction des structures d'affichage
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Génère l'embed du menu principal et ses boutons associés depuis Supabase
 */
async function buildMainMenu() {
    const embed = new EmbedBuilder()
        .setTitle("🎮  Tournois disponibles")
        .setDescription("Clique sur une cup pour voir les détails, les conditions d'inscription et le cashprize.\n\u200b")
        .setColor(EMBED_COLOR_MAIN)
        .setTimestamp()
        .setFooter({ text: FOOTER_TEXT });

    // Extraction de la liste des tournois actifs depuis Supabase
    const { data: tournaments, error } = await supabase
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
        const remaining = t.max_teams - t.registered_teams;
        const statusIcon = remaining > 0 ? "✅" : "🔴";
        const statusText = remaining > 0 ? "🟢 Ouvert" : "🔴 Complet";

        embed.addFields({
            name: `**${t.name}**`,
            value: `📅 \`${t.date_string}\`  |  💰 \`${t.cashprize}\`  |  👥 \`${t.registered_teams}/${t.max_teams} ${statusIcon}\`  |  ${statusText}`,
            inline: false
        });

        // Sécurité sur la longueur de chaîne exigée par l'API Discord (max 80)
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

/**
 * Met à jour dynamiquement l'affichage du menu sur le serveur ciblé
 */
async function refreshMainMenu(client, guildId) {
    const { data: menuRef, error } = await supabase
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
        
        // Distribution des boutons par rangées de 5 éléments maximum (Norme Discord UI)
        const rows = [];
        for (let i = 0; i < buttons.length && i < 25; i += 5) {
            const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 5));
            rows.push(row);
        }

        await message.edit({ embeds: [embed], components: rows });
    } catch (err) {
        console.warn(`[Tournament] Synchronisation du menu ignorée ou message introuvable pour la guilde : ${guildId}`);
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Écouteur / Intercepteur d'interactions (Boutons et Commandes)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Routeur global à intégrer dans l'événement interactionCreate de ton bot
 */
async function handleTournamentInteractions(interaction) {
    // ── GESTION DES CLICS BOUTONS CLES ────────────────────────────────────────
    if (interaction.isButton() && interaction.customId.startsWith('cup_btn:')) {
        await interaction.deferReply({ ephemeral: true });
        const slug = interaction.customId.split(':')[1];

        const { data: t, error } = await supabase
            .from('lfn_tournaments')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();

        if (error || !t) {
            return interaction.followup.send({ content: "❌ Ce tournoi n'existe plus dans la base de données.", ephemeral: true });
        }

        const organizerMention = `<@${t.organizer_id}>`;
        const channelMention = `<#${t.signup_channel_id}>`;
        const statusText = t.registered_teams < t.max_teams ? "🟢 **Ouvert**" : "🔴 **Complet**";

        const detailEmbed = new EmbedBuilder()
            .setTitle(`🏆  ${t.name}`)
            .setDescription(`La Cup organisée par ${organizerMention}\n\u200b`)
            .setColor(EMBED_COLOR_DETAIL)
            .addFields(
                { name: "💰  Cashprize", value: `**${t.cashprize}** ✅`, inline: true },
                { name: "📅  Date", value: `**${t.date_string}**`, inline: true },
                { name: "👥  Équipes", value: `**${t.max_teams} MAX** ❗`, inline: true },
                { name: "📋  Inscrits", value: `**${t.registered_teams}/${t.max_teams}**`, inline: true },
                { name: "🔗  Inscriptions", value: channelMention, inline: true },
                { name: "📊  Statut", value: statusText, inline: true }
            )
            .setFooter({ text: FOOTER_TEXT })
            .setTimestamp(new Date(t.created_at));

        await interaction.followup.send({ embeds: [detailEmbed], ephemeral: true });
        return true;
    }

    // ── GESTION DES SLASH COMMANDES ───────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        // Command: /cup_menu
        if (commandName === 'cup_menu') {
            await interaction.deferReply({ ephemeral: true });

            if (!interaction.channel.isTextBased()) {
                return interaction.followup.send({ content: "❌ Cette commande doit être exécutée dans un salon textuel.", ephemeral: true });
            }

            const { embed, buttons } = await buildMainMenu();
            const rows = [];
            if (buttons.length > 0) {
                const row = new ActionRowBuilder().addComponents(buttons.slice(0, 5));
                rows.push(row);
            }

            const msg = await interaction.channel.send({ embeds: [embed], components: rows });

            await supabase
                .from('lfn_tournament_menus')
                .upsert({
                    guild_id: interaction.guild.id,
                    channel_id: interaction.channel.id,
                    message_id: msg.id
                });

            return interaction.followup.send({ content: "✅ Menu principal initialisé et synchronisé avec la base de données !", ephemeral: true });
        }

        // Command: /cup_create
        if (commandName === 'cup_create') {
            await interaction.deferReply({ ephemeral: true });

            const name = interaction.options.getString('name');
            const maxTeams = interaction.options.getInteger('max_teams');
            const dateStr = interaction.options.getString('date');
            const cashprize = interaction.options.getString('cashprize');
            const signupChannel = interaction.options.getChannel('signup_channel');

            if (maxTeams < 2 || maxTeams > 256) {
                return interaction.followup.send({ content: "❌ Le paramètre `max_teams` doit être configuré entre 2 et 256.", ephemeral: true });
            }

            if (name.length > 80) {
                return interaction.followup.send({ content: "❌ Le titre de la Cup ne doit pas dépasser le seuil de 80 caractères.", ephemeral: true });
            }

            // Génération dynamique du slug d'indexation (t1, t2, t3...) via comptage
            const { count, error: countErr } = await supabase
                .from('lfn_tournaments')
                .select('*', { count: 'exact', head: true });

            if (countErr) {
                return interaction.followup.send({ content: "❌ Erreur d'accès à la table de données Supabase.", ephemeral: true });
            }

            const slug = `t${(count || 0) + 1}`;

            // Enregistrement de la nouvelle compétition
            await supabase
                .from('lfn_tournaments')
                .insert({
                    slug: slug,
                    name: name,
                    max_teams: maxTeams,
                    date_string: dateStr,
                    cashprize: cashprize,
                    signup_channel_id: signupChannel.id,
                    organizer_id: interaction.user.id
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

            await interaction.followup.send({ embeds: [confirmEmbed], ephemeral: true });

            // Notification et mise à jour en temps réel de l'affichage global
            await refreshMainMenu(interaction.client, interaction.guild.id);
            return true;
        }

        // Command: /cup_list
        if (commandName === 'cup_list') {
            await interaction.deferReply({ ephemeral: true });

            const { data: tournaments, error } = await supabase
                .from('lfn_tournaments')
                .select('*')
                .order('created_at', { ascending: true });

            if (error || !tournaments || tournaments.length === 0) {
                return interaction.followup.send({ content: "Aucun tournoi actif répertorié pour le moment.", ephemeral: true });
            }

            const lines = tournaments.map((t, i) => {
                const icon = (t.max_teams - t.registered_teams) > 0 ? "✅" : "🔴";
                return `**${i + 1}.** \`${t.slug}\` — **${t.name}** · ${t.date_string} · ${t.cashprize} · \`[${t.registered_teams}/${t.max_teams} ${icon}]\``;
            });

            const listEmbed = new EmbedBuilder()
                .setTitle("📋  Liste des tournois actifs")
                .setDescription(lines.join('\n'))
                .setColor(EMBED_COLOR_MAIN)
                .setFooter({ text: FOOTER_TEXT });

            return interaction.followup.send({ embeds: [listEmbed], ephemeral: true });
        }
    }

    return false;
}

// ──────────────────────────────────────────────────────────────────────────────
// Déclaration des structures JSON des commandes (Pour l'enregistrement auprès de l'API)
// ──────────────────────────────────────────────────────────────────────────────
const slashCommandsData = [
    new SlashCommandBuilder()
        .setName('cup_menu')
        .setDescription("(Re)poste le menu principal d'affichage des tournois.")
        .setDefaultMemberPermissions(PermissionFlagsBitField.Flags.ManageGuild),

    new SlashCommandBuilder()
        .setName('cup_create')
        .setDescription("Crée un nouveau tournoi et met à jour le menu d'affichage.")
        .setDefaultMemberPermissions(PermissionFlagsBitField.Flags.ManageGuild)
        .addStringOption(opt => opt.setName('name').setDescription('Nom de la compétition').setRequired(true))
        .addIntegerOption(opt => opt.setName('max_teams').setDescription("Nombre maximum d'équipes acceptées (2-256)").setRequired(true))
        .addStringOption(opt => opt.setName('date').setDescription('Date et heure de l’événement (ex: 24 Mai - 20h)').setRequired(true))
        .addStringOption(opt => opt.setName('cashprize').setDescription('Récompense promise (ex: 50€, rôles...)').setRequired(true))
        .addChannelOption(opt => opt.setName('signup_channel').setDescription("Lien vers le salon dédié aux inscriptions").setRequired(true)),

    new SlashCommandBuilder()
        .setName('cup_list')
        .setDescription("Affiche la liste textuelle épurée des compétitions actives.")
];

module.exports = {
    handleTournamentInteractions,
    slashCommandsData,
    refreshMainMenu
};
