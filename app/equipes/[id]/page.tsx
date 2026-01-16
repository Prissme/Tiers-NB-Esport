import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PreSeasonBanner from "../../components/PreSeasonBanner";
import SectionHeader from "../../components/SectionHeader";
import { teams } from "../../../src/data";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const team = teams.find((entry) => entry.id === params.id);
  return {
    title: team ? team.name : "Équipe",
    description: "Détails d'équipe et roster de la LFN.",
  };
}

export default function TeamDetailPage({ params }: { params: { id: string } }) {
  const team = teams.find((entry) => entry.id === params.id);
  if (!team) {
    notFound();
  }

  return (
    <div className="space-y-10">
      <section className="motion-field p-8">
        <div className="motion-orb -left-16 top-10 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-0 top-6 h-44 w-44 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Équipe"
            title={team.name}
            description={`Division ${team.division}`}
          />
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader kicker="Roster" title="Effectif" description="Liste officielle." />
        {team.roster.length === 0 ? (
          <PreSeasonBanner message="Roster à confirmer avant le début de la saison." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {team.roster.map((player) => (
              <li
                key={player.name}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <p className="text-sm font-semibold text-white">{player.name}</p>
                {player.role ? <p className="text-xs text-slate-400">{player.role}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Programme"
          title="Calendrier fixe"
          description="Les résultats ne sont pas affichés publiquement."
        />
        <p className="text-sm text-slate-400">
          Consultez le programme officiel pour les horaires fixes des matchs.
        </p>
        <Link
          href="/matchs"
          className="inline-flex items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/10 px-5 py-3 text-xs uppercase tracking-[0.3em] text-amber-200"
        >
          Voir le programme
        </Link>
      </section>
    </div>
  );
}
