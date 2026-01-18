"use client";

import { useMemo, useState, useEffect } from "react";
import MatchCard from "../components/MatchCard";
import PreSeasonBanner from "../components/PreSeasonBanner";
import SectionHeader from "../components/SectionHeader";
import type { MatchGroup, SiteMatch } from "../lib/site-types";
import { matches as fallbackMatches, teams as fallbackTeams } from "../../src/data";

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

const mapFallbackMatches = (): SiteMatch[] => {
  const teamMap = new Map(fallbackTeams.map((team) => [team.id, team]));
  return fallbackMatches.map((match) => {
    const teamA = teamMap.get(match.teamAId);
    const teamB = teamMap.get(match.teamBId);
    return {
      id: match.id,
      division: match.division,
      status: match.status,
      scheduledAt: match.dateISO,
      dayLabel: match.dayLabel ?? null,
      startTime: null,
      phase: "regular",
      round: null,
      matchGroup: null,
      bestOf: null,
      scoreA: match.scoreA ?? null,
      scoreB: match.scoreB ?? null,
      teamA: {
        id: match.teamAId,
        name: teamA?.name ?? match.teamAId,
        tag: teamA?.tag ?? null,
        division: teamA?.division ?? null,
        logoUrl: teamA?.logoUrl ?? null,
      },
      teamB: {
        id: match.teamBId,
        name: teamB?.name ?? match.teamBId,
        tag: teamB?.tag ?? null,
        division: teamB?.division ?? null,
        logoUrl: teamB?.logoUrl ?? null,
      },
    };
  });
};

const flattenGroups = (groups: MatchGroup[]): SiteMatch[] =>
  groups.flatMap((group) => group.matches);

const formatDateLabel = (value: string | null, fallback?: string | null) => {
  if (!value) return fallback ?? "À confirmer";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export default function MatchesClient() {
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [matches, setMatches] = useState<SiteMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"supabase" | "fallback">("supabase");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch("/api/site/matches", { cache: "no-store" });
        const payload = (await response.json()) as { groups?: MatchGroup[] };
        const flattened = flattenGroups(payload.groups ?? []);
        if (mounted) {
          if (flattened.length === 0) {
            setMatches(mapFallbackMatches());
            setSource("fallback");
          } else {
            setMatches(flattened);
          }
        }
      } catch (error) {
        console.error("matches load error", error);
        if (mounted) {
          setMatches(mapFallbackMatches());
          setSource("fallback");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const { filteredMatches, groupedMatches, playoffsMatches } = useMemo(() => {
    const filtered = matches
      .filter((match) => {
        const divisionMatch = divisionFilter === "all" || match.division === divisionFilter;
        const statusMatch = statusFilter === "all" || match.status === statusFilter;
        return divisionMatch && statusMatch;
      })
      .sort((a, b) => {
        const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        return aTime - bTime;
      });

    const regular = filtered.filter((match) => match.phase !== "playoffs");
    const grouped = regular.reduce<Record<string, SiteMatch[]>>((acc, match) => {
      const label = formatDateLabel(match.scheduledAt, match.dayLabel);
      if (!acc[label]) acc[label] = [];
      acc[label].push(match);
      return acc;
    }, {});

    const playoffs = filtered.filter((match) => match.phase === "playoffs");

    return { filteredMatches: regular, groupedMatches: grouped, playoffsMatches: playoffs };
  }, [divisionFilter, statusFilter, matches]);

  const hasFinishedMatches = matches.some((match) => match.status === "finished");

  if (loading) {
    return (
      <section className="section-card space-y-6">
        <div className="space-y-3">
          <div className="skeleton h-4 w-28" />
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="grid gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="motion-card h-24" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="section-card space-y-6">
      <SectionHeader
        kicker="Matchs"
        title="Calendrier officiel"
        description="Suivi en direct, à venir et résultats officiels."
      />

      {source === "fallback" ? (
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Données de secours (Supabase vide)
        </p>
      ) : null}

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
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <SectionHeader
          kicker="Playoffs"
          title="Tableau playoffs"
          description="Phase finale et matchs à élimination."
        />
        {playoffsMatches.length === 0 ? (
          <p className="text-sm text-slate-400">Playoffs à venir.</p>
        ) : (
          <div className="grid gap-3">
            {playoffsMatches.map((match) => (
              <MatchCard key={`playoff-${match.id}`} match={match} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
