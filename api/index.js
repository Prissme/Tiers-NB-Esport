const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

const K_FACTOR = 100;

const TIER_DISTRIBUTION = [
  { tier: 'S', ratio: 0.005, minCount: 1 },
  { tier: 'A', ratio: 0.02, minCount: 1 },
  { tier: 'B', ratio: 0.04, minCount: 1 },
  { tier: 'C', ratio: 0.1, minCount: 1 },
  { tier: 'D', ratio: 0.28, minCount: 1 },
  { tier: 'E', ratio: 0.555, minCount: 1 }
];

function createSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false
    }
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    ...JSON_HEADERS,
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendNoContent(res) {
  res.writeHead(204, JSON_HEADERS);
  res.end();
}

function sendText(res, statusCode, message) {
  const body = message || '';
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

function getBearerToken(headers) {
  const authorization = headers['authorization'];
  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

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
    metadata.global_name,
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

  const fallback = user.id ? `Player_${user.id.slice(0, 8)}` : 'Unknown';
  return fallback;
}

function extractDiscordId(user) {
  if (!user) {
    console.warn('[extractDiscordId] Missing user payload.');
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
    console.warn('[extractDiscordId] Falling back to Supabase user.id for Discord identifier.', {
      userId: fallbackId
    });
    return fallbackId;
  }

  console.warn('[extractDiscordId] Unable to determine Discord ID.', {
    user: {
      hasIdentities: Array.isArray(user.identities) && user.identities.length > 0,
      appMetadataKeys: user.app_metadata ? Object.keys(user.app_metadata) : []
    }
  });
  return null;
}

function buildDefaultPlayerPayload(discordId, name) {
  const safeName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 80) : null;
  const finalName = safeName || (discordId ? `Player_${discordId.slice(0, 8)}` : 'Unknown');

  return {
    discord_id: discordId,
    name: finalName,
    mmr: 1000,
    weight: 1,
    wins: 0,
    losses: 0,
    games_played: 0,
    active: true
  };
}

async function resolveAdminUser(supabase, token) {
  if (!token) {
    return null;
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  if (ADMIN_USER_IDS.length === 0) {
    return null;
  }

  return ADMIN_USER_IDS.includes(user.id) ? user : null;
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
    return 'No-tier';
  }

  for (const boundary of boundaries) {
    if (rank <= boundary.endRank) {
      return boundary.tier;
    }
  }

  return 'No-tier';
}

function weightedAverage(players) {
  const totalWeight = players.reduce((acc, player) => acc + (player.weight || 1), 0) || players.length || 1;
  const weightedSum = players.reduce((acc, player) => acc + player.mmr * (player.weight || 1), 0);
  return weightedSum / totalWeight;
}

function expectedScore(playerMMR, opponentWeightedMMR) {
  return 1 / (1 + Math.pow(10, (opponentWeightedMMR - playerMMR) / 400));
}

function computeDelta(player, opponents, didWin) {
  const opponentWeightedMMR = weightedAverage(opponents);
  const playerWeight = player.weight || 1;
  const expected = expectedScore(player.mmr, opponentWeightedMMR);
  const score = didWin ? 1 : 0;
  const delta = K_FACTOR * playerWeight * (score - expected);
  return Math.round(delta);
}

function applyValidPlayerFilters(query) {
  return query
    .eq('active', true)
    .not('discord_id', 'is', null);
}

async function handleGetTop50(res) {
  const supabase = createSupabaseClient();
  if (!supabase) {
    console.error('Supabase credentials missing.');
    return sendJson(res, 500, { ok: false, error: 'server_misconfigured' });
  }

  try {
    const selectColumns =
      'id,name,mmr,weight,games_played,wins,losses,profile_image_url,bio,recent_scrims,social_links';

    const { count: totalPlayers } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    const baseQuery = supabase.from('players').select(selectColumns);

    const { data, error } = await applyValidPlayerFilters(baseQuery)
      .order('mmr', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    const tierBoundaries = computeTierBoundaries(totalPlayers || 0);

    const playersWithTiers = (data || []).map((player, index) => ({
      ...player,
      tier: getTierByRank(index + 1, tierBoundaries)
    }));

    return sendJson(res, 200, { ok: true, top: playersWithTiers });
  } catch (error) {
    console.error('Failed to fetch Top 50 ranking.', error);
    return sendJson(res, 500, { ok: false, error: error.message || 'unexpected_error' });
  }
}

async function handleCheckAdmin(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  const supabase = createSupabaseClient();
  if (!supabase) {
    console.error('Supabase credentials missing.');
    return sendJson(res, 500, { ok: false, error: 'server_misconfigured' });
  }

  const token = getBearerToken(req.headers);
  if (!token) {
    return sendJson(res, 401, { ok: false, error: 'missing_token' });
  }

  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return sendJson(res, 401, { ok: false, error: 'invalid_token' });
    }

    const isAdmin = ADMIN_USER_IDS.length > 0 ? ADMIN_USER_IDS.includes(user.id) : false;

    return sendJson(res, 200, {
      ok: true,
      isAdmin,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null
      }
    });
  } catch (error) {
    console.error('Failed to verify admin.', error);
    return sendJson(res, 500, { ok: false, error: 'unexpected_error' });
  }
}

