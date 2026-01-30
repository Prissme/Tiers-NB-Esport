import type { Metadata } from "next";
import Button from "../components/Button";
import SectionHeader from "../components/SectionHeader";
import TeamsClient from "./TeamsClient";
import { getLocale } from "../lib/i18n";

const INSCRIPTION_PATH = "/inscription";

export const metadata: Metadata = {
  title: "Équipes",
  description: "Rosters officiels LFN par division.",
};

export default function EquipesPage() {
  const locale = getLocale();
  const copy = {
    fr: {
      kicker: "Équipes",
      title: "Rosters officiels",
      description: "Fiches rapides et claires.",
      tiles: [
        { label: "D1", detail: "Élite" },
        { label: "D2", detail: "Challengers" },
        { label: "Rosters", detail: "Publics" },
      ],
      signup: "S'inscrire",
      activeTitle: "Rosters actifs",
      activeDescription: "Pré-saison.",
    },
    en: {
      kicker: "Teams",
      title: "Official rosters",
      description: "Quick, clear cards.",
      tiles: [
        { label: "D1", detail: "Elite" },
        { label: "D2", detail: "Challengers" },
        { label: "Rosters", detail: "Public" },
      ],
      signup: "Sign up",
      activeTitle: "Active rosters",
      activeDescription: "Pre-season.",
    },
  };
  const content = copy[locale];
  return (
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker={content.kicker}
            title={content.title}
            description={content.description}
            tone="dominant"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {content.tiles.map((tile) => (
              <div key={tile.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-utility">{tile.label}</p>
                <p className="mt-3 text-sm text-white">{tile.detail}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href={INSCRIPTION_PATH} variant="primary" className="signup-button">
              {content.signup}
            </Button>
          </div>
        </div>
      </section>
      <div className="silent-gap" aria-hidden="true" />
      <section className="section-card secondary-section space-y-6">
        <SectionHeader
          kicker={content.kicker}
          title={content.activeTitle}
          description={content.activeDescription}
          tone="support"
        />
        <TeamsClient locale={locale} />
      </section>
    </div>
  );
}
