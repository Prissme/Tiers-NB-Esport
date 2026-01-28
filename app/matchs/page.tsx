import type { Metadata } from "next";
import MatchesClient from "./MatchesClient";
import SectionHeader from "../components/SectionHeader";

export const metadata: Metadata = {
  title: "Matchs",
  description: "Calendrier officiel LFN.",
};

export default function MatchsPage() {
  return (
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Matchs"
            title="Planning officiel"
            description="Programme fixe pour la saison."
            tone="dominant"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Infos", detail: "Résultats et statuts en direct." },
            ].map((panel) => (
              <div key={panel.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-utility">{panel.label}</p>
                <p className="mt-3 text-sm text-white">{panel.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="silent-gap" aria-hidden="true" />
      <section className="secondary-section">
        <MatchesClient />
      </section>
    </div>
  );
}
