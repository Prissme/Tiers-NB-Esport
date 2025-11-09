#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variables manquantes: définis SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

function normalize(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const stringValue = String(value).trim();
  return stringValue.length > 0 ? stringValue : null;
}

function extractDiscordId(user) {
  if (!user) {
    console.warn('[extractDiscordId] Utilisateur manquant.');
    return null;
  }

  const identities = Array.isArray(user.identities) ? user.identities : [];
  const discordIdentity = identities.find((identity) => identity?.provider === 'discord');

  if (discordIdentity) {
    const directId = normalize(discordIdentity.id);
    if (directId) {
      return directId;
    }

    const identityData = discordIdentity.identity_data || {};
    const identityDataId = normalize(identityData.sub);
    if (identityDataId) {
      return identityDataId;
    }
  }

  const appMetadataId = normalize(user.app_metadata?.provider_id);
  if (appMetadataId) {
    return appMetadataId;
  }

  const fallbackId = normalize(user.id);
  if (fallbackId) {
    console.warn('[extractDiscordId] Retour vers user.id faute de mieux.', { userId: fallbackId });
    return fallbackId;
  }

  console.warn('[extractDiscordId] Impossible de déterminer le Discord ID.', {
    user: {
      hasIdentities: Array.isArray(user.identities) && user.identities.length > 0,
      appMetadataKeys: user.app_metadata ? Object.keys(user.app_metadata) : []
    }
  });
  return null;
}

async function fetchAllAuthUsers(perPage = 100) {
  const users = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    const batch = data?.users || [];
    if (batch.length === 0) {
      break;
    }

    users.push(...batch);

    if (data?.nextPage) {
      page = data.nextPage;
    } else if (batch.length === perPage) {
      page += 1;
    } else {
      hasMore = false;
    }
  }

  return users;
}

async function fetchPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('id, discord_id, name')
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

async function main() {
  console.log('🚀 Migration des discord_id vers les vrais identifiants Discord (Snowflakes)');

  try {
    const [authUsers, players] = await Promise.all([fetchAllAuthUsers(), fetchPlayers()]);
    console.log(`👥 ${authUsers.length} utilisateur(s) auth récupéré(s).`);
    console.log(`🎮 ${players.length} joueur(s) chargé(s).\n`);

    const authUserBySupabaseId = new Map(authUsers.map((user) => [user.id, user]));
    const currentDiscordUsage = new Map();
    for (const player of players) {
      const normalizedId = normalize(player.discord_id);
      if (normalizedId) {
        currentDiscordUsage.set(normalizedId, player.id);
      }
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let alreadySnowflake = 0;
    let updated = 0;
    let skippedMissingUser = 0;
    let skippedMissingDiscord = 0;
    let skippedDuplicate = 0;
    let unchangedFallback = 0;
    let errors = 0;

    for (const player of players) {
      const currentDiscordId = normalize(player.discord_id);
      if (!currentDiscordId) {
        skippedMissingDiscord += 1;
        console.log(`⚠️  Joueur ${player.name} (#${player.id}) sans discord_id, ignoré.`);
        continue;
      }

      if (!uuidRegex.test(currentDiscordId)) {
        alreadySnowflake += 1;
        continue;
      }

      const authUser = authUserBySupabaseId.get(currentDiscordId);
      if (!authUser) {
        skippedMissingUser += 1;
        console.warn(`⚠️  Joueur ${player.name} (#${player.id}) : utilisateur auth ${currentDiscordId} introuvable.`);
        continue;
      }

      const realDiscordId = extractDiscordId(authUser);
      if (!realDiscordId) {
        skippedMissingDiscord += 1;
        console.warn(`⚠️  Joueur ${player.name} (#${player.id}) : Discord ID introuvable pour l'utilisateur auth.`);
        continue;
      }

      if (realDiscordId === currentDiscordId) {
        unchangedFallback += 1;
        continue;
      }

      const existingUsage = currentDiscordUsage.get(realDiscordId);
      if (existingUsage && existingUsage !== player.id) {
        skippedDuplicate += 1;
        console.warn(
          `⚠️  Joueur ${player.name} (#${player.id}) : Discord ID ${realDiscordId} déjà utilisé par le joueur #${existingUsage}.`
        );
        continue;
      }

      const { error } = await supabase
        .from('players')
        .update({ discord_id: realDiscordId })
        .eq('id', player.id);

      if (error) {
        errors += 1;
        console.error(`❌ Mise à jour échouée pour ${player.name} (#${player.id}) : ${error.message}`);
        continue;
      }

      updated += 1;
      currentDiscordUsage.delete(currentDiscordId);
      currentDiscordUsage.set(realDiscordId, player.id);
      console.log(`✅ Joueur ${player.name} (#${player.id}) : ${currentDiscordId} → ${realDiscordId}`);
    }

    console.log('\n═══════════════════════════════════════');
    console.log('📊 RÉSUMÉ MIGRATION');
    console.log(`   ✅ Mis à jour : ${updated}`);
    console.log(`   🔁 Déjà en Snowflake : ${alreadySnowflake}`);
    console.log(`   ⚠️  Sans discord_id ou introuvables : ${skippedMissingDiscord}`);
    console.log(`   ⚠️  Utilisateurs auth manquants : ${skippedMissingUser}`);
    console.log(`   ⚠️  Conflits d\'ID Discord : ${skippedDuplicate}`);
    console.log(`   ⚠️  Restés sur user.id faute de mieux : ${unchangedFallback}`);
    console.log(`   ❌ Erreurs : ${errors}`);
    console.log('═══════════════════════════════════════');

    if (errors > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('❌ Migration interrompue:', error.message);
    process.exit(1);
  }
}

main();
