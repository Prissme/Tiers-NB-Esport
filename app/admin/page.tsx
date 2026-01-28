"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MatchesTable, { type MatchRecord } from "./components/MatchesTable";
import TeamsPanel from "./components/TeamsPanel";
import { supabase } from "../../lib/supabaseClient";

const tabs = [
  { id: "programme", label: "Programme" },
  { id: "matchs", label: "Matchs" },
  { id: "resultats", label: "Résultats" },
  { id: "teams", label: "Teams" },
  { id: "classement", label: "Classement" },
];

type Team = {
  id: string;
  name: string;
  division: string | null;
};

type Season = {
  id: string;
  name?: string | null;
  label?: string | null;
};

const getMatchDate = (match: MatchRecord) => match.scheduled_at ?? match.start_time ?? match.played_at;

const formatDate = (value?: string | null) => {
  if (!value) return "";
  return value.replace("T", " ").slice(0, 16);
};

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("programme");
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAllMatches = async (seasonOverride?: string | null) => {
    let query = supabase
      .from("lfn_matches")
      .select("*")
      .order("day", { ascending: true })
      .order("round", { ascending: true });

    const effectiveSeason = seasonOverride ?? seasonId;
    if (effectiveSeason) {
      query = query.eq("season_id", effectiveSeason);
    }

    const { data, error } = await query;

    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setMatches((data ?? []) as MatchRecord[]);
  };

  const fetchTeams = async () => {
    const { data } = await supabase
      .from("lfn_teams")
      .select("id,name,division")
      .order("name", { ascending: true });
    setTeams((data ?? []) as Team[]);
  };

  const fetchSeasons = async () => {
    const { data, error } = await supabase.from("lfn_seasons").select("id,name,label");
    if (error) {
      return;
    }
    setSeasons((data ?? []) as Season[]);
    if (data?.[0]) {
      setSeasonId((current) => current ?? data[0].id);
    }
  };

  const checkAdmin = async () => {
    try {
      const response = await fetch("/api/admin/session", { cache: "no-store" });
      if (!response.ok) {
        router.replace("/admin/login");
        return;
      }
      setLoading(false);
    } catch (error) {
      console.error("Admin session check failed", error);
      router.replace("/admin/login");
    }
  };

  useEffect(() => {
    checkAdmin();
    fetchSeasons();
    fetchTeams();
  }, []);

  useEffect(() => {
    fetchAllMatches(seasonId);
  }, [seasonId]);

  const scheduleDays = useMemo(() => {
    const grouped = new Map<string, MatchRecord[]>();
    matches.forEach((match) => {
      const label = match.day_label ?? `Jour ${match.day ?? ""}`;
      if (!grouped.has(label)) {
        grouped.set(label, []);
      }
      grouped.get(label)?.push(match);
    });
    return Array.from(grouped.entries());
  }, [matches]);

  const standings = useMemo(() => {
    const stats = new Map(
      teams.map((team) => [team.id, { ...team, wins: 0, losses: 0, points: 0, diff: 0 }])
    );

    matches
      .filter((match) => match.status === "completed" || match.status === "finished")
      .forEach((match) => {
        if (!match.team_a_id || !match.team_b_id) {
          return;
        }
        const teamA = stats.get(match.team_a_id);
        const teamB = stats.get(match.team_b_id);
        if (!teamA || !teamB) {
          return;
        }
        const scoreA = match.score_a ?? 0;
        const scoreB = match.score_b ?? 0;
        teamA.diff += scoreA - scoreB;
        teamB.diff += scoreB - scoreA;
        if (scoreA > scoreB) {
          teamA.wins += 1;
          teamB.losses += 1;
        } else if (scoreB > scoreA) {
          teamB.wins += 1;
          teamA.losses += 1;
        }
        teamA.points += scoreA;
        teamB.points += scoreB;
      });

    return Array.from(stats.values()).sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.diff - a.diff;
    });
  }, [matches, teams]);

  const handleValidateResult = async (match: MatchRecord) => {
    const { error } = await supabase
      .from("lfn_matches")
      .update({ status: "finished", played_at: match.played_at ?? match.scheduled_at ?? null })
      .eq("id", match.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }
    fetchAllMatches(seasonId);
  };

  if (loading) {
    return (
      <div className="dominant-section min-h-[50vh] rounded-[14px] bg-black/60 p-12 text-center text-white/70">
        Chargement...
      </div>
    );
  }

  return (
    <div className="page-stack page-stack--tight">
      <header className="dominant-section rounded-[16px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] signal-accent">LFN ADMIN</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Admin Panel ELITE</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Gestion complète du programme, des matchs, des résultats et des équipes. UI premium dark.
            </p>
          </div>
          <div className="surface-chip surface-chip--muted">
            Saison active: {seasonId ?? "Aucune"}
          </div>
        </div>
      </header>

      <div className="secondary-section flex flex-wrap gap-2 rounded-[12px] bg-white/5 p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`surface-tab ${activeTab === tab.id ? "surface-tab--active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {errorMessage ? (
        <div className="surface-alert surface-alert--error">
          {errorMessage}
        </div>
      ) : null}

      {activeTab === "programme" && (
        <section className="secondary-section space-y-6">
          {scheduleDays.map(([day, dayMatches]) => (
            <div key={day} className="surface-card--soft">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{day}</h3>
                <span className="text-xs text-utility">{dayMatches.length} matchs</span>
              </div>
              <div className="mt-4 space-y-3">
                {dayMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-white/5 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm text-white">
                        {match.match_group ?? "Match"} • {match.phase}
                      </p>
                      <p className="text-xs text-utility">
                        {formatDate(getMatchDate(match)) || "Horaire à définir"}
                      </p>
                    </div>
                    <span className="surface-chip surface-chip--muted">
                      {match.division ?? "Division"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {activeTab === "matchs" && (
        <div className="secondary-section">
          <MatchesTable
            seasonId={seasonId}
            onMatchesUpdated={() => fetchAllMatches(seasonId)}
          />
        </div>
      )}

      {activeTab === "resultats" && (
        <section className="secondary-section space-y-6">
          <div className="surface-card--soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-utility">Résultats</p>
                <h3 className="text-lg font-semibold text-white">Validation des résultats</h3>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="surface-table text-sm text-white/80">
                <thead className="surface-table__header text-xs uppercase text-white/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Match</th>
                    <th className="px-3 py-2 text-left">Score</th>
                    <th className="px-3 py-2 text-left">Sets</th>
                    <th className="px-3 py-2 text-left">Joué le</th>
                    <th className="px-3 py-2 text-left">Proof/VOD</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-white/40">
                        Aucun résultat.
                      </td>
                    </tr>
                  ) : (
                    matches.map((match) => (
                      <tr key={match.id} className="surface-table__row">
                        <td className="px-3 py-2">
                          {match.match_group ?? "Match"}
                        </td>
                        <td className="px-3 py-2">
                          {match.score_a ?? 0} - {match.score_b ?? 0}
                        </td>
                        <td className="px-3 py-2">
                          {match.sets_a ?? 0} - {match.sets_b ?? 0}
                        </td>
                        <td className="px-3 py-2">{formatDate(match.played_at)}</td>
                        <td className="px-3 py-2 space-x-2 text-xs">
                          {match.proof_url ? (
                            <a
                              href={match.proof_url}
                              className="text-utility transition hover:text-white"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Proof
                            </a>
                          ) : null}
                          {match.vod_url ? (
                            <a
                              href={match.vod_url}
                              className="text-utility transition hover:text-white"
                              target="_blank"
                              rel="noreferrer"
                            >
                              VOD
                            </a>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => handleValidateResult(match)}
                            className="surface-pill surface-pill--active px-3 py-1 text-xs font-semibold text-black"
                          >
                            Valider résultat
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activeTab === "teams" && (
        <div className="secondary-section">
          <TeamsPanel />
        </div>
      )}

      {activeTab === "classement" && (
        <section className="secondary-section surface-card--soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-utility">Classement</p>
              <h3 className="text-lg font-semibold text-white">Classement (client-side)</h3>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="surface-table text-sm text-white/80">
              <thead className="surface-table__header text-xs uppercase text-white/40">
                <tr>
                  <th className="px-3 py-2 text-left">Equipe</th>
                  <th className="px-3 py-2 text-left">W</th>
                  <th className="px-3 py-2 text-left">L</th>
                  <th className="px-3 py-2 text-left">Points</th>
                  <th className="px-3 py-2 text-left">Diff</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team) => (
                  <tr key={team.id} className="surface-table__row">
                    <td className="px-3 py-2 text-white/90">{team.name}</td>
                    <td className="px-3 py-2">{team.wins}</td>
                    <td className="px-3 py-2">{team.losses}</td>
                    <td className="px-3 py-2">{team.points}</td>
                    <td className="px-3 py-2">{team.diff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
