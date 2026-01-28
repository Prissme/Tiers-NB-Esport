import type { Metadata } from "next";
import MatchesClient from "./MatchesClient";
import SectionHeader from "../components/SectionHeader";

export const metadata: Metadata = {
  title: "Matchs",
  description: "Calendrier officiel LFN.",
};

export default function MatchsPage() {
  return (
    <div className="space-y-12">
      <section className="surface-dominant">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Matchs"
            title="Planning officiel"
            description="Programme fixe pour la saison."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Programme", detail: "Calendrier officiel depuis Supabase." },
              { label: "Play-offs", detail: "Phase finale visible ci-dessous." },
              { label: "Infos", detail: "Résultats et statuts en direct." },
            ].map((panel) => (
              <div key={panel.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{panel.label}</p>
                <p className="mt-3 text-sm text-white">{panel.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MatchesClient />
    </div>
  );
}
