"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import SectionHeader from "../components/SectionHeader";
import StatusBadge from "../components/StatusBadge";
import type { Locale } from "../lib/i18n";
import ReloadingImage from "../components/ReloadingImage";
import type { MatchGroup, SiteMatch } from "../lib/site-types";
import { matches as fallbackMatches, teams as fallbackTeams } from "../../src/data";

const divisionOptions: Record<Locale, Array<{ label: string; value: string }>> = {
  fr: [
    { label: "Toutes", value: "all" },
    { label: "D1", value: "D1" },
    { label: "D2", value: "D2" },
  ],
  en: [
    { label: "All", value: "all" },
    { label: "D1", value: "D1" },
    { label: "D2", value: "D2" },
  ],
};

const copy = {
  fr: {
    kicker: "Matchs",
    title: "Calendrier officiel",
    description: "Suivi en direct, à venir, résultats validés.",
    fallback: "Données de secours (Supabase vide)",
    division: "Division",
    noMatches: "Aucun match correspondant. Prochaines annonces à venir.",
    finished: "Matchs terminés",
    upcoming: "Matchs à venir",
    divisionFallback: "Division",
    dateFallback: "À confirmer",
  },
  en: {
    kicker: "Matches",
    title: "Official schedule",
    description: "Live tracking, upcoming fixtures, validated results.",
    fallback: "Fallback data (empty Supabase)",
    division: "Division",
    noMatches: "No matching matches. Announcements coming soon.",
    finished: "Finished matches",
    upcoming: "Upcoming matches",
    divisionFallback: "Division",
    dateFallback: "To be confirmed",
  },
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
      attachments: [],
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

const formatDateLabel = (
  value: string | null,
  fallback: string | null | undefined,
  locale: Locale
) => {
  if (!value) return fallback ?? copy[locale].dateFallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dateLocale = locale === "en" ? "en-US" : "fr-FR";
  return date.toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatMatchTime = (dateISO: string | null, startTime?: string | null) => {
  const rawTime = startTime ?? dateISO;
  if (!rawTime) return "";
  const timePart = rawTime.includes("T") ? rawTime.split("T")[1] : rawTime;
  if (!timePart) return "";
  return timePart.slice(0, 5);
};

const getTeamInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export default function MatchesClient({ locale }: { locale: Locale }) {
  const content = copy[locale];
  const [divisionFilter, setDivisionFilter] = useState("all");
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

  const { filteredMatches, groupedMatches } = useMemo(() => {
    const filtered = matches
      .filter((match) => {
        const divisionMatch = divisionFilter === "all" || match.division === divisionFilter;
        return divisionMatch;
      })

    const regular = filtered.filter((match) => match.phase !== "playoffs");
    const isFinished = (status?: string | null) =>
      status === "finished" || status === "completed";
    const getTimestamp = (match: SiteMatch) =>
      match.scheduledAt ? new Date(match.scheduledAt).getTime() : null;

    const finishedMatches = [...regular]
      .filter((match) => isFinished(match.status))
      .sort((a, b) => {
        const aTime = getTimestamp(a) ?? Number.NEGATIVE_INFINITY;
        const bTime = getTimestamp(b) ?? Number.NEGATIVE_INFINITY;
        return bTime - aTime;
      });

    const upcomingMatches = [...regular]
      .filter((match) => !isFinished(match.status))
      .sort((a, b) => {
        const aTime = getTimestamp(a) ?? Number.POSITIVE_INFINITY;
        const bTime = getTimestamp(b) ?? Number.POSITIVE_INFINITY;
        return aTime - bTime;
      });

    const buildGroups = (list: SiteMatch[]) => {
      const grouped = new Map<string, SiteMatch[]>();
      const ordered: string[] = [];
      list.forEach((match) => {
        const label = formatDateLabel(match.scheduledAt, match.dayLabel, locale);
        if (!grouped.has(label)) {
          grouped.set(label, []);
          ordered.push(label);
        }
        grouped.get(label)?.push(match);
      });
      return ordered.map((label) => [label, grouped.get(label) ?? []] as const);
    };

    const sections = [
      { title: content.finished, groups: buildGroups(finishedMatches) },
      { title: content.upcoming, groups: buildGroups(upcomingMatches) },
    ].filter((section) => section.groups.length > 0);

    return { filteredMatches: regular, groupedMatches: sections };
  }, [divisionFilter, matches]);

  const renderMatchCard = (match: SiteMatch) => {
    const timeLabel = formatMatchTime(match.scheduledAt, match.startTime);
    const teamAInitials = getTeamInitials(match.teamA.name);
    const teamBInitials = getTeamInitials(match.teamB.name);
    return (
      <article
        key={match.id}
        className="group relative overflow-hidden rounded-[14px] bg-slate-950/40 p-6 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.9)] backdrop-blur transition hover:bg-slate-950/50"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)] opacity-70" />
        <Link
          href={`/matchs/${match.id}`}
          className="relative z-10 flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="text-left">
              <p className="text-lg font-semibold text-white">{match.teamA.name}</p>
              {match.teamA.tag ? (
                <p className="text-xs uppercase tracking-[0.3em] text-utility">
                  {match.teamA.tag}
                </p>
              ) : null}
            </div>
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden sm:h-16 sm:w-16">
              {match.teamA.logoUrl ? (
                <ReloadingImage
                  src={match.teamA.logoUrl}
                  alt={`Logo ${match.teamA.name}`}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="text-sm font-semibold text-utility">{teamAInitials || "?"}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-utility">
              {match.division ?? content.divisionFallback}
            </p>
            {timeLabel ? (
              <p className="text-2xl font-semibold text-white md:text-3xl">{timeLabel}</p>
            ) : null}
            {match.scoreA !== null && match.scoreB !== null ? (
              <p className="text-3xl font-semibold text-white">
                {match.scoreA ?? "-"} <span className="text-utility">-</span>{" "}
                {match.scoreB ?? "-"}
              </p>
            ) : (
              <p className="text-3xl font-semibold text-white">VS</p>
            )}
            <StatusBadge status={match.status} locale={locale} />
          </div>

          <div className="flex items-center justify-between gap-4 text-right">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden sm:h-16 sm:w-16">
              {match.teamB.logoUrl ? (
                <ReloadingImage
                  src={match.teamB.logoUrl}
                  alt={`Logo ${match.teamB.name}`}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="text-sm font-semibold text-utility">{teamBInitials || "?"}</span>
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-white">{match.teamB.name}</p>
              {match.teamB.tag ? (
                <p className="text-xs uppercase tracking-[0.3em] text-utility">
                  {match.teamB.tag}
                </p>
              ) : null}
            </div>
          </div>
        </Link>
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
        kicker={content.kicker}
        title={content.title}
        description={content.description}
        tone="support"
      />

      {source === "fallback" ? (
        <p className="text-xs uppercase tracking-[0.3em] text-utility">
          {content.fallback}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-utility">
        <span>{content.division}</span>
        <div className="flex flex-wrap gap-2">
          {divisionOptions[locale].map((option) => (
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
      </div>

      {filteredMatches.length === 0 ? (
        <p className="text-sm text-muted">
          {content.noMatches}
        </p>
      ) : (
        <div className="space-y-6">
          {groupedMatches.map((section) => (
            <div key={section.title} className="space-y-4">
              <p className="text-xs uppercase tracking-[0.35em] text-utility">
                {section.title}
              </p>
              <div className="space-y-6">
                {section.groups.map(([label, dayMatches]) => (
                  <div key={label} className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-utility">{label}</p>
                    <div className="grid gap-3">
                      {dayMatches.map((match) => renderMatchCard(match))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

    </section>
  );
}
