const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const ROLE_TIER_S = process.env.ROLE_TIER_S;
const ROLE_TIER_A = process.env.ROLE_TIER_A;
const ROLE_TIER_B = process.env.ROLE_TIER_B;
const ROLE_TIER_C = process.env.ROLE_TIER_C;
const ROLE_TIER_D = process.env.ROLE_TIER_D;
const ROLE_TIER_E = process.env.ROLE_TIER_E;

const TIER_DISTRIBUTION = [
  { tier: 'S', ratio: 0.005, minCount: 1 },
  { tier: 'A', ratio: 0.02, minCount: 1 },
  { tier: 'B', ratio: 0.04, minCount: 1 },
  { tier: 'C', ratio: 0.1, minCount: 1 },
  { tier: 'D', ratio: 0.28, minCount: 1 },
  { tier: 'E', ratio: 0.555, minCount: 1 }
];

if (!DISCORD_BOT_TOKEN) {
  console.error('[bot] Missing DISCORD_BOT_TOKEN environment variable.');
  process.exit(1);
}

if (!DISCORD_GUILD_ID) {
  console.error('[bot] Missing DISCORD_GUILD_ID environment variable.');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[bot] Missing Supabase configuration (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
});

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const tierRoleMap = {
  S: ROLE_TIER_S,
  A: ROLE_TIER_A,
  B: ROLE_TIER_B,
  C: ROLE_TIER_C,
  D: ROLE_TIER_D,
  E: ROLE_TIER_E
};

const tierRoleIds = Object.values(tierRoleMap).filter(Boolean);

const missingRoleEnv = Object.entries(tierRoleMap)
  .filter(([, value]) => !value)
  .map(([tier]) => tier);

if (missingRoleEnv.length > 0) {
  console.warn(
    `[bot] Missing role IDs for tiers: ${missingRoleEnv.join(', ')}. Tier synchronization may be incomplete.`
  );
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember]
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

  return normalize(user.id);
}

async function resolveDiscordIdForPlayer(player) {
  const currentDiscordId = normalize(player.discord_id);
  if (!currentDiscordId || !uuidRegex.test(currentDiscordId)) {
    return currentDiscordId;
  }

  try {
    const { data, error } = await supabase.auth.admin.getUserById(currentDiscordId);
    if (error) {
      console.warn(
        `[resolveDiscordIdForPlayer] Failed to fetch auth user ${currentDiscordId} for player ${player.id}.`,
        error
      );
      return currentDiscordId;
    }

    const authUser = data?.user || data || null;
    const resolvedId = normalize(extractDiscordId(authUser));
    if (!resolvedId || resolvedId === currentDiscordId || uuidRegex.test(resolvedId)) {
      return currentDiscordId;
    }

    const { error: updateError } = await supabase
      .from('players')
      .update({ discord_id: resolvedId })
      .eq('id', player.id);

    if (updateError) {
      console.warn(
        `[resolveDiscordIdForPlayer] Failed to update player ${player.id} discord_id ${currentDiscordId} → ${resolvedId}.`,
        updateError
      );
      return currentDiscordId;
    }

    console.log(
      `[resolveDiscordIdForPlayer] Migrated player ${player.name || player.id} discord_id ${currentDiscordId} → ${resolvedId}.`
    );
    player.discord_id = resolvedId;
    return resolvedId;
  } catch (error) {
    console.warn(
      `[resolveDiscordIdForPlayer] Unexpected error while resolving discord_id for player ${player.id}.`,
      error
    );
    return currentDiscordId;
  }
}

function computeTierBoundaries(totalPlayers) {
  if (!totalPlayers || totalPlayers <= 0) {
    return [];
  }

  let remaining = totalPlayers;
  const boundaries = [];

  for (let index = 0; index < TIER_DISTRIBUTION.length; index += 1) {
    const distribution = TIER_DISTRIBUTION[index];
    const isLastTier = index === TIER_DISTRIBUTION.length - 1;

    let count;
    if (isLastTier) {
      count = remaining;
    } else {
      const futureMin = TIER_DISTRIBUTION.slice(index + 1).reduce(
        (sum, entry) => sum + (entry.minCount || 0),
        0
      );

      count = Math.floor(totalPlayers * distribution.ratio);
      if (count < distribution.minCount) {
        count = distribution.minCount;
      }

      const maxAllowed = remaining - futureMin;
      if (count > maxAllowed) {
        count = Math.max(distribution.minCount || 0, maxAllowed);
      }
    }

    remaining -= count;
    boundaries.push({ tier: distribution.tier, endRank: totalPlayers - remaining });

    if (remaining <= 0) {
      break;
    }
  }

  return boundaries;
}

function getTierByRank(rank, boundaries) {
  if (!Array.isArray(boundaries) || boundaries.length === 0) {
    return null;
  }

  for (const boundary of boundaries) {
    if (rank <= boundary.endRank) {
      return boundary.tier;
    }
  }

  return null;
}

function sanitizeName(name) {
  if (typeof name !== 'string') {
    return null;
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 80);
}

