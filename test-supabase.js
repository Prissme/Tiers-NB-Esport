// test-supabase.js
// Exécutez ce fichier avec: node test-supabase.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Test de connexion Supabase...\n');
console.log('SUPABASE_URL:', SUPABASE_URL ? '✅ Configuré' : '❌ Manquant');
console.log('SUPABASE_KEY:', SUPABASE_KEY ? '✅ Configuré' : '❌ Manquant');
console.log('');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variables d\'environnement manquantes !');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

async function testConnection() {
  try {
    console.log('📡 Test 1: Connexion à Supabase...');
    
    // Test 1: Vérifier si la table existe
    const { data: tables, error: tablesError } = await supabase
      .from('players')
      .select('*')
      .limit(0);
    
    if (tablesError) {
      console.error('❌ Erreur lors de l\'accès à la table "players":');
      console.error('   Code:', tablesError.code);
      console.error('   Message:', tablesError.message);
      console.error('   Détails:', tablesError.details);
      console.error('   Hint:', tablesError.hint);
      
      if (tablesError.code === '42P01') {
        console.error('\n💡 La table "players" n\'existe pas !');
        console.error('   Créez-la dans Supabase avec le SQL fourni.');
      }
      
      if (tablesError.code === 'PGRST301') {
        console.error('\n💡 Problème de politique RLS !');
        console.error('   Vérifiez les politiques dans Supabase.');
      }
      
      return;
    }
    
    console.log('✅ Table "players" accessible\n');
    
    // Test 2: Compter les joueurs
    console.log('📊 Test 2: Comptage des joueurs...');
    const { count, error: countError } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);
    
    if (countError) {
      console.error('❌ Erreur:', countError.message);
      return;
    }
    
    console.log(`✅ Nombre de joueurs actifs: ${count}\n`);
    
    if (count === 0) {
      console.warn('⚠️  Aucun joueur actif dans la base !');
      console.warn('   Ajoutez des joueurs de test avec le SQL fourni.');
      return;
    }
    
    // Test 3: Récupérer le top 5
    console.log('🏆 Test 3: Récupération du Top 5...');
    const { data, error } = await supabase
      .from('players')
      .select('id,display_name,mmr,weight,games_played,wins,losses,active')
      .eq('active', true)
      .order('mmr', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Erreur:', error.message);
      return;
    }
    
    console.log('✅ Top 5 récupéré avec succès:\n');
    data.forEach((player, index) => {
      console.log(`   ${index + 1}. ${player.display_name} - ${player.mmr} MMR (${player.games_played} matchs)`);
    });
    
    console.log('\n✨ Tous les tests ont réussi ! Votre configuration est correcte.');
    
  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

testConnection();
