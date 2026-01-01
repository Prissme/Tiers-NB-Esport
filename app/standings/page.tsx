"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import { createSupabaseBrowserClient } from "../../src/lib/supabaseClient";
import type { Standing, Team } from "../../src/lib/types";

type StandingTeamMap = Record<string, Team>;

type GroupedStandings = Record<string, Standing[]>;

export default function StandingsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [teams, setTeams] = useState<StandingTeamMap>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStandings = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data: activeSeason, error: seasonError } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();

    if (seasonError) {
      setErrorMessage(seasonError.message);
      setLoading(false);
      return;
    }

    if (!activeSeason?.id) {
      setErrorMessage("Aucune saison active trouvée.");
      setLoading(false);
      return;
    }

    const { data: standingsData, error } = await supabase
      .from("standings")
      .select("team_id, division, points, sets_won, sets_lost")
      .eq("season_id", activeSeason.id);

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const nextStandings = standingsData ?? [];
    setStandings(nextStandings);

    const teamIds = Array.from(
      new Set(nextStandings.map((standing) => standing.team_id))
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

    const teamMap = (teamData ?? []).reduce<StandingTeamMap>((acc, team) => {
      acc[team.id] = team;
      return acc;
    }, {});

    setTeams(teamMap);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  useEffect(() => {
    const channel = supabase
      .channel("standings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_sets" },
        () => fetchStandings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStandings, supabase]);

  const groupedStandings = useMemo(() => {
    return standings.reduce<GroupedStandings>((acc, standing) => {
      const division = standing.division ?? "Division inconnue";
      if (!acc[division]) {
        acc[division] = [];
      }
      acc[division].push(standing);
      return acc;
    }, {});
  }, [standings]);

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          title="Classement"
          description="Classement mis à jour automatiquement en fonction des sets validés."
        />

        {loading ? <p className="text-sm text-slate-300">Chargement…</p> : null}
        {errorMessage ? (
          <p className="text-sm text-rose-200">Erreur: {errorMessage}</p>
        ) : null}

        {!loading && !errorMessage && standings.length === 0 ? (
          <p className="text-sm text-slate-300">Aucun classement disponible.</p>
        ) : null}

        <div className="space-y-8">
          {Object.entries(groupedStandings).map(([division, divisionStandings]) => {
            const sortedStandings = [...divisionStandings].sort((a, b) => {
              const pointsDiff = (b.points ?? 0) - (a.points ?? 0);
              if (pointsDiff !== 0) {
                return pointsDiff;
              }
              return (b.sets_won ?? 0) - (a.sets_won ?? 0);
            });

            return (
              <div key={division} className="space-y-4">
                <h3 className="text-xl font-semibold text-white">{division}</h3>
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <table className="min-w-full text-sm text-slate-200">
                    <thead className="bg-slate-900/60 text-xs uppercase tracking-[0.2em] text-slate-400">
                      <tr>
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Équipe</th>
                        <th className="px-4 py-3 text-right">Points</th>
                        <th className="px-4 py-3 text-right">Sets gagnés</th>
                        <th className="px-4 py-3 text-right">Sets perdus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStandings.map((standing, index) => {
                        const team = teams[standing.team_id];
                        return (
                          <tr
                            key={standing.team_id}
                            className="border-t border-white/5 bg-slate-950/40"
                          >
                            <td className="px-4 py-3 font-semibold text-white">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {team?.logo_url ? (
                                  <img
                                    src={team.logo_url}
                                    alt={team.tag ?? "Team"}
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                ) : null}
                                <span className="font-semibold text-white">
                                  {team?.tag ?? team?.name ?? "Équipe"}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-white">
                              {standing.points ?? 0}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {standing.sets_won ?? 0}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {standing.sets_lost ?? 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
