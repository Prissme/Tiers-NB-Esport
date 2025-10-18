const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

exports.handler = async (event) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const body = JSON.parse(event.body || '{}');
    const authHeader = event.headers.authorization || event.headers.Authorization;

    const basePlayer = {
      profile_image_url: body.profile_image_url || null,
      bio: body.bio || null,
      recent_scrims: JSON.stringify(Array.isArray(body.recent_scrims) ? body.recent_scrims : []),
      social_links: body.social_links ? JSON.stringify(body.social_links) : null
    };

    if (!authHeader) {
      const display_name = body.display_name || `Player-${Math.floor(Math.random() * 10000)}`;

      const newPlayer = {
        id: uuidv4(),
        display_name,
        mmr: 1000,
        weight: 1.0,
        games_played: 0,
        wins: 0,
        losses: 0,
        tier: null,
        active: true,
        ...basePlayer
      };

      const { error } = await supabase.from('players').insert([newPlayer]);
      if (error) throw error;

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ ok: true, player: newPlayer })
      };
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: 'Jeton invalide.' })
      };
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: 'Utilisateur non authentifié.' })
      };
    }

    const userId = authData.user.id;
    const display_name = body.display_name || authData.user.user_metadata?.display_name || `Player-${Math.floor(Math.random() * 10000)}`;

    const { data: existing, error: existingError } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      const updates = {
        display_name,
        ...basePlayer,
        updated_at: new Date().toISOString()
      };

      const { error: updateError, data: updated } = await supabase
        .from('players')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ ok: true, player: updated })
      };
    }

    const newPlayer = {
      id: uuidv4(),
      user_id: userId,
      display_name,
      mmr: 1000,
      weight: 1.0,
      games_played: 0,
      wins: 0,
      losses: 0,
      tier: null,
      active: true,
      ...basePlayer,
      created_at: new Date().toISOString()
    };

    const { data: created, error } = await supabase
      .from('players')
      .insert([newPlayer])
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ ok: true, player: created })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
