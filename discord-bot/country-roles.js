'use strict';

// ============================================================
// country-roles.js
// Crée automatiquement un rôle Discord par pays (ex: "🇧🇪 Belgique")
// et y met tous les joueurs de ce pays.
//
// - Source : tables `players` (discord_id) + `lfn_player_profiles` (country_code),
//   la même que le site. Pays absent/invalide => 'FR' (comme le reste du bot).
// - Un joueur n'a qu'UN seul rôle pays : s'il change de pays, l'ancien rôle est retiré.
// - Les rôles pays sont créés à la demande (seulement si au moins 1 joueur du pays
//   est présent sur le serveur) et ne sont jamais supprimés automatiquement.
// - Le bot doit avoir la permission "Gérer les rôles" et son rôle doit être
//   placé AU-DESSUS des rôles pays dans la liste des rôles du serveur.
// ============================================================

const { COUNTRIES } = require('./utils/countries');

const COUNTRY_ROLES_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const ACTION_DELAY_MS = 400; // petite pause entre chaque appel Discord (rate limit)

const REGION_NAMES_FR = new Intl.DisplayNames(['fr'], { type: 'region' });

// ── État interne ────────────────────────────────────────────
let _intervalRef = null;
let _isSyncing = false;

// ── Helpers ─────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeCountryCode(raw) {
  const code = String(raw || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : 'FR';
}

function toCountryFlag(countryCode) {
  try {
    return String.fromCodePoint(
      ...Array.from(countryCode).map((c) => 0x1f1e6 - 65 + c.charCodeAt(0))
    );
  } catch {
    return '🏳️';
  }
}

