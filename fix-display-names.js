// fix-display-names.js
// Script pour restaurer les noms depuis le CSV ou depuis Discord

const fs = require('fs');
const path = require('path');
require('./ensure-fetch');

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const CSV_PATH = path.join(__dirname, 'players_rows.csv');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variables manquantes: SUPABASE_URL et SUPABASE_KEY requises');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

// Parser CSV simple
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  const players = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',');
    const player = {};
    
    headers.forEach((header, index) => {
      player[header.trim()] = values[index] ? values[index].trim() : '';
    });

    players.push(player);
  }

  return players;
}

async function fixDisplayNames() {
  console.log('🔧 Correction des noms depuis le CSV...\n');

  try {
    // Lire le CSV
    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    const csvPlayers = parseCSV(csvContent);
    
    console.log(`📄 ${csvPlayers.length} joueurs trouvés dans le CSV\n`);

    // Récupérer tous les joueurs de la DB
    const { data: dbPlayers, error: fetchError } = await supabase
      .from('players')
      .select('id, discord_id, name');

    if (fetchError) {
      throw new Error(`Erreur DB: ${fetchError.message}`);
    }

    console.log(`💾 ${dbPlayers.length} joueurs trouvés dans la base\n`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const dbPlayer of dbPlayers) {
      // Chercher le joueur correspondant dans le CSV par ID ou discord_id
      const csvPlayer = csvPlayers.find(
        p => p.id === dbPlayer.id || p.discord_id === dbPlayer.discord_id
      );

      if (!csvPlayer) {
        console.log(`⚠️  Joueur non trouvé dans CSV: ${dbPlayer.id}`);
        skipped++;
        continue;
      }

      // Vérifier si le nom est "Unknown" ou contient "Unknown_"
      const needsUpdate =
        dbPlayer.name === 'Unknown' ||
        dbPlayer.name?.startsWith('Unknown_') ||
        !dbPlayer.name;

      if (!needsUpdate) {
        console.log(`✓ ${dbPlayer.name} - déjà correct`);
        skipped++;
        continue;
      }

      // Utiliser le nom du CSV
      const newName = csvPlayer.name || 'Unknown';

      if (newName === 'Unknown' || newName.startsWith('Unknown_')) {
        console.log(`⚠️  Pas de nom valide dans CSV pour: ${dbPlayer.id}`);
        skipped++;
        continue;
      }

      // Mettre à jour
      const { error: updateError } = await supabase
        .from('players')
        .update({
          name: newName
        })
        .eq('id', dbPlayer.id);

      if (updateError) {
        console.error(`❌ Échec pour ${dbPlayer.id}: ${updateError.message}`);
        failed++;
      } else {
        console.log(`✅ ${dbPlayer.id} → "${newName}"`);
        updated++;
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log('📊 RÉSULTAT:');
    console.log(`   ✅ Mis à jour: ${updated}`);
    console.log(`   ⏭️  Ignorés: ${skipped}`);
    console.log(`   ❌ Échecs: ${failed}`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

// Exécution
fixDisplayNames().then(() => {
  console.log('✨ Correction terminée!');
  process.exit(0);
});
