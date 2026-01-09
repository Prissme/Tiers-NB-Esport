import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PreSeasonBanner from "../../components/PreSeasonBanner";
import SectionHeader from "../../components/SectionHeader";
import StatusBadge from "../../components/StatusBadge";
import { getMatchById, getTeamById } from "../../../src/data";

const formatMatchDateTime = (dateISO: string) => {
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) return dateISO;
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatMatchTime = (dateISO: string) => {
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const match = getMatchById(params.id);
  if (!match) {
    return { title: "Match" };
  }
  const teamA = getTeamById(match.teamAId);
  const teamB = getTeamById(match.teamBId);
  return {
    title: `${teamA?.name ?? match.teamAId} vs ${teamB?.name ?? match.teamBId}`,
    description: `Détails du match ${match.division}. Statut: ${match.status}.`,
  };
}

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  const match = getMatchById(params.id);
  if (!match) {
    notFound();
  }
  const teamA = getTeamById(match.teamAId);
  const teamB = getTeamById(match.teamBId);

  return (
    <div className="space-y-10">
      <section className="motion-field p-8">
        <div className="motion-orb -left-16 top-10 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-0 top-6 h-44 w-44 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Match"
            title={`${teamA?.name ?? match.teamAId} vs ${teamB?.name ?? match.teamBId}`}
            description={`${match.division} · ${formatMatchDateTime(match.dateISO)} · ${formatMatchTime(
              match.dateISO
            )}`}
          />
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
            <StatusBadge status={match.status} />
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-200">
              {match.division}
            </span>
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Résumé"
          title="Détails du match"
          description="Informations officielles et statuts." 
        />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Statut</p>
            <p className="mt-3 text-sm text-white">
              {match.status === "finished" ? "Terminé" : match.status === "live" ? "Live" : "À venir"}
            </p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Score</p>
            <p className="mt-3 text-sm text-white">
              {match.status === "finished" ? `${match.scoreA ?? "-"} - ${match.scoreB ?? "-"}` : "À venir"}
            </p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Division</p>
            <p className="mt-3 text-sm text-white">{match.division}</p>
          </div>
        </div>
        {match.status !== "finished" ? (
          <PreSeasonBanner message="Match planifié — les résultats seront publiés après validation." />
        ) : null}
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Preuve"
          title="Preuves & reporting"
          description="Espace prévu pour les captures et la remontée de score." 
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            {match.proofUrl ? (
              <a href={match.proofUrl} className="text-amber-200" target="_blank" rel="noreferrer">
                Voir la preuve
              </a>
            ) : (
              <p>Preuve à venir.</p>
            )}
          </div>
          <Link
            href="/report"
            className="rounded-full border border-amber-300/40 bg-amber-400/10 px-5 py-3 text-center text-xs uppercase tracking-[0.3em] text-amber-200"
          >
            Reporter un score
          </Link>
        </div>
      </section>
    </div>
  );
}