function getCountryName(countryCode) {
  const known = COUNTRIES.find((c) => c.code === countryCode);
  if (known?.name) return known.name;
  try {
    return REGION_NAMES_FR.of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}

/** Nom du rôle Discord pour un pays, ex: "🇧🇪 Belgique". */
function getCountryRoleName(countryCode) {
  return `${toCountryFlag(countryCode)} ${getCountryName(countryCode)}`;
}

// ── Lecture des joueurs (discord_id + pays) ──────────────────

async function fetchPlayersWithCountry(supabase) {
  // On récupère tout (tables petites) et on joint en mémoire :
  // évite les URL géantes avec .in() sur des centaines d'UUID.
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, discord_id, active')
    .not('discord_id', 'is', null);
  if (playersError) throw new Error(playersError.message || 'players: lecture impossible');

  const { data: profiles, error: profilesError } = await supabase
    .from('lfn_player_profiles')
    .select('player_id, country_code');
  if (profilesError) throw new Error(profilesError.message || 'profiles: lecture impossible');

  const profileMap = new Map((profiles || []).map((p) => [p.player_id, p.country_code]));

  const byDiscordId = new Map();
  for (const player of players || []) {
    if (player.active === false) continue;
    const discordId = String(player.discord_id || '').trim();
    if (!/^\d{15,25}$/.test(discordId)) continue;
    byDiscordId.set(discordId, normalizeCountryCode(profileMap.get(player.id)));
  }
  return byDiscordId; // Map<discordId, countryCode>
}

// ── Gestion des rôles ────────────────────────────────────────

async function ensureCountryRole(guild, countryCode) {
  const roleName = getCountryRoleName(countryCode);
  const existing = guild.roles.cache.find((role) => role.name === roleName);
  if (existing) return existing;

  try {
    const role = await guild.roles.create({
      name: roleName,
      mentionable: false,
      hoist: false,
      reason: 'Rôle pays automatique',
    });
    await sleep(ACTION_DELAY_MS);
    return role;
  } catch (err) {
    console.warn(`[CountryRoles] Impossible de créer le rôle ${roleName}:`, err?.message || err);
    return null;
  }
}

/**
 * Synchronise les rôles pays de tout le serveur.
 *
 * @param {import('discord.js').Guild} guild
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<{ synced: boolean, added?: number, removed?: number, created?: number, reason?: string }>}
 */
async function syncCountryRoles(guild, supabase) {
  if (_isSyncing) return { synced: false, reason: 'already_syncing' };
  if (!guild || !supabase) return { synced: false, reason: 'missing_context' };

  _isSyncing = true;
  const stats = { added: 0, removed: 0, created: 0 };

  try {
    const me = guild.members.me || (await guild.members.fetchMe());
    if (!me.permissions.has('ManageRoles')) {
      console.warn('[CountryRoles] Permission "Gérer les rôles" manquante, synchro annulée.');
      return { synced: false, reason: 'missing_manage_roles' };
    }

    const countryByDiscordId = await fetchPlayersWithCountry(supabase);

    // Membres du serveur (nécessite l'intent GuildMembers, déjà activé)
    await guild.members.fetch();
    await guild.roles.fetch();

    // Tous les noms de rôles pays possibles : sert à reconnaître "nos" rôles
    // pour retirer un joueur d'un ancien pays sans toucher aux autres rôles.
    const knownCountryRoleNames = new Set(COUNTRIES.map((c) => getCountryRoleName(c.code)));
    for (const code of new Set(countryByDiscordId.values())) {
      knownCountryRoleNames.add(getCountryRoleName(code));
    }

    // Pays qui ont au moins un joueur présent sur le serveur
    const neededCountries = new Set();
    for (const [discordId, code] of countryByDiscordId) {
      if (guild.members.cache.has(discordId)) neededCountries.add(code);
    }

    // 1) Création des rôles manquants
    const roleByCountry = new Map();
    for (const code of neededCountries) {
      const hadRole = guild.roles.cache.some((role) => role.name === getCountryRoleName(code));
      const role = await ensureCountryRole(guild, code);
      if (!role) continue;
      if (!hadRole) stats.created += 1;
      roleByCountry.set(code, role);
    }

    // 2) Attribution / retrait membre par membre
    for (const member of guild.members.cache.values()) {
      if (member.user?.bot) continue;

      const countryCode = countryByDiscordId.get(member.id) || null;
      const targetRole = countryCode ? roleByCountry.get(countryCode) || null : null;

      const memberCountryRoles = member.roles.cache.filter((role) =>
        knownCountryRoleNames.has(role.name)
      );

      // Retire les rôles pays qui ne correspondent plus (changement de pays, joueur inactif...)
      for (const role of memberCountryRoles.values()) {
        if (targetRole && role.id === targetRole.id) continue;
        try {
          await member.roles.remove(role, 'Rôle pays: mise à jour');
          stats.removed += 1;
          await sleep(ACTION_DELAY_MS);
        } catch (err) {
          console.warn(`[CountryRoles] Retrait ${role.name} -> ${member.id} impossible:`, err?.message || err);
        }
      }

      // Ajoute le bon rôle pays
      if (targetRole && !member.roles.cache.has(targetRole.id)) {
        try {
          await member.roles.add(targetRole, 'Rôle pays: joueur du pays');
          stats.added += 1;
          await sleep(ACTION_DELAY_MS);
        } catch (err) {
          console.warn(`[CountryRoles] Ajout ${targetRole.name} -> ${member.id} impossible:`, err?.message || err);
        }
      }
    }

    console.log(
      `[CountryRoles] Synchro OK : ${stats.created} rôle(s) créé(s), ${stats.added} ajout(s), ${stats.removed} retrait(s).`
    );
    return { synced: true, ...stats };
  } catch (err) {
    console.error('[CountryRoles] Erreur pendant la synchro:', err?.message || err);
    return { synced: false, reason: 'error' };
  } finally {
    _isSyncing = false;
  }
}

// ── Initialisation ───────────────────────────────────────────

function initCountryRoles(guild, supabase) {
  console.log('[CountryRoles] Initialisation...');

  syncCountryRoles(guild, supabase).catch((err) =>
    console.error('[CountryRoles] Erreur initiale:', err)
  );

  if (_intervalRef) clearInterval(_intervalRef);
  _intervalRef = setInterval(() => {
    syncCountryRoles(guild, supabase).catch((err) =>
      console.error('[CountryRoles] Erreur pendant mise à jour:', err)
    );
  }, COUNTRY_ROLES_SYNC_INTERVAL_MS);

  console.log(
    `[CountryRoles] ✅ Initialisé (synchro toutes les ${COUNTRY_ROLES_SYNC_INTERVAL_MS / 60000} minutes)`
  );
}

module.exports = {
  initCountryRoles,
  syncCountryRoles, // export pour un refresh manuel (ex: commande admin)
  getCountryRoleName,
};
