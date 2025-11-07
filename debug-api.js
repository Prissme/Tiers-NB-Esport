// debug-api.js
// Exécutez avec: node debug-api.js

const fs = require('fs');
const path = require('path');
const http = require('http');

// Charger le .env
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  try {
    const buffer = fs.readFileSync(envPath, 'utf8');
    buffer
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .forEach((line) => {
        const separatorIndex = line.indexOf('=');
        if (separatorIndex === -1) return;
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
          process.env[key] = value;
        }
      });
    console.log('✅ Fichier .env chargé\n');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('⚠️  Fichier .env introuvable\n');
    } else {
      console.warn('⚠️  Erreur lecture .env:', error.message, '\n');
    }
  }
}

loadEnv();

console.log('🔍 DIAGNOSTIC DE L\'APPLICATION NULLS BRAWL RANKING\n');
console.log('═══════════════════════════════════════════════════\n');

// 1. Vérification des variables d'environnement
console.log('📋 VARIABLES D\'ENVIRONNEMENT:');
console.log('─────────────────────────────────');

const requiredVars = {
  'SUPABASE_URL': process.env.SUPABASE_URL,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY,
  'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY,
  'ADMIN_USER_IDS': process.env.ADMIN_USER_IDS,
  'PORT': process.env.PORT || '3000'
};

let missingVars = [];
for (const [key, value] of Object.entries(requiredVars)) {
  const status = value ? '✅' : '❌';
  const display = value 
    ? (key.includes('KEY') ? `${value.substring(0, 20)}...` : value)
    : 'NON DÉFINI';
  console.log(`${status} ${key}: ${display}`);
  
  if (!value && key !== 'ADMIN_USER_IDS' && key !== 'PORT') {
    missingVars.push(key);
  }
}

console.log('');

if (missingVars.length > 0) {
  console.error('❌ VARIABLES MANQUANTES:', missingVars.join(', '));
  console.error('');
  console.error('💡 Action requise:');
  console.error('   1. Créez un fichier .env à la racine du projet');
  console.error('   2. Ajoutez ces variables avec vos vraies valeurs:');
  console.error('');
  console.error('   SUPABASE_URL=https://votre-projet.supabase.co');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role');
  console.error('   SUPABASE_ANON_KEY=votre-cle-anon');
  console.error('   ADMIN_USER_IDS=id-discord-1,id-discord-2');
  console.error('');
  process.exit(1);
}

// 2. Test de connexion Supabase
console.log('📡 TEST DE CONNEXION SUPABASE:');
console.log('─────────────────────────────────');

async function testSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabase = createClient(
    requiredVars.SUPABASE_URL,
    requiredVars.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  
  try {
    console.log('Tentative de connexion...');
    
    const { data, error } = await supabase
      .from('players')
      .select('id,display_name,mmr,active')
      .eq('active', true)
      .order('mmr', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Erreur Supabase:', error.message);
      console.error('   Code:', error.code);
      
      if (error.code === '42P01') {
        console.error('\n💡 La table "players" n\'existe pas!');
        console.error('   Exécutez le SQL de création dans Supabase:');
        console.error('   https://supabase.com/dashboard/project/_/editor');
      } else if (error.code === 'PGRST301') {
        console.error('\n💡 Problème de politique RLS!');
        console.error('   Désactivez RLS ou ajoutez une politique pour service_role.');
      }
      
      return false;
    }
    
    console.log('✅ Connexion réussie!');
    console.log(`   ${data.length} joueurs trouvés dans le top 5`);
    
    if (data.length > 0) {
      console.log('\n   Exemple de données:');
      data.slice(0, 2).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.display_name} - ${p.mmr} MMR`);
      });
    } else {
      console.warn('\n⚠️  Aucun joueur actif dans la base!');
    }
    
    console.log('');
    return true;
    
  } catch (err) {
    console.error('❌ Erreur inattendue:', err.message);
    return false;
  }
}

// 3. Test du serveur local
async function testServer() {
  console.log('🌐 TEST DU SERVEUR LOCAL:');
  console.log('─────────────────────────────────');
  
  const { createServer } = require('./server');
  const server = createServer();
  const port = 3001;
  
  return new Promise((resolve) => {
    server.listen(port, async () => {
      console.log(`✅ Serveur démarré sur le port ${port}`);
      
      // Test de l'API
      console.log('   Test de l\'endpoint /api/getTop50...');
      
      const req = http.request({
        hostname: 'localhost',
        port: port,
        path: '/api/getTop50',
        method: 'GET'
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            
            if (data.ok && Array.isArray(data.top)) {
              console.log(`   ✅ API fonctionne! ${data.top.length} joueurs retournés`);
              
              if (data.top.length > 0) {
                console.log('\n   Aperçu des données:');
                data.top.slice(0, 3).forEach((p, i) => {
                  console.log(`   #${i + 1} ${p.display_name} - ${p.mmr} MMR - Tier ${p.tier}`);
                });
              }
            } else {
              console.error('   ❌ API erreur:', data.error || 'format invalide');
            }
          } catch (err) {
            console.error('   ❌ Réponse invalide:', body);
          }
          
          server.close(() => {
            console.log('');
            resolve();
          });
        });
      });
      
      req.on('error', (err) => {
        console.error('   ❌ Erreur requête:', err.message);
        server.close(() => resolve());
      });
      
      req.end();
    });
    
    server.on('error', (err) => {
      console.error('❌ Impossible de démarrer le serveur:', err.message);
      resolve();
    });
  });
}

// 4. Instructions pour Koyeb
function showKoyebInstructions() {
  console.log('🚀 DÉPLOIEMENT SUR KOYEB:');
  console.log('─────────────────────────────────');
  console.log('Pour que votre app fonctionne sur Koyeb, configurez ces variables:');
  console.log('');
  console.log('1. Allez dans votre dashboard Koyeb');
  console.log('2. Sélectionnez votre service');
  console.log('3. Allez dans Settings > Environment variables');
  console.log('4. Ajoutez:');
  console.log('');
  console.log('   Variable name          | Value (à remplacer)');
  console.log('   ─────────────────────────────────────────────────');
  console.log('   SUPABASE_URL           | https://xxx.supabase.co');
  console.log('   SUPABASE_SERVICE_ROLE_KEY | eyJhbGc...(votre clé)');
  console.log('   SUPABASE_ANON_KEY      | eyJhbGc...(votre clé anon)');
  console.log('   ADMIN_USER_IDS         | 123456789,987654321');
  console.log('');
  console.log('5. Redéployez le service');
  console.log('');
  console.log('💡 Où trouver les clés Supabase:');
  console.log('   Project Settings > API > Project API keys');
  console.log('');
}

// Exécution
(async () => {
  const supabaseOk = await testSupabase();
  
  if (supabaseOk) {
    await testServer();
  }
  
  showKoyebInstructions();
  
  console.log('═══════════════════════════════════════════════════');
  console.log('✨ Diagnostic terminé!');
  console.log('');
})();
