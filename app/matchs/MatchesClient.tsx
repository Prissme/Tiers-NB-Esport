"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import PreSeasonBanner from "../components/PreSeasonBanner";
import SectionHeader from "../components/SectionHeader";
import DiscordIcon from "../components/DiscordIcon";
import StatusBadge from "../components/StatusBadge";
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

const formatMatchTime = (dateISO: string | null, startTime?: string | null) => {
  if (!dateISO) {
    return startTime ? startTime.replace(":00", "h") : "";
  }
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) return startTime ?? "";
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getTeamInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

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

  const renderMatchCard = (match: SiteMatch) => {
    const dateLabel = formatDateLabel(match.scheduledAt, match.dayLabel);
    const timeLabel = formatMatchTime(match.scheduledAt, match.startTime);
    const teamAInitials = getTeamInitials(match.teamA.name);
    const teamBInitials = getTeamInitials(match.teamB.name);
    const isLive = match.status === "live";
    const actionLabel = isLive ? "Regarder en live" : "S’inscrire";
    const actionHref = match.status === "live" ? `/matchs/${match.id}` : "/inscription";

    return (
      <article
        key={match.id}
        className="group relative overflow-hidden rounded-[14px] bg-slate-950/40 p-6 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.9)] backdrop-blur transition hover:bg-slate-950/50"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)] opacity-70" />
        <div className="absolute right-6 top-5 text-right text-[11px] uppercase tracking-[0.3em] text-utility">
          <p>{dateLabel}</p>
          {timeLabel ? <p className="mt-1 text-sm font-semibold text-white">{timeLabel}</p> : null}
        </div>
        <Link
          href={`/matchs/${match.id}`}
          className="relative z-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[14px] bg-white/5">
              {match.teamA.logoUrl ? (
                <img
                  src={match.teamA.logoUrl}
                  alt={`Logo ${match.teamA.name}`}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="text-sm font-semibold text-utility">{teamAInitials || "?"}</span>
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-white">{match.teamA.name}</p>
              {match.teamA.tag ? (
                <p className="text-xs uppercase tracking-[0.3em] text-utility">
                  {match.teamA.tag}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-utility">
              {match.division ?? "Division"}
            </p>
            {match.status === "finished" ? (
              <p className="text-3xl font-semibold text-white">
                {match.scoreA ?? "-"} <span className="text-utility">-</span>{" "}
                {match.scoreB ?? "-"}
              </p>
            ) : (
              <p className="text-3xl font-semibold text-white">VS</p>
            )}
            <StatusBadge status={match.status} />
          </div>

          <div className="flex items-center justify-end gap-4 text-right">
            <div>
              <p className="text-lg font-semibold text-white">{match.teamB.name}</p>
              {match.teamB.tag ? (
                <p className="text-xs uppercase tracking-[0.3em] text-utility">
                  {match.teamB.tag}
                </p>
              ) : null}
            </div>
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[14px] bg-white/5">
              {match.teamB.logoUrl ? (
                <img
                  src={match.teamB.logoUrl}
                  alt={`Logo ${match.teamB.name}`}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="text-sm font-semibold text-utility">{teamBInitials || "?"}</span>
              )}
            </div>
          </div>
        </Link>
        <div className="relative z-10 mt-6 flex justify-end">
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center rounded-full bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.3em] signal-accent"
          >
            <span className="flex items-center gap-2">
              {actionLabel}
              {isLive ? null : <DiscordIcon />}
            </span>
          </Link>
        </div>
      </article>
    );
  };

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
        description="Suivi en direct, à venir, résultats validés."
        tone="support"
      />

      {source === "fallback" ? (
        <p className="text-xs uppercase tracking-[0.3em] text-utility">
          Données de secours (Supabase vide)
        </p>
      ) : null}

      {!hasFinishedMatches ? (
        <PreSeasonBanner message="Pré-saison — matchs officiels à venir." />
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-utility">
        <span>Division</span>
        <div className="flex flex-wrap gap-2">
          {divisionOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDivisionFilter(option.value)}
              className={`rounded-full px-3 py-2 text-[11px] transition ${
                divisionFilter === option.value
                  ? "bg-amber-400/15 text-amber-100"
                  : "bg-white/5 text-utility"
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
              className={`rounded-full px-3 py-2 text-[11px] transition ${
                statusFilter === option.value
                  ? "bg-amber-400/15 text-amber-100"
                  : "bg-white/5 text-utility"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredMatches.length === 0 ? (
        <p className="text-sm text-muted">
          Aucun match correspondant. Prochaines annonces à venir.
        </p>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMatches).map(([label, dayMatches]) => (
            <div key={label} className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-utility">{label}</p>
              <div className="grid gap-3">
                {dayMatches.map((match) => renderMatchCard(match))}
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
          tone="support"
        />
        {playoffsMatches.length === 0 ? (
          <p className="text-sm text-muted">Playoffs à venir.</p>
        ) : (
          <div className="grid gap-3">
            {playoffsMatches.map((match) => renderMatchCard(match))}
          </div>
        )}
      </div>
    </section>
  );
}
