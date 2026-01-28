import type { Metadata } from "next";
import Link from "next/link";
import SectionHeader from "../../components/SectionHeader";

export const metadata: Metadata = {
  title: "Match",
  description: "Programme fixe LFN.",
};

export default function MatchDetailPage() {
  return (
    <div className="space-y-10">
      <section className="surface-dominant">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Match"
            title="Détails indisponibles"
            description="Programme public fixe, sans résultats."
          />
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Programme"
          title="Consulter le planning"
          description="Horaires fixes par journée."
        />
        <Link
          href="/matchs"
          className="inline-flex items-center justify-center rounded-full bg-white/10 px-5 py-3 text-xs uppercase tracking-[0.3em] text-slate-200"
        >
          Voir le calendrier
        </Link>
      </section>
    </div>
  );
}
