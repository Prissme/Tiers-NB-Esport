"use client";

import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import MetricCard from "../components/MetricCard";
import SectionHeader from "../components/SectionHeader";
import Tag from "../components/Tag";
import type { Division, LfnMatch, LfnResult } from "../lib/types";

const filters: { label: string; value: "all" | Division }[] = [
  { label: "Toutes divisions", value: "all" },
  { label: "Division 1", value: "D1" },
  { label: "Division 2", value: "D2" },
];

type MatchesClientProps = {
  matches: LfnMatch[];
  results: LfnResult[];
  timezoneLabel: string;
};

export default function MatchesClient({
  matches,
  results,
  timezoneLabel,
}: MatchesClientProps) {
  const [filter, setFilter] = useState<"all" | Division>("all");
  const matchById = useMemo(() => new Map(matches.map((match) => [match.id, match])), [matches]);
  const resultByMatchId = useMemo(() => {
    return new Map(
      results
        .filter((result) => result.scoreA !== null && result.scoreB !== null)
        .map((result) => [result.matchId, result])
    );
  }, [results]);

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

  const upcomingMatches = useMemo(() => {
    return filteredMatches.filter((match) => !resultByMatchId.has(match.id));
  }, [filteredMatches, resultByMatchId]);

  const groupByDate = (list: LfnMatch[]) =>
    list.reduce<Record<string, LfnMatch[]>>((acc, match) => {
      const key = match.date || "Non communiqué";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(match);
      return acc;
    }, {});

  const groupedUpcoming = useMemo(() => groupByDate(upcomingMatches), [upcomingMatches]);
  const groupedResults = useMemo(() => {
    return filteredResults.reduce<Record<string, LfnResult[]>>((acc, result) => {
      const match = matchById.get(result.matchId);
      const key = match?.date || "Non communiqué";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(result);
      return acc;
    }, {});
  }, [filteredResults, matchById]);

  return (
    <div className="space-y-12">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Matchs"
          title="Calendrier et scores"
          description={`Tous les horaires sont affichés en heure de Bruxelles (${timezoneLabel}).`}
        />
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
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Matchs à venir"
            value={`${upcomingMatches.length}`}
            detail="Affichés en temps réel après validation."
          />
          <MetricCard
            label="Scores validés"
            value={`${filteredResults.length}`}
            detail="Résultats confirmés par l'organisation."
          />
          <MetricCard
            label="Division"
            value={filter === "all" ? "Toutes" : filter}
            detail="Filtrage actif sur cette section."
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Tag label="Planning" />
          <Tag label="Scores officiels" />
          <Tag label="BO en cours" />
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader kicker="Planning" title="Prochains matchs" />
        {upcomingMatches.length === 0 ? (
          <EmptyState
            title="Aucun match annoncé"
            description="Le planning sera publié ici dès validation officielle."
            secondaryLabel="Voir comment participer"
            secondaryHref="/participer"
            badge="Planning"
          />
        ) : (
          <div className="grid gap-6">
            {Object.entries(groupedUpcoming).map(([date, list]) => (
              <div key={date} className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{date}</p>
                <div className="grid gap-4">
                  {list.map((match) => (
                    <div
                      key={match.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-white">
                          {match.teamA || "Non communiqué"} vs {match.teamB || "Non communiqué"}
                        </span>
                        <span className="text-xs text-slate-400">{match.time || "Non communiqué"}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="rounded-full border border-white/10 px-2 py-1">
                          {match.division}
                        </span>
                        <span>BO{match.bo}</span>
                        <span>À venir</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Résultats"
          title="Derniers scores"
          description="Scores validés et reportings officiels après chaque match."
        />
        {filteredResults.length === 0 ? (
          <EmptyState
            title="Aucun résultat officiel"
            description="Les scores publiés apparaîtront ici après les matchs."
            ctaLabel="Voir les prochains matchs"
            ctaHref="/matchs"
            badge="Scores"
          />
        ) : (
          <div className="grid gap-6">
            {Object.entries(groupedResults).map(([date, list]) => (
              <div key={date} className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{date}</p>
                <div className="grid gap-4">
                  {list.map((result) => {
                    const match = matchById.get(result.matchId);
                    return (
                      <div
                        key={result.matchId}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-white">
                            {match?.teamA || "Non communiqué"} {result.scoreA ?? "-"} - {result.scoreB ?? "-"} {match?.teamB || "Non communiqué"}
                          </span>
                          <span className="text-xs text-slate-400">BO{match?.bo ?? "-"}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="rounded-full border border-white/10 px-2 py-1">
                            {match?.division || "Division"}
                          </span>
                          <span>Terminé</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
