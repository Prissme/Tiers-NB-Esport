const { Client } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

// ⚙️ Config depuis tes variables Koyeb
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

// Vérifications
if (!SUPABASE_URL || !SUPABASE_KEY || !DISCORD_TOKEN || !GUILD_ID) {
  console.error("❌ Variables manquantes : SUPABASE_URL, SUPABASE_KEY, DISCORD_TOKEN, GUILD_ID");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const client = new Client({ intents: ["Guilds", "GuildMembers"] });

client.once("ready", async () => {
  console.log(`✅ Connecté à Discord en tant que ${client.user.tag}`);

  try {
    // 1️⃣ Récupérer les joueurs 'unknown'
    const { data: players, error } = await supabase
      .from("players")
      .select("id, discord_id, display_name")
      .or("display_name.eq.Unknown,display_name.ilike.Unknown%");

    if (error) throw error;
    if (!players?.length) {
      console.log("✅ Aucun joueur à corriger !");
      process.exit(0);
    }

    console.log(`📋 ${players.length} joueurs à corriger.\n`);

    const guild = await client.guilds.fetch(GUILD_ID);
    const members = await guild.members.fetch();

    let updated = 0,
      notFound = 0;

    for (const player of players) {
      const member = members.get(player.discord_id);
      if (!member) {
        console.log(`⚠️  Introuvable sur Discord : ${player.discord_id}`);
        notFound++;
        continue;
      }

      const newName = member.displayName;
      console.log(`🔄 Mise à jour : ${player.discord_id} → ${newName}`);

      const { error: updateError } = await supabase
        .from("players")
        .update({
          display_name: newName,
          name: newName,
        })
        .eq("discord_id", player.discord_id);

      if (updateError) {
        console.error(`❌ Échec pour ${player.discord_id} : ${updateError.message}`);
      } else {
        updated++;
      }
    }

    console.log("\n📊 Résumé :");
    console.log(`✅ Mis à jour : ${updated}`);
    console.log(`❌ Introuvables : ${notFound}`);
    console.log("🎯 Terminé !");
  } catch (err) {
    console.error("Erreur :", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(DISCORD_TOKEN);
