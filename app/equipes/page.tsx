import type { Metadata } from "next";
import Button from "../components/Button";
import PreSeasonBanner from "../components/PreSeasonBanner";
import SectionHeader from "../components/SectionHeader";
import TeamsClient from "./TeamsClient";

const DISCORD_INVITE = "https://discord.gg/q6sFPWCKD7";

const teamTiles = [
  { label: "D1", detail: "Élite" },
  { label: "D2", detail: "Challengers" },
  { label: "Rosters", detail: "Publics" },
];

export const metadata: Metadata = {
  title: "Équipes",
  description: "Rosters officiels LFN par division.",
};

export default function EquipesPage() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-12 top-8 h-52 w-52 motion-drift" />
        <div className="motion-orb motion-orb--blue right-0 top-4 h-56 w-56 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Équipes"
            title="Rosters officiels"
            description="Fiches rapides et claires."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {teamTiles.map((tile) => (
              <div key={tile.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{tile.label}</p>
                <p className="mt-3 text-sm text-white">{tile.detail}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href={DISCORD_INVITE} variant="primary" external>
              Inscrire
            </Button>
          </div>
        </div>
      </section>

        <section className="section-card space-y-6">
        <SectionHeader kicker="Équipes" title="Rosters actifs" description="Pré-saison." />
        <PreSeasonBanner message="Rosters en validation. Fiches complétées avant le début de saison." />
        <TeamsClient />
      </section>
    </div>
  );
}
