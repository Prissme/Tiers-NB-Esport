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
  { id: "saison", label: "Saison" },
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
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) {
      router.replace("/admin/login");
      return;
    }

    const role = (user.app_metadata as { role?: string })?.role ??
      (user.user_metadata as { role?: string })?.role;

    if (role === "admin") {
      setLoading(false);
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error || profile?.role !== "admin") {
      router.replace("/admin/login");
      return;
    }

    setLoading(false);
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
      .filter((match) => match.status === "completed")
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
          teamA.points += 3;
        } else if (scoreB > scoreA) {
          teamB.wins += 1;
          teamA.losses += 1;
          teamB.points += 3;
        } else {
          teamA.points += 1;
          teamB.points += 1;
        }
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
      .update({ status: "completed", played_at: match.played_at ?? match.scheduled_at ?? null })
      .eq("id", match.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }
    fetchAllMatches(seasonId);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] rounded-3xl border border-white/10 bg-black/60 p-12 text-center text-white/70">
        Chargement...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-amber-200/70">LFN ADMIN</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Admin Panel ELITE</h1>
            <p className="mt-2 max-w-xl text-sm text-white/60">
              Gestion complète du programme, des matchs, des résultats et des équipes. UI premium dark.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70">
            Saison active: {seasonId ?? "Aucune"}
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 rounded-3xl border border-white/10 bg-white/5 p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-amber-400 text-black"
                : "border border-white/10 text-white/70 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      {activeTab === "programme" && (
        <section className="space-y-6">
          {scheduleDays.map(([day, dayMatches]) => (
            <div key={day} className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{day}</h3>
                <span className="text-xs text-white/50">{dayMatches.length} matchs</span>
              </div>
              <div className="mt-4 space-y-3">
                {dayMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm text-white">
                        {match.match_group ?? "Match"} • {match.phase}
                      </p>
                      <p className="text-xs text-white/50">
                        {formatDate(getMatchDate(match)) || "Horaire à définir"}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
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
        <MatchesTable
          seasonId={seasonId}
          onMatchesUpdated={() => fetchAllMatches(seasonId)}
        />
      )}

      {activeTab === "resultats" && (
        <section className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">Résultats</p>
                <h3 className="text-lg font-semibold text-white">Validation des résultats</h3>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm text-white/80">
                <thead className="text-xs uppercase text-white/40">
                  <tr className="border-b border-white/10">
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
                      <tr key={match.id} className="border-b border-white/5">
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
                              className="text-amber-200"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Proof
                            </a>
                          ) : null}
                          {match.vod_url ? (
                            <a
                              href={match.vod_url}
                              className="text-amber-200"
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
                            className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-black"
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

      {activeTab === "teams" && <TeamsPanel />}

      {activeTab === "saison" && (
        <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">Saison</p>
            <h3 className="text-lg font-semibold text-white">Sélectionner la saison</h3>
            <select
              value={seasonId ?? ""}
              onChange={(event) => setSeasonId(event.target.value)}
              className="w-full max-w-md rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
            >
              <option value="">Sélectionner</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name ?? season.label ?? season.id}
                </option>
              ))}
            </select>
            <p className="text-xs text-white/50">
              Le filtre de saison s'applique aux matchs, programme et classement.
            </p>
          </div>
        </section>
      )}

      {activeTab === "classement" && (
        <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">Classement</p>
              <h3 className="text-lg font-semibold text-white">Classement (client-side)</h3>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm text-white/80">
              <thead className="text-xs uppercase text-white/40">
                <tr className="border-b border-white/10">
                  <th className="px-3 py-2 text-left">Equipe</th>
                  <th className="px-3 py-2 text-left">W</th>
                  <th className="px-3 py-2 text-left">L</th>
                  <th className="px-3 py-2 text-left">Points</th>
                  <th className="px-3 py-2 text-left">Diff</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team) => (
                  <tr key={team.id} className="border-b border-white/5">
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