async function handleGetPlayers(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  const supabase = createSupabaseClient();
  if (!supabase) {
    console.error('Supabase credentials missing.');
    return sendJson(res, 500, { ok: false, error: 'server_misconfigured' });
  }

  const token = getBearerToken(req.headers);
  if (!token) {
    return sendJson(res, 401, { ok: false, error: 'missing_token' });
  }

  try {
    const adminUser = await resolveAdminUser(supabase, token);
    if (!adminUser) {
      return sendJson(res, 403, { ok: false, error: 'forbidden' });
    }

    const { data, error } = await supabase
      .from('players')
      .select('id,name,mmr,weight')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return sendJson(res, 200, { ok: true, players: data });
  } catch (error) {
    console.error('Failed to load players.', error);
    return sendJson(res, 500, { ok: false, error: 'unexpected_error' });
  }
}

function readJsonBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let body = '';
    let hasErrored = false;

    req.on('data', (chunk) => {
      if (hasErrored) {
        return;
      }

      body += chunk;
      if (body.length > limit) {
        hasErrored = true;
        reject(new Error('payload_too_large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (hasErrored) {
        return;
      }

      if (!body) {
        resolve({});
        return;
      }

      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (error) {
        reject(new Error('invalid_json'));
      }
    });

    req.on('error', (error) => {
      if (hasErrored) {
        return;
      }
      hasErrored = true;
      reject(error);
    });
  });
}

async function handleSubmitMatch(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  const supabase = createSupabaseClient();
  if (!supabase) {
    console.error('Supabase credentials missing.');
    return sendJson(res, 500, { ok: false, error: 'server_misconfigured' });
  }

  const token = getBearerToken(req.headers);
  if (!token) {
    return sendJson(res, 401, { ok: false, error: 'missing_token' });
  }

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    if (error.message === 'invalid_json') {
      return sendJson(res, 400, { ok: false, error: 'invalid_json' });
    }

    if (error.message === 'payload_too_large') {
      return sendJson(res, 413, { ok: false, error: 'payload_too_large' });
    }

    console.error('Failed to parse request body.', error);
    return sendJson(res, 500, { ok: false, error: 'unexpected_error' });
  }

  const winners = Array.isArray(payload?.winners) ? payload.winners : [];
  const losers = Array.isArray(payload?.losers) ? payload.losers : [];

  if (winners.length !== 3 || losers.length !== 3) {
    return sendJson(res, 400, { ok: false, error: 'invalid_roster' });
  }

  const uniqueIds = new Set([...winners, ...losers]);
  if (uniqueIds.size !== 6) {
    return sendJson(res, 400, { ok: false, error: 'duplicate_players' });
  }

  try {
    const adminUser = await resolveAdminUser(supabase, token);
    if (!adminUser) {
      return sendJson(res, 403, { ok: false, error: 'forbidden' });
    }

    const { data: players, error } = await supabase
      .from('players')
      .select('id,mmr,weight,games_played,wins,losses')
      .in('id', Array.from(uniqueIds));

    if (error) {
      throw error;
    }

    if (!players || players.length !== 6) {
      return sendJson(res, 400, { ok: false, error: 'players_not_found' });
    }

    const playerMap = new Map(players.map((player) => [player.id, player]));
    const winnerPlayers = winners.map((id) => playerMap.get(id));
    const loserPlayers = losers.map((id) => playerMap.get(id));

    if (winnerPlayers.some((player) => !player) || loserPlayers.some((player) => !player)) {
      return sendJson(res, 400, { ok: false, error: 'players_not_found' });
    }

    const updates = [];

    for (const player of winnerPlayers) {
      const delta = computeDelta(player, loserPlayers, true);
      updates.push({
        id: player.id,
        mmr: Math.max(0, Math.round(player.mmr + delta)),
        wins: (player.wins || 0) + 1,
        losses: player.losses || 0,
        games_played: (player.games_played || 0) + 1
      });
    }

    for (const player of loserPlayers) {
      const delta = computeDelta(player, winnerPlayers, false);
      updates.push({
        id: player.id,
        mmr: Math.max(0, Math.round(player.mmr + delta)),
        wins: player.wins || 0,
        losses: (player.losses || 0) + 1,
        games_played: (player.games_played || 0) + 1
      });
    }

    const updatePromises = updates.map((update) =>
      supabase
        .from('players')
        .update({
          mmr: update.mmr,
          wins: update.wins,
          losses: update.losses,
          games_played: update.games_played
        })
        .eq('id', update.id)
    );

    const results = await Promise.all(updatePromises);
    const updateError = results.find((result) => result.error);
    if (updateError && updateError.error) {
      throw updateError.error;
    }

    return sendJson(res, 200, { ok: true, updates });
  } catch (error) {
    console.error('Failed to submit match result.', error);
    return sendJson(res, 500, { ok: false, error: 'unexpected_error' });
  }
}

