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

function getTierByRank(rank) {
  if (rank === 1) return 'S';
  if (rank >= 2 && rank <= 4) return 'A';
  if (rank >= 5 && rank <= 10) return 'B';
  if (rank >= 11 && rank <= 20) return 'C';
  if (rank >= 21 && rank <= 35) return 'D';
  if (rank >= 36 && rank <= 50) return 'E';
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

async function handleGetTop50(res) {
  const supabase = createSupabaseClient();
  if (!supabase) {
    console.error('Supabase credentials missing.');
    return sendJson(res, 500, { ok: false, error: 'server_misconfigured' });
  }

  try {
    const { data, error } = await supabase
      .from('players')
      .select(
        'id,display_name,mmr,weight,games_played,wins,losses,profile_image_url,bio,recent_scrims,social_links'
      )
      .eq('active', true)
      .order('mmr', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    const playersWithTiers = (data || []).map((player, index) => ({
      ...player,
      tier: getTierByRank(index + 1)
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
      .select('id,display_name,mmr,weight')
      .eq('active', true)
      .order('display_name', { ascending: true });

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

  const rawDisplayName =
    typeof payload?.display_name === 'string'
      ? payload.display_name
      : typeof payload?.displayName === 'string'
      ? payload.displayName
      : '';
  const displayName = rawDisplayName.trim();

  if (!displayName || displayName.length > 80) {
    return sendJson(res, 400, { ok: false, error: 'invalid_display_name' });
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
        display_name: displayName,
        mmr: 1000,
        weight,
        wins: 0,
        losses: 0,
        games_played: 0,
        active: true
      })
      .select('id,display_name,mmr,weight')
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
    default:
      sendJson(res, 404, { ok: false, error: 'not_found' });
      return true;
  }
}

module.exports = { handleApiRequest, sendText };
