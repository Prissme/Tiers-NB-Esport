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
  console.log('🧹 Suppression des joueurs « Unknown »...\n');

  try {
    // Méthode 1: Supprimer ceux avec name = "Unknown"
    const { data: deleted1, error: error1 } = await supabase
      .from('players')
      .delete()
      .eq('name', 'Unknown')
      .select('id');

    if (error1) {
      console.error('Erreur lors de la suppression des "Unknown":', error1);
    } else {
      const count1 = deleted1 ? deleted1.length : 0;
      console.log(`✅ ${count1} joueur(s) "Unknown" supprimé(s)`);
    }

    // Méthode 2: Supprimer ceux avec name qui commence par "Unknown_"
    const { data: deleted2, error: error2 } = await supabase
      .from('players')
      .delete()
      .like('name', 'Unknown\\_%')
      .select('id');

    if (error2) {
      console.error('Erreur lors de la suppression des "Unknown_*":', error2);
    } else {
      const count2 = deleted2 ? deleted2.length : 0;
      console.log(`✅ ${count2} joueur(s) "Unknown_*" supprimé(s)`);
    }

    // Méthode 3: Supprimer ceux où discord_id = id (joueurs non authentifiés)
    const { data: allPlayers, error: error3 } = await supabase
      .from('players')
      .select('id, discord_id, name');

    if (error3) {
      console.error('Erreur lors de la récupération des joueurs:', error3);
    } else {
      const fakePlayers = allPlayers.filter(p => p.discord_id === p.id);
      
      if (fakePlayers.length > 0) {
        console.log(`\n🔍 Trouvé ${fakePlayers.length} joueur(s) avec discord_id = id (non authentifiés)`);
        
        for (const player of fakePlayers) {
          const { error: delError } = await supabase
            .from('players')
            .delete()
            .eq('id', player.id);
          
          if (delError) {
            console.error(`❌ Échec suppression ${player.name}:`, delError.message);
          } else {
            console.log(`   ✅ Supprimé: ${player.name} (${player.id})`);
          }
        }
      } else {
        console.log('\n✅ Aucun joueur non authentifié trouvé');
      }
    }

    console.log('\n✨ Nettoyage terminé !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
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
