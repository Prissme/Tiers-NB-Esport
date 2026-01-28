"use client";

import { useEffect, useMemo, useState } from "react";
import type { MatchGroup, SiteMatch, SiteTeam } from "../lib/site-types";
import PreSeasonBanner from "./PreSeasonBanner";
import { matches as fallbackMatches, teams as fallbackTeams } from "../../src/data";

const divisionLabels: Record<string, string> = {
  D1: "Division 1",
  D2: "Division 2",
};

const formatTimeLabel = (time: string | null) => (time ? time.replace(":00", "H") : "TBD");

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

const mapFallbackMatches = (): MatchGroup[] => {
  const teamMap = new Map(fallbackTeams.map((team) => [team.id, team]));
  const matches = fallbackMatches.map<SiteMatch>((match) => {
    const teamA = teamMap.get(match.teamAId);
    const teamB = teamMap.get(match.teamBId);
    return {
      id: match.id,
      division: match.division,
      status: match.status,
      scheduledAt: match.dateISO,
      dayLabel: match.dayLabel ?? null,
      startTime: match.dateISO ? new Date(match.dateISO).toISOString() : null,
      phase: match.status === "finished" ? "regular" : "regular",
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

  const grouped: Record<string, MatchGroup> = {};
  matches.forEach((match) => {
    const dateLabel = formatDateLabel(match.scheduledAt, match.dayLabel);
    const timeLabel = match.scheduledAt
      ? new Date(match.scheduledAt).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;
    const key = `${dateLabel}__${timeLabel ?? ""}`;
    if (!grouped[key]) {
      grouped[key] = {
        label: dateLabel,
        dateLabel,
        timeLabel,
        matchGroup: null,
        scheduledAt: match.scheduledAt,
        matches: [],
      };
    }
    grouped[key].matches.push(match);
  });

  return Object.values(grouped);
};

const extractTeamNames = (match: SiteMatch) =>
  `${match.teamA.name} vs ${match.teamB.name}`;

const buildTeamMap = (groups: MatchGroup[]) => {
  const map = new Map<string, SiteTeam>();
  groups.forEach((group) =>
    group.matches.forEach((match) => {
      map.set(match.teamA.id, {
        id: match.teamA.id,
        name: match.teamA.name,
        tag: match.teamA.tag,
        division: match.teamA.division,
        logoUrl: match.teamA.logoUrl,
      });
      map.set(match.teamB.id, {
        id: match.teamB.id,
        name: match.teamB.name,
        tag: match.teamB.tag,
        division: match.teamB.division,
        logoUrl: match.teamB.logoUrl,
      });
    })
  );
  return map;
};

export default function DayTwoSchedule() {
  const [groups, setGroups] = useState<MatchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"supabase" | "fallback">("supabase");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await fetch("/api/site/matches", { cache: "no-store" });
        const payload = (await response.json()) as { groups?: MatchGroup[] };
        const nextGroups = payload.groups ?? [];
        if (mounted) {
          if (nextGroups.length === 0) {
            setGroups(mapFallbackMatches());
            setSource("fallback");
          } else {
            setGroups(nextGroups);
          }
        }
      } catch (error) {
        console.error("schedule load error", error);
        if (mounted) {
          setGroups(mapFallbackMatches());
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

  const { regularGroups, playoffGroups } = useMemo(() => {
    const regular: MatchGroup[] = [];
    const playoffs: MatchGroup[] = [];
    groups.forEach((group) => {
      const hasPlayoffs = group.matches.some((match) => match.phase === "playoffs");
      if (hasPlayoffs) {
        playoffs.push(group);
      } else {
        regular.push(group);
      }
    });
    return { regularGroups: regular, playoffGroups: playoffs };
  }, [groups]);

  const teamMap = useMemo(() => buildTeamMap(groups), [groups]);

  if (loading) {
    return (
      <div className="space-y-8">
        {[1, 2].map((index) => (
          <section key={index} className="section-card space-y-6">
            <div className="space-y-2">
              <div className="skeleton h-5 w-32" />
              <div className="skeleton h-7 w-64" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((slot) => (
                <div key={slot} className="motion-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="skeleton h-4 w-20" />
                    <div className="skeleton h-6 w-24" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2].map((pill) => (
                      <span key={pill} className="skeleton h-8 w-36 rounded-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return <PreSeasonBanner message="Programme en chargement." />;
  }

  const renderGroups = (label: string, data: MatchGroup[]) => (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="badge">{label}</p>
        <h2 className="text-2xl font-semibold text-white">{label}</h2>
        {source === "fallback" ? (
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Données de secours (Supabase vide)
          </p>
        ) : null}
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-slate-300">À venir</p>
      ) : (
        <div className="grid gap-6">
          {data.map((group) => (
            <section key={`${group.label}-${group.timeLabel}`} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-200">
                  {group.label}
                </p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-200">
                  {formatTimeLabel(group.timeLabel)}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {group.matches.map((match) => (
                  <div key={match.id} className="motion-card space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-200">
                        {match.round ?? "Match"}
                      </p>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-200">
                        {divisionLabels[match.division ?? ""] ?? match.division ?? "LFN"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="badge">
                        {teamMap.get(match.teamA.id)?.name ?? match.teamA.name} {" "}
                        <span className="text-slate-300">vs</span>{" "}
                        {teamMap.get(match.teamB.id)?.name ?? match.teamB.name}
                      </span>
                      <span className="text-xs text-slate-400">{extractTeamNames(match)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-12">
      {renderGroups("Programme", regularGroups)}
      {renderGroups("Play-offs", playoffGroups)}
    </div>
  );
}
