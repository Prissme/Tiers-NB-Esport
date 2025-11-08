// restore-display-names.cjs
// Script pour restaurer les noms depuis Discord vers Supabase

const { Client, GatewayIntentBits } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

// ⚙️ Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

// Vérifications des variables d'environnement
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Variables manquantes : SUPABASE_URL et SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!DISCORD_TOKEN || !GUILD_ID) {
  console.error("❌ Variables manquantes : DISCORD_TOKEN et GUILD_ID");
  console.error("💡 Ce script nécessite un bot Discord pour fonctionner.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// Timeout de sécurité (30 secondes max)
const TIMEOUT = 30000;
const timeoutId = setTimeout(() => {
  console.error("⏱️ Timeout : le script a pris trop de temps");
  client.destroy();
  process.exit(1);
}, TIMEOUT);

client.once("ready", async () => {
  console.log(`✅ Bot connecté : ${client.user.tag}`);
  console.log(`📡 Serveur cible : ${GUILD_ID}\n`);

  try {
    // 1️⃣ Récupérer les joueurs avec un nom "Unknown"
    const { data: players, error: fetchError } = await supabase
      .from("players")
      .select("id, discord_id, name")
      .or("name.eq.Unknown,name.ilike.Unknown_%");

    if (fetchError) throw fetchError;

    if (!players || players.length === 0) {
      console.log("✅ Aucun joueur à corriger !");
      clearTimeout(timeoutId);
      client.destroy();
      process.exit(0);
    }

    console.log(`📋 ${players.length} joueur(s) à corriger\n`);

    // 2️⃣ Récupérer les membres du serveur Discord
    const guild = await client.guilds.fetch(GUILD_ID);
    console.log(`🏰 Serveur : ${guild.name}`);
    
    const members = await guild.members.fetch();
    console.log(`👥 ${members.size} membres récupérés\n`);

    let updated = 0;
    let notFound = 0;
    let errors = 0;

    // 3️⃣ Pour chaque joueur, trouver son pseudo Discord
    for (const player of players) {
      const member = members.get(player.discord_id);

      if (!member) {
        console.log(`⚠️  Introuvable : ${player.discord_id} (ID: ${player.id})`);
        notFound++;
        continue;
      }

      // Utiliser displayName (pseudo serveur) ou username (pseudo global)
      const newName = member.displayName || member.user.username;

      // Éviter de mettre à jour avec "Unknown" à nouveau
      if (!newName || newName === "Unknown" || newName.startsWith("Unknown_")) {
        console.log(`⚠️  Pseudo invalide pour ${player.discord_id} : "${newName}"`);
        errors++;
        continue;
      }

      console.log(`🔄 ${player.discord_id} → "${newName}"`);

      // 4️⃣ Mettre à jour Supabase
      const { error: updateError } = await supabase
        .from("players")
        .update({
          name: newName
        })
        .eq("discord_id", player.discord_id);

      if (updateError) {
        console.error(`❌ Échec pour ${player.discord_id} : ${updateError.message}`);
        errors++;
      } else {
        updated++;
      }
    }

    // 5️⃣ Résumé
    console.log("\n" + "═".repeat(50));
    console.log("📊 RÉSUMÉ DE LA RESTAURATION");
    console.log("═".repeat(50));
    console.log(`✅ Mis à jour    : ${updated}`);
    console.log(`⚠️  Non trouvés  : ${notFound}`);
    console.log(`❌ Erreurs       : ${errors}`);
    console.log(`📝 Total traité : ${players.length}`);
    console.log("═".repeat(50) + "\n");

    if (updated > 0) {
      console.log("🎉 Restauration terminée avec succès !");
    } else {
      console.log("⚠️  Aucune mise à jour effectuée.");
    }

  } catch (err) {
    console.error("❌ Erreur fatale :", err.message);
    console.error(err);
    clearTimeout(timeoutId);
    client.destroy();
    process.exit(1);
  }

  clearTimeout(timeoutId);
  client.destroy();
  process.exit(0);
});

client.on("error", (error) => {
  console.error("❌ Erreur Discord :", error);
  clearTimeout(timeoutId);
  process.exit(1);
});

console.log("🔌 Connexion au bot Discord...");
client.login(DISCORD_TOKEN).catch((error) => {
  console.error("❌ Échec de connexion Discord :", error.message);
  clearTimeout(timeoutId);
  process.exit(1);
});
