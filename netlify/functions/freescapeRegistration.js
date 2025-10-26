const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const EVENT_SLUG = 'freescape-priscup-2025';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    ...corsHeaders,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const sanitizePlayers = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0)
      .slice(0, 3);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter((item) => item.length > 0)
          .slice(0, 3);
      }
    } catch (err) {
      return value
        .split('\n')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, 3);
    }
  }
  return [];
};

const validatePayload = (body) => {
  if (!body || typeof body !== 'object') {
    return 'Payload invalide.';
  }

  const teamName = typeof body.team_name === 'string' ? body.team_name.trim() : '';
  const contact = typeof body.contact === 'string' ? body.contact.trim() : '';
  const players = sanitizePlayers(body.players);

  if (teamName.length < 3) {
    return "Le nom d'équipe doit contenir au moins 3 caractères.";
  }

  if (players.length < 3) {
    return 'Trois titulaires sont requis pour valider une inscription.';
  }

  const uniquePlayers = new Set(players.map((name) => name.toLowerCase()));
  if (uniquePlayers.size !== players.length) {
    return 'Chaque titulaire doit être unique.';
  }

  if (!contact || contact.length < 3) {
    return 'Un contact valide est requis pour le capitaine.';
  }

  return null;
};

const parseRegistration = (registration) => {
  if (!registration) return null;
  return {
    ...registration,
    players: sanitizePlayers(registration.players),
  };
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: 'OK',
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) {
    return jsonResponse(401, { ok: false, error: 'Authorization header manquant.' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return jsonResponse(401, { ok: false, error: 'Jeton invalide.' });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    return jsonResponse(401, { ok: false, error: 'Utilisateur non authentifié.' });
  }

  const userId = authData.user.id;

  if (event.httpMethod === 'GET') {
    try {
      const { data, error } = await supabase
        .from('freescape_registrations')
        .select(
          'id,user_id,team_name,captain_name,players,contact,substitute,matcherino_link,notes,map_preference,share_code,created_at,updated_at'
        )
        .eq('user_id', userId)
        .eq('event_slug', EVENT_SLUG)
        .maybeSingle();

      if (error) throw error;

      return jsonResponse(200, { ok: true, registration: parseRegistration(data) });
    } catch (err) {
      return jsonResponse(500, { ok: false, error: err.message });
    }
  }

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (err) {
      return jsonResponse(400, { ok: false, error: 'Corps de requête invalide.' });
    }

    const validationError = validatePayload(body);
    if (validationError) {
      return jsonResponse(400, { ok: false, error: validationError });
    }

    const players = sanitizePlayers(body.players);
    const now = new Date().toISOString();

    try {
      const { data: existing, error: fetchError } = await supabase
        .from('freescape_registrations')
        .select('*')
        .eq('user_id', userId)
        .eq('event_slug', EVENT_SLUG)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        const updates = {
          team_name: body.team_name.trim(),
          captain_name: players[0],
          players: JSON.stringify(players),
          contact: body.contact.trim(),
          substitute: body.substitute ? String(body.substitute).trim() : null,
          matcherino_link: body.matcherino_link ? String(body.matcherino_link).trim() : null,
          notes: body.notes ? String(body.notes).trim() : null,
          map_preference: body.map_preference ? String(body.map_preference).trim() : null,
          updated_at: now,
        };

        const { data: updated, error: updateError } = await supabase
          .from('freescape_registrations')
          .update(updates)
          .eq('id', existing.id)
          .select(
            'id,user_id,team_name,captain_name,players,contact,substitute,matcherino_link,notes,map_preference,share_code,created_at,updated_at'
          )
          .single();

        if (updateError) throw updateError;

        return jsonResponse(200, { ok: true, registration: parseRegistration(updated) });
      }

      const shareCode = uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase();

      const registration = {
        id: uuidv4(),
        event_slug: EVENT_SLUG,
        user_id: userId,
        team_name: body.team_name.trim(),
        captain_name: players[0],
        players: JSON.stringify(players),
        contact: body.contact.trim(),
        substitute: body.substitute ? String(body.substitute).trim() : null,
        matcherino_link: body.matcherino_link ? String(body.matcherino_link).trim() : null,
        notes: body.notes ? String(body.notes).trim() : null,
        map_preference: body.map_preference ? String(body.map_preference).trim() : null,
        share_code: shareCode,
        created_at: now,
        updated_at: now,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('freescape_registrations')
        .insert([registration])
        .select(
          'id,user_id,team_name,captain_name,players,contact,substitute,matcherino_link,notes,map_preference,share_code,created_at,updated_at'
        )
        .single();

      if (insertError) throw insertError;

      return jsonResponse(200, { ok: true, registration: parseRegistration(inserted) });
    } catch (err) {
      return jsonResponse(500, { ok: false, error: err.message });
    }
  }

  if (event.httpMethod === 'DELETE') {
    try {
      const { error } = await supabase
        .from('freescape_registrations')
        .delete()
        .eq('user_id', userId)
        .eq('event_slug', EVENT_SLUG);

      if (error) throw error;

      return jsonResponse(200, { ok: true });
    } catch (err) {
      return jsonResponse(500, { ok: false, error: err.message });
    }
  }

  return jsonResponse(405, { ok: false, error: 'Méthode non autorisée.' });
};
