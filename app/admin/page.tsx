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
  { id: "joueurs", label: "Joueurs" },
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

type TierPlayer = {
  id: string;
  name: string;
  tier: string;
  mmr: number;
  points: number;
  countryCode?: string;
};

const tierOptions = ["Tier S", "Tier A", "Tier B", "Tier C", "Tier D", "Tier E"] as const;

const countryOptions = [
  { code: "FR", label: "🇫🇷 France" },
  { code: "BE", label: "🇧🇪 Belgique" },
  { code: "CH", label: "🇨🇭 Suisse" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "MA", label: "🇲🇦 Maroc" },
  { code: "DZ", label: "🇩🇿 Algérie" },
  { code: "TN", label: "🇹🇳 Tunisie" },
  { code: "SN", label: "🇸🇳 Sénégal" },
  { code: "CM", label: "🇨🇲 Cameroun" },
] as const;

const toFlag = (countryCode?: string) => {
  const normalized = String(countryCode ?? "FR").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return "🏳️";
  return String.fromCodePoint(
    ...Array.from(normalized).map((char) => 127397 + char.charCodeAt(0))
  );
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
  const [tierPlayers, setTierPlayers] = useState<TierPlayer[]>([]);
  const [updatingPlayerId, setUpdatingPlayerId] = useState<string | null>(null);
  const [creatingPlayer, setCreatingPlayer] = useState(false);

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



  const fetchTierPlayers = async () => {
    try {
      const response = await fetch("/api/site/player-standings", { cache: "no-store" });
      const payload = (await response.json()) as { players?: TierPlayer[] };
      setTierPlayers(payload.players ?? []);
    } catch (error) {
      console.error("Unable to load tier players", error);
      setTierPlayers([]);
    }
  };

  const updatePlayerPoints = async (playerId: string, points: number) => {
    setUpdatingPlayerId(playerId);
    try {
      const response = await fetch("/api/admin/player-standings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, points, seasonId }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setErrorMessage(payload.error ?? "Impossible de mettre à jour les points.");
        return;
      }
      await fetchTierPlayers();
    } catch (error) {
      console.error("Unable to update player points", error);
      setErrorMessage("Impossible de mettre à jour les points.");
    } finally {
      setUpdatingPlayerId(null);
    }
  };

  const createTierPlayer = async (payload: {
    name: string;
    tier: string;
    points: number;
    countryCode: string;
  }) => {
    setCreatingPlayer(true);
    try {
      const response = await fetch("/api/admin/player-standings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, seasonId }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setErrorMessage(body.error ?? "Impossible d'ajouter le joueur.");
        return false;
      }
      await fetchTierPlayers();
      return true;
    } catch (error) {
      console.error("Unable to create tier player", error);
      setErrorMessage("Impossible d'ajouter le joueur.");
      return false;
    } finally {
      setCreatingPlayer(false);
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
    fetchTierPlayers();
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


      {activeTab === "joueurs" && (
        <section className="secondary-section surface-card--soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-utility">Joueurs</p>
              <h3 className="text-lg font-semibold text-white">Classement joueurs (tiers Prissme TV)</h3>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <form
              className="mb-4 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]"
              onSubmit={async (event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const name = String(formData.get("name") ?? "").trim();
                const tier = String(formData.get("tier") ?? "");
                const points = Number(formData.get("points"));
                const countryCode = String(formData.get("countryCode") ?? "FR").toUpperCase();

                if (!name) {
                  setErrorMessage("Le pseudo est obligatoire.");
                  return;
                }
                if (!Number.isInteger(points)) {
                  setErrorMessage("Les points doivent être un nombre entier.");
                  return;
                }

                const ok = await createTierPlayer({ name, tier, points, countryCode });
                if (ok) {
                  setErrorMessage(null);
                  event.currentTarget.reset();
                }
              }}
            >
              <input
                name="name"
                placeholder="Pseudo du joueur"
                className="rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white"
                required
              />
              <select
                name="tier"
                className="rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white"
                defaultValue="Tier E"
              >
                {tierOptions.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
              <input
                type="number"
                name="points"
                defaultValue={0}
                className="rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white"
                required
              />
              <select
                name="countryCode"
                className="rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white"
                defaultValue="FR"
              >
                {countryOptions.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={creatingPlayer}
                className="surface-pill surface-pill--active px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {creatingPlayer ? "Ajout..." : "Ajouter joueur"}
              </button>
            </form>
            <table className="surface-table text-sm text-white/80">
              <thead className="surface-table__header text-xs uppercase text-white/40">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Pseudo</th>
                  <th className="px-3 py-2 text-left">Pays</th>
                  <th className="px-3 py-2 text-left">Tier</th>
                  <th className="px-3 py-2 text-left">MMR</th>
                  <th className="px-3 py-2 text-left">Points</th>
                </tr>
              </thead>
              <tbody>
                {tierPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-white/40">
                      Aucun joueur avec tier actif.
                    </td>
                  </tr>
                ) : (
                  tierPlayers.map((player, index) => (
                    <tr key={player.id} className="surface-table__row">
                      <td className="px-3 py-2">{index + 1}</td>
                      <td className="px-3 py-2">{player.name}</td>
                      <td className="px-3 py-2">
                        {toFlag(player.countryCode)} {player.countryCode ?? "FR"}
                      </td>
                      <td className="px-3 py-2">{player.tier}</td>
                      <td className="px-3 py-2">{player.mmr}</td>
                      <td className="px-3 py-2">
                        <form
                          className="flex items-center gap-2"
                          onSubmit={(event) => {
                            event.preventDefault();
                            const formData = new FormData(event.currentTarget);
                            const value = Number(formData.get("points"));
                            if (!Number.isInteger(value)) {
                              setErrorMessage("Les points doivent être un nombre entier.");
                              return;
                            }
                            updatePlayerPoints(player.id, value);
                          }}
                        >
                          <input
                            type="number"
                            name="points"
                            defaultValue={player.points}
                            className="w-24 rounded-md border border-white/15 bg-black/30 px-2 py-1 text-white"
                          />
                          <button
                            type="submit"
                            disabled={updatingPlayerId === player.id}
                            className="surface-pill surface-pill--active px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
                          >
                            {updatingPlayerId === player.id ? "..." : "Sauver"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
