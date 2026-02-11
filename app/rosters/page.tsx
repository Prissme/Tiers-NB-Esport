import type { Metadata } from "next";
import SectionHeader from "../components/SectionHeader";
import { getLocale } from "../lib/i18n";
import RostersClient from "./RostersClient";

export const metadata: Metadata = {
  title: "Rosters",
  description: "Toutes les équipes LFN et leurs joueurs.",
};

export default function RostersPage() {
  const locale = getLocale();
  const copy = {
    fr: {
      kicker: "Rosters",
      title: "Teams LFN & joueurs",
      description: "Retrouve chaque équipe engagée en LFN avec son roster complet.",
    },
    en: {
      kicker: "Rosters",
      title: "LFN teams & players",
      description: "Find every team competing in LFN with their full lineup.",
    },
  };
  const content = copy[locale];

  return (
    <div className="page-stack">
      <section className="section-card secondary-section space-y-6">
        <SectionHeader
          kicker={content.kicker}
          title={content.title}
          description={content.description}
          tone="support"
        />
        <RostersClient locale={locale} />
      </section>
    </div>
  );
}
