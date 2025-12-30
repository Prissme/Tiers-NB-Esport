"use client";

import { useMemo, useState } from "react";
import type { Division, LfnMatch, LfnResult } from "../lib/types";
import EmptyState from "../components/EmptyState";

const filters: { label: string; value: "all" | Division }[] = [
  { label: "Toutes divisions", value: "all" },
  { label: "Division 1", value: "D1" },
  { label: "Division 2", value: "D2" },
];

type MatchesClientProps = {
  matches: LfnMatch[];
  results: LfnResult[];
  timezoneLabel: string;
  discordLink?: string;
};

export default function MatchesClient({
  matches,
  results,
  timezoneLabel,
  discordLink,
}: MatchesClientProps) {
  const [filter, setFilter] = useState<"all" | Division>("all");
  const matchById = useMemo(() => new Map(matches.map((match) => [match.id, match])), [matches]);

  const filteredMatches = useMemo(() => {
    if (filter === "all") {
      return matches;
    }
    return matches.filter((match) => match.division === filter);
  }, [matches, filter]);

  const filteredResults = useMemo(() => {
    const withScores = results.filter(
      (result) => result.scoreA !== null && result.scoreB !== null
    );
    if (filter === "all") {
      return withScores;
    }
    return withScores.filter((result) => matchById.get(result.matchId)?.division === filter);
  }, [results, filter, matchById]);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        {filters.map((item) => {
          const isActive = item.value === filter;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                isActive
                  ? "bg-emerald-300 text-slate-900"
                  : "border border-white/10 bg-white/5 text-slate-200 hover:border-white/30"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <section className="section-card space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/80">Matchs</p>
          <h2 className="text-2xl font-semibold text-white md:text-3xl">Prochains matchs</h2>
          <p className="text-sm text-slate-300 md:text-base">
            Tous les horaires affichés en heure de Bruxelles ({timezoneLabel}).
          </p>
        </div>
        {filteredMatches.length === 0 ? (
          <EmptyState
            title="Aucun match annoncé"
            description="Le planning sera publié ici dès validation officielle."
            ctaLabel={discordLink ? "Suivre les annonces" : undefined}
            ctaHref={discordLink || undefined}
            secondaryLabel="Voir comment participer"
            secondaryHref="/participer"
            badge="Planning"
          />
        ) : (
          <div className="grid gap-4">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-white">
                    {match.teamA || "Équipe à annoncer"} vs {match.teamB || "Équipe à annoncer"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {match.date || "date à annoncer"} · {match.time || "heure à annoncer"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="rounded-full border border-white/10 px-2 py-1">{match.division}</span>
                  <span>BO{match.bo}</span>
                  <span>Bruxelles</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section-card space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/80">Résultats</p>
          <h2 className="text-2xl font-semibold text-white md:text-3xl">Derniers scores</h2>
          <p className="text-sm text-slate-300 md:text-base">
            Résultats validés par l&apos;orga. Les scores s&apos;affichent dès validation.
          </p>
        </div>
        {filteredResults.length === 0 ? (
          <EmptyState
            title="Aucun résultat officiel"
            description="Les scores publiés apparaîtront ici après les matchs."
            ctaLabel="Voir les prochains matchs"
            ctaHref="/matchs"
            secondaryLabel={discordLink ? "Suivre les annonces" : undefined}
            secondaryHref={discordLink || undefined}
            badge="Scores"
          />
        ) : (
          <div className="grid gap-4">
            {filteredResults.map((result) => {
              const match = matchById.get(result.matchId);
              return (
                <div
                  key={result.matchId}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-white">
                      {match?.teamA || "Équipe à annoncer"} {result.scoreA ?? "-"} - {result.scoreB ?? "-"} {match?.teamB || "Équipe à annoncer"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {match?.date || "date à annoncer"} · BO{match?.bo ?? "-"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="rounded-full border border-white/10 px-2 py-1">
                      {match?.division || "Division"}
                    </span>
                    <span>Bruxelles</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
