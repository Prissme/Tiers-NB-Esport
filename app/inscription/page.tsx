import { redirect } from "next/navigation";

const DISCORD_INVITE = "https://discord.gg/q6sFPWCKD7";

export default function InscriptionPage() {
  redirect(DISCORD_INVITE);
}
