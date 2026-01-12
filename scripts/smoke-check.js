'use strict';

const { spawn } = require('child_process');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const { loadEnvFile } = require('../load-env');

loadEnvFile({ warn: (message) => console.warn(message) });

const SHOULD_CHECK_WEB = process.env.SMOKE_WEB === '1';
const SHOULD_CHECK_DISCORD = process.env.SMOKE_DISCORD === '1';
const SHOULD_CHECK_SUPABASE_VOTE = process.env.SMOKE_SUPABASE_VOTE === '1';

async function runWebSmoke() {
  console.log('🔎 Smoke web: démarrage du serveur en mode production...');
  const serverPath = path.join(__dirname, '..', 'server.js');
  const serverProcess = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: process.env.SMOKE_WEB_PORT || '4000',
      SKIP_BOT_START: '1'
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 4000));
  serverProcess.kill('SIGTERM');
  console.log('✅ Smoke web: serveur arrêté après vérification rapide.');
}

async function runDiscordSmoke() {
  console.log('🔎 Smoke Discord: tentative de connexion du bot...');
  const { startUnifiedBot } = require('../discord-bot/unified-bot');
  const client = await startUnifiedBot();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await client.destroy();
  console.log('✅ Smoke Discord: connexion et fermeture OK.');
}

async function runSupabaseVoteSmoke() {
  console.log('🔎 Smoke Supabase: test d’insertion vote...');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant pour le smoke test.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  const payload = {
    guild_id: 'smoke-test',
    message_id: `smoke-${Date.now()}`,
    channel_id: 'smoke-channel',
    match_number: 0,
    team1_name: 'Team Smoke A',
    team2_name: 'Team Smoke B',
    match_date: null
  };

  const { data: prediction, error: predictionError } = await supabase
    .from('lfn_predictions')
    .insert(payload)
    .select('id')
    .single();

  if (predictionError) {
    throw predictionError;
  }

  const { error: voteError } = await supabase.from('lfn_prediction_votes').insert({
    prediction_id: prediction.id,
    user_id: 'smoke-user',
    voted_team: 'team1'
  });

  if (voteError) {
    throw voteError;
  }

  await supabase.from('lfn_predictions').delete().eq('id', prediction.id);
  console.log('✅ Smoke Supabase: insertion vote OK.');
}

async function main() {
  if (!SHOULD_CHECK_WEB && !SHOULD_CHECK_DISCORD && !SHOULD_CHECK_SUPABASE_VOTE) {
    console.log('Aucun smoke test demandé (SMOKE_WEB, SMOKE_DISCORD, SMOKE_SUPABASE_VOTE).');
    return;
  }

  if (SHOULD_CHECK_WEB) {
    await runWebSmoke();
  }

  if (SHOULD_CHECK_DISCORD) {
    await runDiscordSmoke();
  }

  if (SHOULD_CHECK_SUPABASE_VOTE) {
    await runSupabaseVoteSmoke();
  }
}

main().catch((error) => {
  console.error('❌ Smoke tests failed:', error);
  process.exit(1);
});
