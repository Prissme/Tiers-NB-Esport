"use client";

import { useEffect, useMemo, useState } from "react";
import type { MatchGroup, SiteMatch, SiteTeam } from "../lib/site-types";
import PreSeasonBanner from "./PreSeasonBanner";
import { matches as fallbackMatches, teams as fallbackTeams } from "../../src/data";
import type { Locale } from "../lib/i18n";

const divisionLabels: Record<Locale, Record<string, string>> = {
  fr: {
    D1: "Division 1",
    D2: "Division 2",
  },
  en: {
    D1: "Division 1",
    D2: "Division 2",
  },
};

const formatTimeLabel = (time: string | null, locale: Locale) => {
  if (!time) return locale === "fr" ? "À définir" : "TBD";
  if (locale === "fr") {
    return time.replace(":00", "H");
  }
  return time.slice(0, 5);
};

const formatDateLabel = (value: string | null, fallback: string | null | undefined, locale: Locale) => {
  if (!value) return fallback ?? (locale === "en" ? "To be confirmed" : "À confirmer");
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

const mapFallbackMatches = (locale: Locale): MatchGroup[] => {
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

  const grouped: Record<string, MatchGroup> = {};
  matches.forEach((match) => {
    const dateLabel = formatDateLabel(match.scheduledAt, match.dayLabel, locale);
    const timeLabel = match.scheduledAt
      ? match.scheduledAt.split("T")[1]?.slice(0, 5) ?? null
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

const copy = {
  fr: {
    loading: "Programme en chargement.",
    fallbackData: "Données de secours (Supabase vide)",
    upcoming: "À venir",
    matchLabel: "Match",
    schedule: "Programme",
    playoffs: "Play-offs",
    vs: "vs",
  },
  en: {
    loading: "Schedule loading.",
    fallbackData: "Fallback data (empty Supabase)",
    upcoming: "Coming soon",
    matchLabel: "Match",
    schedule: "Schedule",
    playoffs: "Playoffs",
    vs: "vs",
  },
};

export default function DayTwoSchedule({ locale }: { locale: Locale }) {
  const content = copy[locale];
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
            setGroups(mapFallbackMatches(locale));
            setSource("fallback");
          } else {
            setGroups(nextGroups);
          }
        }
      } catch (error) {
        console.error("schedule load error", error);
        if (mounted) {
          setGroups(mapFallbackMatches(locale));
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
    return <PreSeasonBanner message={content.loading} locale={locale} />;
  }

  const renderGroups = (label: string, data: MatchGroup[]) => (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="badge">{label}</p>
        <h2 className="text-2xl font-semibold text-white">{label}</h2>
        {source === "fallback" ? (
          <p className="text-xs uppercase tracking-[0.3em] text-utility">
            {content.fallbackData}
          </p>
        ) : null}
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-muted">{content.upcoming}</p>
      ) : (
        <div className="grid gap-6">
          {data.map((group) => (
            <section key={`${group.label}-${group.timeLabel}`} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-muted">
                  {group.label}
                </p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted">
                  {formatTimeLabel(group.timeLabel, locale)}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {group.matches.map((match) => (
                  <div key={match.id} className="motion-card space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-muted">
                        {match.round ?? content.matchLabel}
                      </p>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted">
                        {divisionLabels[locale][match.division ?? ""] ?? match.division ?? "LFN"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="badge">
                        {teamMap.get(match.teamA.id)?.name ?? match.teamA.name}{" "}
                        <span className="text-utility">{content.vs}</span>{" "}
                        {teamMap.get(match.teamB.id)?.name ?? match.teamB.name}
                      </span>
                      <span className="text-xs text-utility">{extractTeamNames(match)}</span>
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
    <div className="space-y-12 -mx-2 sm:mx-0">
      {renderGroups(content.schedule, regularGroups)}
      {renderGroups(content.playoffs, playoffGroups)}
    </div>
  );
}
