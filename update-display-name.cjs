// update-display-name.cjs
const { Client } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!SUPABASE_URL || !SUPABASE_KEY || !DISCORD_TOKEN || !GUILD_ID) {
  console.error("ENV manquantes. Vérifie SUPABASE_URL, SUPABASE_KEY, DISCORD_TOKEN, GUILD_ID");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const client = new Client({ intents: ["Guilds", "GuildMembers"] });

client.once("ready", async () => {
  console.log(`✅ Connecté à Discord: ${client.user.tag}`);
  try {
    const { data: players, error } = await supabase
      .from("players")
      .select("discord_id")
      .eq("display_name", "unknown");

    if (error) throw error;
    if (!players || players.length === 0) {
      console.log("Rien à corriger : aucun 'unknown'.");
      return process.exit(0);
    }

    const guild = await client.guilds.fetch(GUILD_ID);
    const members = await guild.members.fetch();

    for (const p of players) {
      const m = members.get(p.discord_id);
      if (!m) {
        console.warn(`⚠️ Membre introuvable: ${p.discord_id}`);
        continue;
      }
      const dn = m.displayName || m.user?.username || "Unknown";
      const { error: updErr } = await supabase
        .from("players")
        .update({ display_name: dn, name: dn })
        .eq("discord_id", p.discord_id);
      if (updErr) console.error(`❌ Maj échouée pour ${p.discord_id}:`, updErr.message);
      else console.log(`🔄 ${p.discord_id} → ${dn}`);
    }
  } catch (e) {
    console.error("Erreur:", e.message);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(DISCORD_TOKEN);