function getMemberPreferredName(member) {
  if (!member) {
    return null;
  }

  const displayName = typeof member.displayName === 'string' ? member.displayName : null;
  if (displayName && displayName.trim()) {
    return displayName;
  }

  const username = member.user && typeof member.user.username === 'string' ? member.user.username : null;
  return username || null;
}

async function fetchActivePlayers() {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, mmr, discord_id, active')
      .eq('active', true)
      .order('mmr', { ascending: false });

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[syncAllRoles] Failed to fetch players.', error);
    return [];
  }
}

async function syncAllRoles() {
  console.log('[syncAllRoles] Starting role synchronization...');
  const players = await fetchActivePlayers();
  if (players.length === 0) {
    console.log('[syncAllRoles] No active players found.');
    return;
  }

  let guild;
  try {
    guild = await client.guilds.fetch(DISCORD_GUILD_ID);
  } catch (error) {
    console.error(`[syncAllRoles] Failed to fetch guild ${DISCORD_GUILD_ID}.`, error);
    return;
  }

  let members;
  try {
    members = await guild.members.fetch();
  } catch (error) {
    console.error('[syncAllRoles] Failed to fetch guild members.', error);
    return;
  }

  const boundaries = computeTierBoundaries(players.length);
  const sortedPlayers = players.slice();

  for (let index = 0; index < sortedPlayers.length; index += 1) {
    const player = sortedPlayers[index];
    const discordId = await resolveDiscordIdForPlayer(player);
    if (!discordId) {
      continue;
    }

    const rank = index + 1;
    const tier = getTierByRank(rank, boundaries);
    const targetRoleId = tier ? tierRoleMap[tier] : null;

    if (!targetRoleId) {
      console.warn(`[syncAllRoles] No role configured for tier "${tier}". Skipping player ${player.name || player.id}.`);
      continue;
    }

    const member = members.get(discordId);
    if (!member) {
      console.warn(`[syncAllRoles] Member ${discordId} not found in guild. Skipping.`);
      continue;
    }

    try {
      const hasRole = member.roles.cache.has(targetRoleId);
      if (!hasRole) {
        await member.roles.add(targetRoleId);
        console.log(`[syncAllRoles] Added role ${targetRoleId} to ${member.user.tag}.`);
      }

      for (const roleId of tierRoleIds) {
        if (roleId && roleId !== targetRoleId && member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId);
          console.log(`[syncAllRoles] Removed role ${roleId} from ${member.user.tag}.`);
        }
      }
    } catch (error) {
      console.error(`[syncAllRoles] Failed to update roles for ${member.user.tag}.`, error);
    }
  }

  console.log('[syncAllRoles] Role synchronization completed.');
}

async function syncPlayerName(discordId, newName) {
  if (!discordId) {
    return;
  }

  const sanitized = sanitizeName(newName);
  if (!sanitized) {
    return;
  }

  try {
    const { data: player, error } = await supabase
      .from('players')
      .select('id, name')
      .eq('discord_id', discordId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!player) {
      return;
    }

    if (player.name === sanitized) {
      return;
    }

    const { error: updateError } = await supabase
      .from('players')
      .update({ name: sanitized })
      .eq('id', player.id);

    if (updateError) {
      throw updateError;
    }

    console.log(`[syncPlayerName] Updated player ${discordId} name to "${sanitized}".`);
  } catch (error) {
    console.error(`[syncPlayerName] Failed to sync name for ${discordId}.`, error);
  }
}

async function syncAllMemberNames() {
  console.log('[syncAllMemberNames] Synchronizing member names...');

  let guild;
  try {
    guild = await client.guilds.fetch(DISCORD_GUILD_ID);
  } catch (error) {
    console.error(`[syncAllMemberNames] Failed to fetch guild ${DISCORD_GUILD_ID}.`, error);
    return;
  }

  let members;
  try {
    members = await guild.members.fetch();
  } catch (error) {
    console.error('[syncAllMemberNames] Failed to fetch guild members.', error);
    return;
  }

  for (const member of members.values()) {
    const preferredName = getMemberPreferredName(member);
    if (!preferredName) {
      continue;
    }

    await syncPlayerName(member.id, preferredName);
  }

  console.log('[syncAllMemberNames] Name synchronization completed.');
}

client.once('ready', async () => {
  console.log(`✅ Bot connecté : ${client.user.tag}`);

  try {
    await syncAllRoles();
  } catch (error) {
    console.error('[bot] Failed to run initial role sync.', error);
  }

  try {
    await syncAllMemberNames();
  } catch (error) {
    console.error('[bot] Failed to run initial name sync.', error);
  }

  setInterval(() => {
    syncAllRoles().catch((error) => {
      console.error('[bot] Periodic role sync failed.', error);
    });
  }, 10 * 60 * 1000);
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
  const oldName = getMemberPreferredName(oldMember);
  const newName = getMemberPreferredName(newMember);

  if (oldName !== newName && newName) {
    syncPlayerName(newMember.id, newName);
  }
});

client.on('guildMemberAdd', (member) => {
  const preferredName = getMemberPreferredName(member);
  if (preferredName) {
    syncPlayerName(member.id, preferredName);
  }
});

client.login(DISCORD_BOT_TOKEN).catch((error) => {
  console.error('[bot] Failed to login to Discord.', error);
  process.exit(1);
});
