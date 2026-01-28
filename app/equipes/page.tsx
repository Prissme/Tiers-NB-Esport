import type { Metadata } from "next";
import Button from "../components/Button";
import PreSeasonBanner from "../components/PreSeasonBanner";
import SectionHeader from "../components/SectionHeader";
import TeamsClient from "./TeamsClient";

const INSCRIPTION_PATH = "/inscription";

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
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Équipes"
            title="Rosters officiels"
            description="Fiches rapides et claires."
            tone="dominant"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {teamTiles.map((tile) => (
              <div key={tile.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-utility">{tile.label}</p>
                <p className="mt-3 text-sm text-white">{tile.detail}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href={INSCRIPTION_PATH} variant="primary">
              S&apos;inscrire
            </Button>
          </div>
        </div>
      </section>
      <div className="silent-gap" aria-hidden="true" />
      <section className="section-card secondary-section space-y-6">
        <SectionHeader
          kicker="Équipes"
          title="Rosters actifs"
          description="Pré-saison."
          tone="support"
        />
        <PreSeasonBanner message="Rosters en validation. Fiches complétées avant le début de saison." />
        <TeamsClient />
      </section>
    </div>
  );
}
