"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import { createSupabaseBrowserClient } from "../../src/lib/supabaseClient";
import type { MatchScore, Team } from "../../src/lib/types";

const formatTime = (scheduledAt: string | null) => {
  if (!scheduledAt) {
    return "Heure TBD";
  }

  const date = new Date(scheduledAt);

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

type GroupedMatches = Record<string, Record<string, MatchScore[]>>;

type MatchTeamMap = Record<string, Team>;

export default function MatchesPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [matches, setMatches] = useState<MatchScore[]>([]);
  const [teams, setTeams] = useState<MatchTeamMap>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data: matchScores, error } = await supabase
      .from("match_scores")
      .select(
        "id, match_id, division, match_day, scheduled_at, team_a_id, team_b_id, score_a, score_b, status"
      )
      .order("scheduled_at", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const nextMatches = matchScores ?? [];
    setMatches(nextMatches);

    const teamIds = Array.from(
      new Set(
        nextMatches
          .flatMap((match) => [match.team_a_id, match.team_b_id])
          .filter((id): id is string => Boolean(id))
      )
    );

    if (teamIds.length === 0) {
      setTeams({});
      setLoading(false);
      return;
    }

    const { data: teamData, error: teamError } = await supabase
      .from("teams")
      .select("id, tag, logo_url, name")
      .in("id", teamIds);

    if (teamError) {
      setErrorMessage(teamError.message);
      setLoading(false);
      return;
    }

    const teamMap = (teamData ?? []).reduce<MatchTeamMap>((acc, team) => {
      acc[team.id] = team;
      return acc;
    }, {});

    setTeams(teamMap);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    const channel = supabase
      .channel("matches-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => fetchMatches()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_sets" },
        () => fetchMatches()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMatches, supabase]);

  const groupedMatches = useMemo(() => {
    return matches.reduce<GroupedMatches>((acc, match) => {
      const division = match.division ?? "Division inconnue";
      const matchDay = match.match_day ? `Journée ${match.match_day}` : "Journée TBD";

      if (!acc[division]) {
        acc[division] = {};
      }

      if (!acc[division][matchDay]) {
        acc[division][matchDay] = [];
      }

      acc[division][matchDay].push(match);

      return acc;
    }, {});
  }, [matches]);

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          title="Calendrier des matchs"
          description="Suivez les rencontres à venir et les scores mis à jour en temps réel."
        />

        {loading ? <p className="text-sm text-slate-300">Chargement…</p> : null}
        {errorMessage ? (
          <p className="text-sm text-rose-200">Erreur: {errorMessage}</p>
        ) : null}

        {!loading && !errorMessage && matches.length === 0 ? (
          <p className="text-sm text-slate-300">Aucun match à afficher pour le moment.</p>
        ) : null}

        <div className="space-y-8">
          {Object.entries(groupedMatches).map(([division, divisionMatches]) => (
            <div key={division} className="space-y-4">
              <h3 className="text-xl font-semibold text-white">{division}</h3>
              {Object.entries(divisionMatches).map(([matchDay, dayMatches]) => (
                <div
                  key={matchDay}
                  className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                >
                  <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/80">
                    {matchDay}
                  </p>
                  <div className="mt-4 space-y-4">
                    {dayMatches.map((match) => {
                      const teamA = match.team_a_id ? teams[match.team_a_id] : null;
                      const teamB = match.team_b_id ? teams[match.team_b_id] : null;

                      return (
                        <div
                          key={match.id}
                          className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                              {formatTime(match.scheduled_at)}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                              <span className="inline-flex items-center gap-2">
                                {teamA?.logo_url ? (
                                  <img
                                    src={teamA.logo_url}
                                    alt={teamA.tag ?? "Team A"}
                                    className="h-6 w-6 rounded-full object-cover"
                                  />
                                ) : null}
                                {teamA?.tag ?? teamA?.name ?? "Team A"}
                              </span>
                              <span className="text-slate-300">vs</span>
                              <span className="inline-flex items-center gap-2">
                                {teamB?.logo_url ? (
                                  <img
                                    src={teamB.logo_url}
                                    alt={teamB.tag ?? "Team B"}
                                    className="h-6 w-6 rounded-full object-cover"
                                  />
                                ) : null}
                                {teamB?.tag ?? teamB?.name ?? "Team B"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-200">
                            <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">
                              {match.status ?? "à venir"}
                            </span>
                            <span className="text-lg font-semibold text-white">
                              {(match.score_a ?? 0).toString()} - {(match.score_b ?? 0).toString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
