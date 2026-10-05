'use strict';

// ============================================================
// country-roles.js
// Crée automatiquement un rôle Discord par pays (ex: "🇧🇪 Belgium")
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

const REGION_NAMES_EN = new Intl.DisplayNames(['en'], { type: 'region' });

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
  // Noms de pays en anglais (ex: "Belgium", "Germany")
  try {
    return REGION_NAMES_EN.of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}

/** Nom du rôle Discord pour un pays, ex: "🇧🇪 Belgium". */
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
    .not('discord_id', 'is', null)
    .limit(5000);
  if (playersError) throw new Error(playersError.message || 'players: lecture impossible');

  const { data: profiles, error: profilesError } = await supabase
    .from('lfn_player_profiles')
    .select('player_id, country_code')
    .limit(5000);
  if (profilesError) throw new Error(profilesError.message || 'profiles: lecture impossible');

  const profileMap = new Map((profiles || []).map((p) => [p.player_id, p.country_code]));

  // Map<discordId, countryCode | null> — null = joueur inactif (on lui retire son rôle pays)
  const byDiscordId = new Map();
  for (const player of players || []) {
    const discordId = String(player.discord_id || '').trim();
    if (!/^\d{15,25}$/.test(discordId)) continue;
    byDiscordId.set(
      discordId,
      player.active === false ? null : normalizeCountryCode(profileMap.get(player.id))
    );
  }
  return byDiscordId;
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
 * Synchronise les rôles pays du serveur.
 * Les membres sont récupérés un par un (comme la synchro des rôles de tier) :
 * un members.fetch() global peut expirer sur un gros serveur.
 *
 * @param {import('discord.js').Guild} guild
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function syncCountryRoles(guild, supabase) {
  if (_isSyncing) return { synced: false, reason: 'already_syncing' };
  if (!guild || !supabase) {
    console.warn('[CountryRoles] Contexte manquant (guild ou supabase), synchro annulée.');
    return { synced: false, reason: 'missing_context' };
  }

  _isSyncing = true;
  const stats = { created: 0, added: 0, removed: 0, missing: 0 };

  try {
    console.log('[CountryRoles] Synchro démarrée...');

    const me = guild.members.me || (await guild.members.fetchMe());
    if (!me.permissions.has('ManageRoles')) {
      console.warn('[CountryRoles] Permission "Gérer les rôles" manquante pour le bot, synchro annulée.');
      return { synced: false, reason: 'missing_manage_roles' };
    }

    const countryByDiscordId = await fetchPlayersWithCountry(supabase);
    console.log(`[CountryRoles] ${countryByDiscordId.size} joueur(s) avec un Discord ID en base.`);

    await guild.roles.fetch();

    // Noms de tous les rôles pays possibles : sert à reconnaître "nos" rôles
    // sans jamais toucher aux autres rôles du joueur.
    const knownCountryRoleNames = new Set(COUNTRIES.map((c) => getCountryRoleName(c.code)));
    for (const code of countryByDiscordId.values()) {
      if (code) knownCountryRoleNames.add(getCountryRoleName(code));
    }

    // 1) Récupère chaque membre présent sur le serveur
    const presentMembers = []; // { member, countryCode }
    for (const [discordId, countryCode] of countryByDiscordId) {
      let member = guild.members.cache.get(discordId) || null;
      if (!member) {
        try {
          member = await guild.members.fetch(discordId);
        } catch (err) {
          member = null; // pas sur le serveur (code 10007) ou erreur ponctuelle
        }
      }
      if (!member) {
        stats.missing += 1;
        continue;
      }
      presentMembers.push({ member, countryCode });
    }
    console.log(
      `[CountryRoles] ${presentMembers.length} joueur(s) trouvé(s) sur le serveur, ${stats.missing} absent(s).`
    );

    // 2) Crée les rôles pays manquants (seulement ceux avec au moins 1 joueur présent)
    const roleByCountry = new Map();
    const neededCountries = new Set(
      presentMembers.map((entry) => entry.countryCode).filter(Boolean)
    );
    for (const code of neededCountries) {
      const roleName = getCountryRoleName(code);
      const hadRole = guild.roles.cache.some((role) => role.name === roleName);
      const role = await ensureCountryRole(guild, code);
      if (!role) continue;
      if (!hadRole) {
        stats.created += 1;
        console.log(`[CountryRoles] Rôle créé : ${roleName}`);
      }
      roleByCountry.set(code, role);
    }

    // 3) Attribue / retire les rôles
    for (const { member, countryCode } of presentMembers) {
      if (member.user?.bot) continue;

      const targetRole = countryCode ? roleByCountry.get(countryCode) || null : null;
      const memberCountryRoles = member.roles.cache.filter((role) =>
        knownCountryRoleNames.has(role.name)
      );

      // Retire les anciens rôles pays (changement de pays, joueur inactif...)
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
          console.warn(
            `[CountryRoles] Ajout ${targetRole.name} -> ${member.id} impossible ` +
              '(le rôle du bot est-il AU-DESSUS des rôles pays ?):',
            err?.message || err
          );
        }
      }
    }

    console.log(
      `[CountryRoles] Synchro OK : ${stats.created} rôle(s) créé(s), ${stats.added} ajout(s), ${stats.removed} retrait(s).`
    );
    return { synced: true, ...stats };
  } catch (err) {
    console.error('[CountryRoles] Erreur pendant la synchro:', err?.stack || err?.message || err);
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
