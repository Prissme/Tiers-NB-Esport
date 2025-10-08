const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

exports.handler = async (event) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const body = JSON.parse(event.body || '{}');
    const display_name = body.display_name || `Player-${Math.floor(Math.random()*10000)}`;
    
    const newPlayer = {
      id: uuidv4(),
      display_name,
      mmr: 1000,
      weight: 1.0,
      games_played: 0,
      wins: 0,
      losses: 0,
      tier: null,
      active: true
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
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
