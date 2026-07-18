"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MatchesTable, { type MatchRecord } from "./components/MatchesTable";
import TeamsPanel from "./components/TeamsPanel";
import { supabase } from "../../lib/supabaseClient";
import { COUNTRIES, CountrySearch } from "./components/CountrySearch";

const tabs = [
  { id: "programme", label: "Programme" },
  { id: "matchs", label: "Matchs" },
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
  points: number;
  countryCode?: string;
  description?: string;
  ballonDor?: number;
  earnings?: number;
};

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

// ─── New player form state ───────────────────────────────────────────────────
type NewPlayerForm = {
  name: string;
  tier: string;
  points: number;
  countryCode: string;
  description: string;
  ballonDor: number;
  earnings: number;
};

const defaultNewPlayer: NewPlayerForm = {
  name: "",
  tier: "Tier E",
  points: 0,
  countryCode: "FR",
  description: "",
  ballonDor: 0,
  earnings: 0,
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
  const [playerSearch, setPlayerSearch] = useState("");
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  // New player form
  const [newPlayer, setNewPlayer] = useState<NewPlayerForm>(defaultNewPlayer);

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
    const { data, error } = await supabase
      .from("lfn_seasons")
      .select("id,name,label,status,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      return;
    }
    const seasonList = (data ?? []) as Array<Season & { status?: string | null }>;
    setSeasons(seasonList);
    const activeSeason = seasonList.find((season) => season.status === "active");
    if (activeSeason?.id) {
      setSeasonId((current) => current ?? activeSeason.id);
      return;
    }
    if (seasonList[0]) {
      setSeasonId((current) => current ?? seasonList[0].id);
    }
  };

  const fetchTierPlayers = async (seasonOverride?: string | null) => {
    try {
      const effectiveSeason = seasonOverride ?? seasonId;
      const query = effectiveSeason ? `?season=${encodeURIComponent(effectiveSeason)}` : "";
      const response = await fetch(`/api/site/player-standings${query}`, { cache: "no-store" });
      const payload = (await response.json()) as { players?: TierPlayer[] };
      setTierPlayers(payload.players ?? []);
    } catch (error) {
      console.error("Unable to load tier players", error);
      setTierPlayers([]);
    }
  };

  const updateTierPlayer = async (payload: {
    playerId: string;
    points: number;
    tier: string;
    countryCode: string;
    description: string;
    ballonDor: number;
    earnings: number;
  }) => {
    const { playerId } = payload;
    setUpdatingPlayerId(playerId);
    try {
      const response = await fetch("/api/admin/player-standings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, seasonId }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setErrorMessage(body.error ?? "Impossible de mettre à jour le joueur.");
        return;
      }
      await fetchTierPlayers(seasonId);
    } catch (error) {
      console.error("Unable to update tier player", error);
      setErrorMessage("Impossible de mettre à jour le joueur.");
    } finally {
      setUpdatingPlayerId(null);
    }
  };

  const createTierPlayer = async () => {
    const { name, tier, points, countryCode, description, ballonDor, earnings } = newPlayer;
    if (!name.trim()) {
      setErrorMessage("Le pseudo est obligatoire.");
      return;
    }
    if (!Number.isInteger(points)) {
      setErrorMessage("Les points doivent être un nombre entier.");
      return;
    }
    setCreatingPlayer(true);
    try {
      const response = await fetch("/api/admin/player-standings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), tier, points, countryCode, description, ballonDor, earnings, seasonId }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setErrorMessage(body.error ?? "Impossible d'ajouter le joueur.");
        return;
      }
      await fetchTierPlayers(seasonId);
      setNewPlayer(defaultNewPlayer);
      setErrorMessage(null);
    } catch (error) {
      console.error("Unable to create tier player", error);
      setErrorMessage("Impossible d'ajouter le joueur.");
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
  }, []);

  useEffect(() => {
    fetchAllMatches(seasonId);
  }, [seasonId]);

  useEffect(() => {
    fetchTierPlayers(seasonId);
  }, [seasonId]);

  useEffect(() => {
    const refreshInterval = window.setInterval(() => {
      fetchTierPlayers(seasonId);
    }, 10000);

    return () => {
      window.clearInterval(refreshInterval);
    };
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

  const filteredTierPlayers = useMemo(() => {
    const query = playerSearch.trim().toLowerCase();
    if (!query) {
      return tierPlayers;
    }
    return tierPlayers.filter((player) => {
      return (
        player.name.toLowerCase().includes(query) ||
        player.tier.toLowerCase().includes(query) ||
        String(player.countryCode ?? "FR")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [playerSearch, tierPlayers]);

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
              Gestion complète du programme, des matchs et des équipes. UI premium dark.
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

          {/* ── Add player form ── */}
          <div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr]">
              <div>
                <label className="block text-xs uppercase tracking-[0.25em] text-white/50 mb-1">
                  Pseudo
                </label>
                <input
                  type="text"
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Pseudo du joueur"
                  className="surface-input"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.25em] text-white/50 mb-1">
                  Tier
                </label>
                <select
                  value={newPlayer.tier}
                  onChange={(e) => setNewPlayer((prev) => ({ ...prev, tier: e.target.value }))}
                  className="surface-input"
                >
                  {tierOptions.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.25em] text-white/50 mb-1">
                  Points
                </label>
                <input
                  type="number"
                  value={newPlayer.points}
                  onChange={(e) =>
                    setNewPlayer((prev) => ({ ...prev, points: Number(e.target.value) }))
                  }
                  className="surface-input"
                />
              </div>
            </div>

            {/* Country search */}
            <div>
              <CountrySearch
                value={newPlayer.countryCode}
                onChange={(code) =>
                  setNewPlayer((prev) => ({ ...prev, countryCode: code ?? "FR" }))
                }
                label="Pays"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-white/50 mb-1">
                Description (optionnel)
              </label>
              <textarea
                value={newPlayer.description}
                onChange={(e) =>
                  setNewPlayer((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Description du joueur"
                className="surface-textarea"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-white/50 mb-1">
                Ballon d'Or
              </label>
              <input
                type="number"
                min={0}
                value={newPlayer.ballonDor}
                onChange={(e) =>
                  setNewPlayer((prev) => ({ ...prev, ballonDor: Number(e.target.value) }))
                }
                className="surface-input"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-white/50 mb-1">
                Earnings (€)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={newPlayer.earnings}
                onChange={(e) =>
                  setNewPlayer((prev) => ({ ...prev, earnings: Number(e.target.value) }))
                }
                className="surface-input"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={createTierPlayer}
                disabled={creatingPlayer}
                className="surface-pill surface-pill--active px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {creatingPlayer ? "Ajout..." : "Ajouter joueur"}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4">
            <input
              type="search"
              value={playerSearch}
              onChange={(event) => setPlayerSearch(event.target.value)}
              placeholder="Rechercher un joueur, un tier ou un pays (ex: Tier A, FR...)"
              className="surface-input"
            />
          </div>

          {/* Players table */}
          <div className="mt-4 overflow-x-auto">
            <table className="surface-table text-sm text-white/80">
              <thead className="surface-table__header text-xs uppercase text-white/40">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Pseudo</th>
                  <th className="px-3 py-2 text-left">Pays</th>
                  <th className="px-3 py-2 text-left">Tier</th>
                  <th className="px-3 py-2 text-left">Édition</th>
                </tr>
              </thead>
              <tbody>
                {filteredTierPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-white/40">
                      {tierPlayers.length === 0
                        ? "Aucun joueur avec tier actif."
                        : "Aucun joueur ne correspond à la recherche."}
                    </td>
                  </tr>
                ) : (
                  filteredTierPlayers.map((player, index) => {
                    const isExpanded = expandedPlayerId === player.id;
                    return (
                      <Fragment key={player.id}>
                        <tr
                          className="surface-table__row cursor-pointer"
                          onClick={() =>
                            setExpandedPlayerId((current) =>
                              current === player.id ? null : player.id
                            )
                          }
                        >
                          <td className="px-3 py-2">{index + 1}</td>
                          <td className="px-3 py-2">{player.name}</td>
                          <td className="px-3 py-2">
                            {toFlag(player.countryCode)} {player.countryCode ?? "FR"}
                          </td>
                          <td className="px-3 py-2">{player.tier}</td>
                          <td className="px-3 py-2 text-xs text-white/60">
                            {isExpanded ? "Masquer édition" : "Cliquer pour éditer"}
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="surface-table__row bg-white/5">
                            <td colSpan={5} className="px-3 py-3">
                              <PlayerEditRow
                                player={player}
                                updating={updatingPlayerId === player.id}
                                onSave={(values) =>
                                  updateTierPlayer({ playerId: player.id, ...values })
                                }
                                onError={setErrorMessage}
                              />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Inline edit row ─────────────────────────────────────────────────────────
type PlayerEditRowProps = {
  player: TierPlayer;
  updating: boolean;
  onSave: (values: {
    points: number;
    tier: string;
    countryCode: string;
    description: string;
    ballonDor: number;
    earnings: number;
  }) => void;
  onError: (msg: string) => void;
};

const tierOptions = ["Tier S", "Tier A", "Tier B", "Tier C", "Tier D", "Tier E"] as const;

function PlayerEditRow({ player, updating, onSave, onError }: PlayerEditRowProps) {
  const [tier, setTier] = useState(player.tier);
  const [points, setPoints] = useState(player.points);
  const [countryCode, setCountryCode] = useState(player.countryCode ?? "FR");
  const [description, setDescription] = useState(player.description ?? "");
  const [ballonDor, setBallonDor] = useState(player.ballonDor ?? 0);
  const [earnings, setEarnings] = useState(player.earnings ?? 0);

  const handleSave = () => {
    if (!Number.isInteger(points)) {
      onError("Les points doivent être un nombre entier.");
      return;
    }
    if (!tierOptions.includes(tier as (typeof tierOptions)[number])) {
      onError("Tier invalide.");
      return;
    }
    if (!Number.isInteger(ballonDor) || ballonDor < 0) {
      onError("Le Ballon d'Or doit être un nombre entier positif.");
      return;
    }
    if (!Number.isFinite(earnings) || earnings < 0) {
      onError("Les earnings doivent être un nombre positif.");
      return;
    }
    onSave({ points, tier, countryCode: countryCode.toUpperCase(), description, ballonDor, earnings });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
        <div>
          <label className="block text-xs uppercase tracking-[0.25em] text-white/50 mb-1">
            Tier
          </label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="surface-input"
          >
            {tierOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-[0.25em] text-white/50 mb-1">
            Points
          </label>
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="surface-input"
          />
        </div>
        <div className="md:col-span-1">
          <CountrySearch
            value={countryCode}
            onChange={(code) => setCountryCode(code ?? "FR")}
            label="Pays"
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={updating}
            className="surface-pill surface-pill--active px-4 py-2 text-xs font-semibold text-black disabled:opacity-50 w-full"
          >
            {updating ? "..." : "Sauver"}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs uppercase tracking-[0.25em] text-white/50 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Description affichée sur /classement et avec !tier"
          className="surface-textarea"
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-[0.25em] text-white/50 mb-1">
          Ballon d'Or
        </label>
        <input
          type="number"
          min={0}
          value={ballonDor}
          onChange={(e) => setBallonDor(Number(e.target.value))}
          placeholder="Nombre de Ballon(s) d'Or"
          className="surface-input"
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-[0.25em] text-white/50 mb-1">
          Earnings ($)
        </label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={earnings}
          onChange={(e) => setEarnings(Number(e.target.value))}
          placeholder="Gains en argent ($)"
          className="surface-input"
        />
      </div>
    </div>
  );
}
