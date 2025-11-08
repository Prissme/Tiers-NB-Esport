import { Client } from "discord.js";
import { createClient } from "@supabase/supabase-js";

// ✅ Variables récupérées automatiquement depuis Koyeb
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // ajoute celle-ci dans Koyeb
const GUILD_ID = process.env.GUILD_ID; // idem, ajoute ton ID de serveur Discord

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const client = new Client({ intents: ["Guilds", "GuildMembers"] });

client.once("ready", async () => {
  console.log(`✅ Connecté à Discord en tant que ${client.user.tag}`);

  // 🔎 Récupère tous les joueurs avec display_name = "unknown"
  const { data: players, error } = await supabase
    .from("players")
    .select("discord_id")
    .eq("display_name", "unknown");

  if (error) return console.error("Erreur Supabase :", error);
  if (!players.length) return console.log("✅ Aucun joueur 'unknown' trouvé.");

  const guild = await client.guilds.fetch(GUILD_ID);
  const members = await guild.members.fetch();

  for (const player of players) {
    const member = members.get(player.discord_id);
    if (!member) {
      console.log(`❌ Introuvable : ${player.discord_id}`);
      continue;
    }

    const displayName = member.displayName;
    console.log(`🔄 Mise à jour : ${player.discord_id} → ${displayName}`);

    const { error: updateError } = await supabase
      .from("players")
      .update({ display_name: displayName, name: displayName })
      .eq("discord_id", player.discord_id);

    if (updateError) console.error("Erreur maj :", updateError);
  }

  console.log("🎯 Synchronisation terminée !");
  client.destroy();
});

client.login(DISCORD_TOKEN);
