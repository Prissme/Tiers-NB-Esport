"use client";

import { useEffect, useState } from "react";
import type { MatchGroup, SiteMatch } from "../lib/site-types";
import { matches as fallbackMatches, teams as fallbackTeams } from "../../src/data";

const formatScoreLine = (scoreA?: number | null, scoreB?: number | null) => {
  if (typeof scoreA !== "number" || typeof scoreB !== "number") return "—";
  return `${scoreA} - ${scoreB}`;
};

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

export default function DayOneResults() {
  const [matches, setMatches] = useState<SiteMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await fetch("/api/site/matches", { cache: "no-store" });
        const payload = (await response.json()) as { groups?: MatchGroup[] };
        const flattened = flattenGroups(payload.groups ?? []);
        if (mounted) {
          setMatches(flattened.length ? flattened : mapFallbackMatches());
        }
      } catch (error) {
        console.error("results load error", error);
        if (mounted) {
          setMatches(mapFallbackMatches());
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

  if (loading) {
    return (
      <section className="section-card space-y-6">
        <div className="space-y-2">
          <div className="skeleton h-5 w-24" />
          <div className="skeleton h-6 w-48" />
        </div>
        <div className="grid gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="motion-card h-16" />
          ))}
        </div>
      </section>
    );
  }

  const dayOneResults = matches
    .filter((match) => match.status === "finished" && match.dayLabel === "Day 1")
    .sort((a, b) => {
      const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      return aTime - bTime;
    });

  return (
    <section className="section-card space-y-6">
      <div className="space-y-2">
        <p className="badge">Résultats</p>
        <h2 className="text-2xl font-semibold text-white">Résultats — Jour 1</h2>
      </div>

      {dayOneResults.length === 0 ? (
        <p className="text-sm text-slate-300">Aucun résultat disponible.</p>
      ) : (
        <div className="grid gap-3">
          {dayOneResults.map((match) => (
            <div key={match.id} className="motion-card flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-white">
                {match.teamA.name} {" "}
                <span className="text-slate-200">{formatScoreLine(match.scoreA, match.scoreB)}</span>{" "}
                {match.teamB.name}
              </p>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                {match.division}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
