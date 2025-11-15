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

function extractUserName(user) {
  if (!user) {
    return 'Unknown';
  }

  const metadata = user.user_metadata || {};
  const candidates = [
    metadata.full_name,
    metadata.name,
    metadata.preferred_username,
    metadata.user_name,
    user.email ? user.email.split('@')[0] : null
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed.slice(0, 80);
      }
    }
  }

  return user.id ? `Player_${user.id.slice(0, 8)}` : 'Unknown';
}

function extractDiscordId(user) {
  if (!user) {
    console.warn('[extractDiscordId] Utilisateur manquant.');
    return null;
  }

  const normalize = (value) => {
    if (value === undefined || value === null) {
      return null;
    }

    const stringValue = String(value).trim();
    return stringValue.length > 0 ? stringValue : null;
  };

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

function createPlayerPayload(user) {
  const discordId = extractDiscordId(user);
  const name = extractUserName(user);
  const safeDiscordId = typeof discordId === 'string' && discordId ? discordId : user.id;
  const finalName =
    typeof name === 'string' && name.trim() ? name.trim().slice(0, 80) : `Player_${safeDiscordId?.slice(0, 8)}`;

  return {
    discord_id: safeDiscordId,
    name: finalName,
    mmr: 1000,
    weight: 1,
    wins: 0,
    losses: 0,
    games_played: 0,
    win_streak: 0,
    lose_streak: 0,
    active: true
  };
}

async function ensurePlayerForUser(user) {
  if (!user?.id) {
    return { status: 'skipped', reason: 'missing_id' };
  }

  const discordId = extractDiscordId(user);
  if (!discordId) {
    return { status: 'skipped', reason: 'missing_discord_id' };
  }

  try {
    const { data: existing, error: selectError } = await supabase
      .from('players')
      .select('id')
      .eq('discord_id', discordId)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    if (existing) {
      return { status: 'exists', playerId: existing.id };
    }
  } catch (error) {
    console.error(`❌ [${discordId}] Vérification impossible: ${error.message}`);
    return { status: 'error', error };
  }

  const basePayload = createPlayerPayload(user);
  const insertPayload = { ...basePayload };

  const insertResult = await supabase
    .from('players')
    .insert(insertPayload)
    .select('id')
    .single();

  if (insertResult.error) {
    if (insertResult.error.code === '23505') {
      return { status: 'exists' };
    }

    console.error(`❌ [${discordId}] Insertion impossible: ${insertResult.error.message}`);
    return { status: 'error', error: insertResult.error };
  }

  return { status: 'created', playerId: insertResult.data?.id || null };
}

async function fetchAllUsers(perPage = 100) {
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

async function main() {
  console.log('🚀 Migration des utilisateurs Supabase Auth vers la table players');

  try {
    const users = await fetchAllUsers();
    console.log(`👥 ${users.length} utilisateur(s) récupéré(s).\n`);

    let migrated = 0;
    let alreadyExists = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      const discordId = extractDiscordId(user) || user.id;
      const displayName = extractUserName(user);
      const result = await ensurePlayerForUser(user);

      switch (result.status) {
        case 'created':
          migrated += 1;
          console.log(`✅ Créé: ${displayName} (${discordId})`);
          break;
        case 'exists':
          alreadyExists += 1;
          console.log(`⏭️  Ignoré (déjà présent): ${displayName} (${discordId})`);
          break;
        case 'skipped':
          skipped += 1;
          {
            let reasonLabel = 'raison inconnue';
            if (result.reason === 'missing_id') {
              reasonLabel = 'ID utilisateur manquant';
            } else if (result.reason === 'missing_discord_id') {
              reasonLabel = 'Discord ID introuvable';
            }
            console.log(`⚠️  Ignoré (${reasonLabel}): ${displayName} (${discordId || 'n/a'})`);
          }
          break;
        case 'error':
        default:
          errors += 1;
          console.log(`❌ Erreur pour ${discordId}: ${result.error?.message || 'inconnue'}`);
          break;
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log('📊 RÉSUMÉ MIGRATION');
    console.log(`   ✅ Créés: ${migrated}`);
    console.log(`   ⏭️  Déjà présents: ${alreadyExists}`);
    console.log(`   ⚠️  Ignorés: ${skipped}`);
    console.log(`   ❌ Erreurs: ${errors}`);
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
