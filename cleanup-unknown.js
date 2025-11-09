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

async function inspectDatabase() {
  console.log('🔍 Inspection de la base de données...\n');

  try {
    // Récupérer quelques joueurs pour voir la structure
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .limit(3);

    if (error) {
      console.error('❌ Erreur:', error.message);
      console.log('\n💡 Essaye de vérifier dans Supabase > Table Editor > players');
      process.exit(1);
    }

    if (data && data.length > 0) {
      console.log('✅ Colonnes disponibles:');
      console.log(Object.keys(data[0]).join(', '));
      console.log('\n📋 Exemple de données:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('⚠️  Aucune donnée trouvée');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

async function deleteUnknownPlayers() {
  console.log('\n🧹 Suppression des joueurs « Unknown »...\n');

  try {
    // Récupérer TOUS les joueurs
    const { data: allPlayers, error } = await supabase
      .from('players')
      .select('*');

    if (error) {
      throw error;
    }

    console.log(`📊 Total de joueurs: ${allPlayers.length}\n`);

    // Identifier les joueurs à supprimer
    const toDelete = allPlayers.filter(p => {
      // Cas 1: Nom est "Unknown"
      if (p.name === 'Unknown') return true;
      
      // Cas 2: Nom commence par "Unknown_"
      if (p.name && p.name.startsWith('Unknown_')) return true;
      
      // Cas 3: discord_id égale id (fake player)
      if (p.discord_id === p.id) return true;
      
      return false;
    });

    console.log(`🎯 Joueurs à supprimer: ${toDelete.length}`);
    
    if (toDelete.length === 0) {
      console.log('✅ Rien à supprimer !');
      return;
    }

    // Afficher les joueurs à supprimer
    console.log('\n📋 Liste:');
    toDelete.forEach((p, i) => {
      const reason = p.name === 'Unknown' ? 'Unknown' : 
                     p.name?.startsWith('Unknown_') ? 'Unknown_*' : 
                     'discord_id=id';
      console.log(`   ${i + 1}. ${p.name} (${reason})`);
    });

    // Demander confirmation
    console.log('\n⚠️  Suppression en cours...');

    let deleted = 0;
    let failed = 0;

    for (const player of toDelete) {
      const { error: delError } = await supabase
        .from('players')
        .delete()
        .eq('id', player.id);
      
      if (delError) {
        console.error(`❌ Échec: ${player.name} - ${delError.message}`);
        failed++;
      } else {
        deleted++;
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log('📊 RÉSULTAT:');
    console.log(`   ✅ Supprimés: ${deleted}`);
    console.log(`   ❌ Échecs: ${failed}`);
    console.log('═══════════════════════════════════════\n');
    console.log('✨ Nettoyage terminé !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await inspectDatabase();
    await deleteUnknownPlayers();
  } catch (error) {
    console.error('\n❌ Échec du nettoyage:', error.message);
    process.exit(1);
  }
}

main();
