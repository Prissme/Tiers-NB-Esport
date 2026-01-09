"use client";

import { useMemo, useState } from "react";
import MatchCard from "../components/MatchCard";
import PreSeasonBanner from "../components/PreSeasonBanner";
import SectionHeader from "../components/SectionHeader";
import { matches, teams } from "../../src/data";

const divisionOptions = [
  { label: "Toutes", value: "all" },
  { label: "D1", value: "D1" },
  { label: "D2", value: "D2" },
];

const statusOptions = [
  { label: "Tous", value: "all" },
  { label: "À venir", value: "scheduled" },
  { label: "Live", value: "live" },
  { label: "Terminé", value: "finished" },
];

export default function MatchesClient() {
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { filteredMatches, groupedMatches } = useMemo(() => {
    const filtered = matches
      .filter((match) => {
        const divisionMatch = divisionFilter === "all" || match.division === divisionFilter;
        const statusMatch = statusFilter === "all" || match.status === statusFilter;
        return divisionMatch && statusMatch;
      })
      .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());

    const grouped = filtered.reduce<Record<string, typeof matches>>((acc, match) => {
      const date = new Date(match.dateISO);
      const label = Number.isNaN(date.getTime())
        ? match.dateISO
        : date.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          });
      if (!acc[label]) acc[label] = [];
      acc[label].push(match);
      return acc;
    }, {});

    return { filteredMatches: filtered, groupedMatches: grouped };
  }, [divisionFilter, statusFilter]);

  const hasFinishedMatches = matches.some((match) => match.status === "finished");

  return (
    <section className="section-card space-y-6">
      <SectionHeader
        kicker="Matchs"
        title="Calendrier officiel"
        description="Suivi en direct, à venir et résultats officiels."
      />

      {!hasFinishedMatches ? (
        <PreSeasonBanner message="Pré-saison — les matchs officiels arrivent bientôt." />
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
        <span>Division</span>
        <div className="flex flex-wrap gap-2">
          {divisionOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDivisionFilter(option.value)}
              className={`rounded-full border px-3 py-2 text-[11px] transition ${
                divisionFilter === option.value
                  ? "border-amber-300/50 bg-amber-400/10 text-amber-100"
                  : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="ml-4">Statut</span>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={`rounded-full border px-3 py-2 text-[11px] transition ${
                statusFilter === option.value
                  ? "border-amber-300/50 bg-amber-400/10 text-amber-100"
                  : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredMatches.length === 0 ? (
        <p className="text-sm text-slate-400">
          Aucun match correspondant. Les prochains matchs seront annoncés prochainement.
        </p>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMatches).map(([label, dayMatches]) => (
            <div key={label} className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{label}</p>
              <div className="grid gap-3">
                {dayMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    teamA={teams.find((team) => team.id === match.teamAId)}
                    teamB={teams.find((team) => team.id === match.teamBId)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
