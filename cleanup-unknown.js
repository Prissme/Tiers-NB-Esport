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

async function deleteUnknownPlayers() {
  console.log('🧹 Suppression des joueurs « Unknown »...');

  const filters = ['name.eq.Unknown', "name.like.Unknown\\_%"];

  const response = await supabase
    .from('players')
    .delete()
    .or(filters.join(','))
    .select('id');

  if (response.error) {
    throw response.error;
  }

  const deleted = Array.isArray(response.data) ? response.data.length : 0;
  console.log(`✅ ${deleted} joueur(s) supprimé(s).`);
}

async function main() {
  try {
    await deleteUnknownPlayers();
  } catch (error) {
    console.error('❌ Échec du nettoyage:', error.message);
    process.exit(1);
  }
}

main();