async function handleAutoRegister(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  const supabase = createSupabaseClient();
  if (!supabase) {
    console.error('[autoRegister] Supabase credentials missing.');
    return sendJson(res, 500, { ok: false, error: 'server_misconfigured' });
  }

  const token = getBearerToken(req.headers);
  if (!token) {
    return sendJson(res, 401, { ok: false, error: 'missing_token' });
  }

  let user;
  try {
    const {
      data: { user: authUser },
      error
    } = await supabase.auth.getUser(token);

    if (error || !authUser) {
      return sendJson(res, 401, { ok: false, error: 'invalid_token' });
    }

    user = authUser;
  } catch (error) {
    console.error('[autoRegister] Failed to validate token.', error);
    return sendJson(res, 500, { ok: false, error: 'unexpected_error' });
  }

  const discordId = extractDiscordId(user);
  if (!discordId) {
    return sendJson(res, 400, { ok: false, error: 'invalid_user' });
  }

  let existingPlayer = null;
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id,name,mmr,weight,wins,losses,games_played,active,discord_id')
      .eq('discord_id', discordId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    existingPlayer = data;
  } catch (error) {
    console.error('[autoRegister] Failed to check existing player.', error);
  }

  if (existingPlayer) {
    return sendJson(res, 200, { ok: true, alreadyExists: true, player: existingPlayer });
  }

  const displayName = extractUserName(user);

  const normalizedDisplayName = typeof displayName === 'string' ? displayName.toLowerCase() : '';

  try {
    const { data: allPlayers, error: allPlayersError } = await supabase
      .from('players')
      .select('id, name, discord_id, mmr, weight, wins, losses, games_played, active');

    if (allPlayersError) {
      throw allPlayersError;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const playerWithMatchingName = (allPlayers || []).find((player) => {
      if (!uuidRegex.test(player.discord_id || '')) {
        return false;
      }

      const playerName = typeof player.name === 'string' ? player.name.toLowerCase() : '';
      return playerName && playerName === normalizedDisplayName;
    });

    if (playerWithMatchingName) {
      const { error: updateError } = await supabase
        .from('players')
        .update({ discord_id: discordId })
        .eq('id', playerWithMatchingName.id);

      if (updateError) {
        throw updateError;
      }

      console.log(
        `[autoRegister] Linked existing player "${playerWithMatchingName.name}" to Discord ID ${discordId}`
      );

      return sendJson(res, 200, {
        ok: true,
        linked: true,
        player: { ...playerWithMatchingName, discord_id: discordId }
      });
    }
  } catch (error) {
    console.error('[autoRegister] Failed to link existing player by name.', error);
  }

  const defaultPayload = buildDefaultPlayerPayload(discordId, displayName);

  let insertResult = await supabase
    .from('players')
    .insert(defaultPayload)
    .select('id,name,mmr,weight,wins,losses,games_played,active,discord_id')
    .single();

  if (insertResult.error) {
    if (insertResult.error.code === '23505') {
      console.warn('[autoRegister] Player already exists (race condition).', insertResult.error.message);
      try {
        const { data, error } = await supabase
          .from('players')
          .select('id,name,mmr,weight,wins,losses,games_played,active,discord_id')
          .eq('discord_id', discordId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        return sendJson(res, 200, { ok: true, alreadyExists: true, player: data || null });
      } catch (lookupError) {
        console.error('[autoRegister] Failed to fetch player after duplicate error.', lookupError);
        return sendJson(res, 200, { ok: true, alreadyExists: true });
      }
    }

    console.error('[autoRegister] Failed to create player.', insertResult.error);
    return sendJson(res, 500, { ok: false, error: 'insert_failed' });
  }

  return sendJson(res, 200, { ok: true, player: insertResult.data });
}

async function handleCreatePlayer(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  const supabase = createSupabaseClient();
  if (!supabase) {
    console.error('Supabase credentials missing.');
    return sendJson(res, 500, { ok: false, error: 'server_misconfigured' });
  }

  const token = getBearerToken(req.headers);
  if (!token) {
    return sendJson(res, 401, { ok: false, error: 'missing_token' });
  }

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    if (error.message === 'invalid_json') {
      return sendJson(res, 400, { ok: false, error: 'invalid_json' });
    }

    if (error.message === 'payload_too_large') {
      return sendJson(res, 413, { ok: false, error: 'payload_too_large' });
    }

    console.error('Failed to parse create player payload.', error);
    return sendJson(res, 500, { ok: false, error: 'unexpected_error' });
  }

  const rawName =
    typeof payload?.name === 'string'
      ? payload.name
      : typeof payload?.displayName === 'string'
      ? payload.displayName
      : '';
  const playerName = rawName.trim();

  if (!playerName || playerName.length > 80) {
    return sendJson(res, 400, { ok: false, error: 'invalid_name' });
  }

  let weight = Number(payload?.weight);
  if (!Number.isFinite(weight) || weight <= 0) {
    weight = 1;
  } else {
    weight = Math.round(weight * 100) / 100;
  }

  try {
    const adminUser = await resolveAdminUser(supabase, token);
    if (!adminUser) {
      return sendJson(res, 403, { ok: false, error: 'forbidden' });
    }

    const { data, error } = await supabase
      .from('players')
        .insert({
          name: playerName,
          mmr: 1000,
          weight,
          wins: 0,
          losses: 0,
          games_played: 0,
          active: true
        })
      .select('id,name,mmr,weight')
      .single();

    if (error) {
      if (error.code === '23505') {
        return sendJson(res, 409, { ok: false, error: 'duplicate_player' });
      }

      throw error;
    }

    return sendJson(res, 201, { ok: true, player: data });
  } catch (error) {
    console.error('Failed to create player.', error);
    return sendJson(res, 500, { ok: false, error: 'unexpected_error' });
  }
}

async function handleResetAllMMR(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  const supabase = createSupabaseClient();
  if (!supabase) {
    console.error('[resetMMR] Supabase credentials missing.');
    return sendJson(res, 500, { ok: false, error: 'server_misconfigured' });
  }

  const token = getBearerToken(req.headers);
  if (!token) {
    console.warn('[resetMMR] Missing bearer token.');
    return sendJson(res, 401, { ok: false, error: 'missing_token', message: 'Jeton d’authentification manquant.' });
  }

  try {
    console.log('[resetMMR] Reset request received. Resolving admin user.');
    const adminUser = await resolveAdminUser(supabase, token);
    if (!adminUser) {
      console.warn('[resetMMR] Forbidden request: user is not an admin.');
      return sendJson(res, 403, { ok: false, error: 'forbidden', message: 'Accès refusé.' });
    }

    console.log('[resetMMR] Admin verified.', { id: adminUser.id, email: adminUser.email });

    const { error, count } = await supabase
      .from('players')
      .update({ mmr: 1000, wins: 0, losses: 0, games_played: 0 })
      .eq('active', true)
      .select('*', { count: 'exact', head: false });

    if (error) {
      console.error('[resetMMR] Supabase update failed.', error);
      return sendJson(res, 500, {
        ok: false,
        error: 'reset_failed',
        message: "La base de données n’a pas pu être mise à jour. Consulte les logs serveur."
      });
    }

    const updated = typeof count === 'number' ? count : 0;
    if (typeof count !== 'number') {
      console.warn('[resetMMR] Supabase did not return a count. Raw value:', count);
    }

    console.log(`[resetMMR] Reset completed. Updated ${updated} players.`);

    return sendJson(res, 200, {
      ok: true,
      updated
    });
  } catch (error) {
    console.error('[resetMMR] Unexpected failure.', error);
    return sendJson(res, 500, {
      ok: false,
      error: 'unexpected_error',
      message: "Une erreur inattendue s’est produite lors de la réinitialisation."
    });
  }
}

async function handleApiRequest(req, res) {
  const requestUrl = new URL(req.url, 'http://localhost');
  const pathname = requestUrl.pathname;

  if (!pathname.startsWith('/api')) {
    return false;
  }

  if (req.method === 'OPTIONS') {
    sendNoContent(res);
    return true;
  }

  switch (pathname) {
    case '/api/getTop50':
      await handleGetTop50(res);
      return true;
    case '/api/checkAdmin':
      await handleCheckAdmin(req, res);
      return true;
    case '/api/getPlayers':
      await handleGetPlayers(req, res);
      return true;
    case '/api/submitMatch':
      await handleSubmitMatch(req, res);
      return true;
    case '/api/createPlayer':
      await handleCreatePlayer(req, res);
      return true;
    case '/api/autoRegister':
      await handleAutoRegister(req, res);
      return true;
    case '/api/resetMMR':
      await handleResetAllMMR(req, res);
      return true;
    default:
      sendJson(res, 404, { ok: false, error: 'not_found' });
      return true;
  }
}

module.exports = { handleApiRequest, sendText };
