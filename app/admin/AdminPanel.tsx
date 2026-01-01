"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Team = {
  id: string;
  name: string;
  tag: string | null;
  division: string | null;
  logoUrl: string | null;
  statsSummary: string | null;
  mainBrawlers: string | null;
  wins: number | null;
  losses: number | null;
  points: number | null;
};

type MatchTeam = {
  id: string | null;
  name: string;
  tag: string | null;
  logoUrl: string | null;
  division: string | null;
};

type Match = {
  id: string;
  status: string | null;
  scheduledAt: string | null;
  bestOf: number | null;
  scoreA: number | null;
  scoreB: number | null;
  division: string | null;
  teamA: MatchTeam;
  teamB: MatchTeam;
};

type SummaryCard = {
  label: string;
  value: string;
  helper?: string;
};

const emptyTeamForm = {
  name: "",
  tag: "",
  division: "",
  logoUrl: "",
  statsSummary: "",
  mainBrawlers: "",
};

const emptyMatchForm = {
  scheduledAt: "",
  division: "",
  teamAId: "",
  teamBId: "",
  bestOf: "3",
  status: "pending",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "En attente" },
  { value: "scheduled", label: "Programmé" },
  { value: "live", label: "En cours" },
  { value: "completed", label: "Terminé" },
];

const DIVISION_OPTIONS = [
  { value: "D1", label: "Division 1" },
  { value: "D2", label: "Division 2" },
];

const toLocalInputValue = (value: string | null) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

const normalizeNullable = (value: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const formatSchedule = (value: string | null) => {
  if (!value) {
    return "À planifier";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusBadgeClass = (status?: string | null) => {
  switch (status) {
    case "live":
      return "bg-emerald-400/20 text-emerald-200";
    case "completed":
      return "bg-slate-500/20 text-slate-200";
    case "scheduled":
      return "bg-sky-400/20 text-sky-200";
    default:
      return "bg-amber-400/20 text-amber-200";
  }
};

const sanitizeInput = (value: string) => value.replace(/\s+/g, " ").trimStart();

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"teams" | "matches">("teams");
  const [teams, setTeams] = useState<Team[]>([]);
  const [matchesLive, setMatchesLive] = useState<Match[]>([]);
  const [matchesRecent, setMatchesRecent] = useState<Match[]>([]);
  const [teamForm, setTeamForm] = useState(emptyTeamForm);
  const [matchForm, setMatchForm] = useState(emptyMatchForm);
  const [teamFormErrors, setTeamFormErrors] = useState<string[]>([]);
  const [matchFormErrors, setMatchFormErrors] = useState<string[]>([]);
  const [matchEdits, setMatchEdits] = useState<
    Record<string, { scheduledAt: string; status: string; bestOf: string; division: string }>
  >({});
  const [resultScores, setResultScores] = useState<Record<string, { scoreA: string; scoreB: string }>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamDivision, setTeamDivision] = useState("all");
  const [teamSortKey, setTeamSortKey] = useState<"name" | "wins" | "points">("name");
  const [teamSortDir, setTeamSortDir] = useState<"asc" | "desc">("asc");
  const [matchSearch, setMatchSearch] = useState("");
  const [matchDivision, setMatchDivision] = useState("all");
  const [matchStatus, setMatchStatus] = useState("all");

  const teamOptions = useMemo(
    () => teams.map((team) => ({ label: `${team.name} (${team.tag ?? "?"})`, value: team.id })),
    [teams]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [teamsResponse, liveResponse, recentResponse] = await Promise.all([
        fetch("/api/site/teams", { cache: "no-store" }),
        fetch("/api/site/matches?status=live&limit=20", { cache: "no-store" }),
        fetch("/api/site/matches?status=recent&limit=20", { cache: "no-store" }),
      ]);

      const teamsPayload = await teamsResponse.json();
      const livePayload = await liveResponse.json();
      const recentPayload = await recentResponse.json();

      if (!teamsResponse.ok) {
        throw new Error(teamsPayload.error || "Erreur lors du chargement des équipes.");
      }
      if (!liveResponse.ok || !recentResponse.ok) {
        throw new Error("Erreur lors du chargement des matchs.");
      }

      setTeams(teamsPayload.teams ?? []);
      setMatchesLive(livePayload.matches ?? []);
      setMatchesRecent(recentPayload.matches ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setMatchEdits((prev) => {
      const next = { ...prev };
      const allMatches = [...matchesLive, ...matchesRecent];
      allMatches.forEach((match) => {
        if (!next[match.id]) {
          next[match.id] = {
            scheduledAt: toLocalInputValue(match.scheduledAt),
            status: match.status ?? "",
            bestOf: match.bestOf ? String(match.bestOf) : "",
            division: match.division ?? "",
          };
        }
      });
      return next;
    });
  }, [matchesLive, matchesRecent]);

  const teamSummary = useMemo(() => {
    const totalTeams = teams.length;
    const divisions = new Map<string, number>();
    let missingLogos = 0;
    let missingTags = 0;
    teams.forEach((team) => {
      const division = team.division || "Sans division";
      divisions.set(division, (divisions.get(division) ?? 0) + 1);
      if (!team.logoUrl) {
        missingLogos += 1;
      }
      if (!team.tag) {
        missingTags += 1;
      }
    });
    const divisionSummary = [...divisions.entries()]
      .map(([division, count]) => `${division}: ${count}`)
      .join(" · ");
    const cards: SummaryCard[] = [
      { label: "Équipes", value: String(totalTeams), helper: divisionSummary || "Aucune division" },
      { label: "Logos manquants", value: String(missingLogos), helper: "À compléter pour un rendu pro" },
      { label: "Tags manquants", value: String(missingTags), helper: "À compléter pour l'affichage" },
    ];
    return cards;
  }, [teams]);

  const matchSummary = useMemo(() => {
    const liveCount = matchesLive.length;
    const recentCount = matchesRecent.length;
    const totalCount = liveCount + recentCount;
    const cards: SummaryCard[] = [
      { label: "Matchs actifs", value: String(liveCount), helper: "En cours ou à venir" },
      { label: "Matchs récents", value: String(recentCount), helper: "Déjà joués" },
      { label: "Total chargés", value: String(totalCount), helper: "Dernières entrées" },
    ];
    return cards;
  }, [matchesLive, matchesRecent]);

  const filteredTeams = useMemo(() => {
    const searchLower = teamSearch.trim().toLowerCase();
    const filtered = teams.filter((team) => {
      const matchesSearch =
        !searchLower ||
        team.name.toLowerCase().includes(searchLower) ||
        (team.tag ?? "").toLowerCase().includes(searchLower);
      const matchesDivision = teamDivision === "all" || (team.division ?? "") === teamDivision;
      return matchesSearch && matchesDivision;
    });
    const sorted = [...filtered].sort((teamA, teamB) => {
      const dir = teamSortDir === "asc" ? 1 : -1;
      if (teamSortKey === "name") {
        return dir * teamA.name.localeCompare(teamB.name);
      }
      if (teamSortKey === "wins") {
        return dir * ((teamA.wins ?? 0) - (teamB.wins ?? 0));
      }
      return dir * ((teamA.points ?? 0) - (teamB.points ?? 0));
    });
    return sorted;
  }, [teamDivision, teamSearch, teamSortDir, teamSortKey, teams]);

  const filteredMatches = useMemo(() => {
    const searchLower = matchSearch.trim().toLowerCase();
    const allMatches = [...matchesLive, ...matchesRecent];
    return allMatches.filter((match) => {
      const matchesSearch =
        !searchLower ||
        match.teamA.name.toLowerCase().includes(searchLower) ||
        match.teamB.name.toLowerCase().includes(searchLower);
      const matchesDivision = matchDivision === "all" || (match.division ?? "") === matchDivision;
      const matchesStatus = matchStatus === "all" || (match.status ?? "") === matchStatus;
      return matchesSearch && matchesDivision && matchesStatus;
    });
  }, [matchDivision, matchSearch, matchStatus, matchesLive, matchesRecent]);

  const handleTeamField = (id: string, field: keyof Team, value: string) => {
    setTeams((prev) =>
      prev.map((team) => (team.id === id ? { ...team, [field]: value } : team))
    );
  };

  const handleSaveTeam = async (team: Team) => {
    setStatusMessage(null);
    setErrorMessage(null);

    const response = await fetch(`/api/admin/teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: team.name,
        tag: normalizeNullable(team.tag),
        division: normalizeNullable(team.division),
        logoUrl: normalizeNullable(team.logoUrl),
        statsSummary: normalizeNullable(team.statsSummary),
        mainBrawlers: normalizeNullable(team.mainBrawlers),
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setErrorMessage(payload.error || "Échec de la mise à jour.");
      return;
    }

    setStatusMessage("Équipe mise à jour.");
    await loadData();
  };

  const handleCreateTeam = async () => {
    setStatusMessage(null);
    setErrorMessage(null);
    setTeamFormErrors([]);

    const errors: string[] = [];
    if (!teamForm.name.trim()) {
      errors.push("Le nom est obligatoire.");
    }
    if (teamForm.tag && teamForm.tag.trim().length < 2) {
      errors.push("Le tag doit contenir au moins 2 caractères.");
    }
    if (teamForm.division && !DIVISION_OPTIONS.some((option) => option.value === teamForm.division)) {
      errors.push("La division doit être D1 ou D2.");
    }

    if (errors.length) {
      setTeamFormErrors(errors);
      return;
    }

    const response = await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: teamForm.name,
        tag: normalizeNullable(teamForm.tag),
        division: normalizeNullable(teamForm.division),
        logoUrl: normalizeNullable(teamForm.logoUrl),
        statsSummary: normalizeNullable(teamForm.statsSummary),
        mainBrawlers: normalizeNullable(teamForm.mainBrawlers),
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setErrorMessage(payload.error || "Création impossible.");
      return;
    }

    setStatusMessage("Équipe créée.");
    setTeamForm(emptyTeamForm);
    await loadData();
  };

  const handleDeleteTeam = async (teamId: string) => {
    setStatusMessage(null);
    setErrorMessage(null);

    const response = await fetch(`/api/admin/teams/${teamId}`, { method: "DELETE" });
    const payload = await response.json();

    if (!response.ok) {
      setErrorMessage(payload.error || "Suppression impossible.");
      return;
    }

    setStatusMessage("Équipe supprimée.");
    setTeams((prev) => prev.filter((team) => team.id !== teamId));
  };

  const handleCreateMatch = async () => {
    setStatusMessage(null);
    setErrorMessage(null);
    setMatchFormErrors([]);

    const errors: string[] = [];
    if (!matchForm.scheduledAt || !matchForm.teamAId || !matchForm.teamBId) {
      errors.push("Veuillez renseigner la date et les deux équipes.");
    }
    if (matchForm.teamAId && matchForm.teamBId && matchForm.teamAId === matchForm.teamBId) {
      errors.push("Les deux équipes doivent être différentes.");
    }
    if (matchForm.bestOf && Number(matchForm.bestOf) <= 0) {
      errors.push("Le format Best Of doit être supérieur à 0.");
    }
    if (matchForm.division && !DIVISION_OPTIONS.some((option) => option.value === matchForm.division)) {
      errors.push("La division doit être D1 ou D2.");
    }

    if (errors.length) {
      setMatchFormErrors(errors);
      return;
    }

    const scheduledAt = matchForm.scheduledAt ? new Date(matchForm.scheduledAt).toISOString() : "";

    const response = await fetch("/api/admin/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt,
        division: matchForm.division || null,
        teamAId: matchForm.teamAId,
        teamBId: matchForm.teamBId,
        bestOf: matchForm.bestOf ? Number(matchForm.bestOf) : undefined,
        status: matchForm.status || undefined,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setErrorMessage(payload.error || "Création du match impossible.");
      return;
    }

    setStatusMessage("Match créé.");
    setMatchForm(emptyMatchForm);
    await loadData();
  };

  const handleResultChange = (matchId: string, field: "scoreA" | "scoreB", value: string) => {
    setResultScores((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value },
    }));
  };

  const handleSubmitResult = async (matchId: string) => {
    setStatusMessage(null);
    setErrorMessage(null);

    const scores = resultScores[matchId];
    if (!scores) {
      setErrorMessage("Scores manquants.");
      return;
    }

    const response = await fetch(`/api/admin/matches/${matchId}/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scoreA: scores.scoreA,
        scoreB: scores.scoreB,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setErrorMessage(payload.error || "Validation impossible.");
      return;
    }

    setStatusMessage("Résultat enregistré.");
    await loadData();
  };

  const handleMatchEditChange = (
    matchId: string,
    field: "scheduledAt" | "status" | "bestOf" | "division",
    value: string
  ) => {
    setMatchEdits((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value },
    }));
  };

  const handleQuickStatus = (matchId: string, status: string) => {
    handleMatchEditChange(matchId, "status", status);
  };

  const handleQuickDivision = (matchId: string, division: string) => {
    handleMatchEditChange(matchId, "division", division);
  };

  const handleCopyTeamId = async (teamId: string) => {
    try {
      await navigator.clipboard.writeText(teamId);
      setStatusMessage("Identifiant copié.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Copie impossible.");
    }
  };

  const handleSaveMatch = async (matchId: string) => {
    setStatusMessage(null);
    setErrorMessage(null);

    const edits = matchEdits[matchId];
    if (!edits) {
      setErrorMessage("Aucune modification à enregistrer.");
      return;
    }

    const payload: Record<string, string | number> = {};

    if (edits.scheduledAt) {
      payload.scheduledAt = new Date(edits.scheduledAt).toISOString();
    }
    if (edits.status) {
      payload.status = edits.status;
    }
    if (edits.bestOf) {
      payload.bestOf = Number(edits.bestOf);
    }
    if (edits.division) {
      payload.division = edits.division;
    }

    if (Object.keys(payload).length === 0) {
      setErrorMessage("Aucune modification à enregistrer.");
      return;
    }

    const response = await fetch(`/api/admin/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      setErrorMessage(result.error || "Mise à jour impossible.");
      return;
    }

    setStatusMessage("Match mis à jour.");
    await loadData();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin Control</p>
          <h1 className="text-2xl font-semibold text-white">Panneau d'administration LFN</h1>
          <p className="text-sm text-slate-400">
            Pilotez les équipes, matchs et résultats depuis un seul écran.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
            onClick={refreshData}
          >
            {refreshing ? "Actualisation..." : "Actualiser"}
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm ${
                activeTab === "teams"
                  ? "bg-emerald-400/90 text-slate-900"
                  : "bg-white/5 text-slate-200"
              }`}
              onClick={() => setActiveTab("teams")}
            >
              Équipes
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm ${
                activeTab === "matches"
                  ? "bg-emerald-400/90 text-slate-900"
                  : "bg-white/5 text-slate-200"
              }`}
              onClick={() => setActiveTab("matches")}
            >
              Matchs
            </button>
          </div>
        </div>
      </header>

      {statusMessage ? <p className="text-sm text-emerald-300">{statusMessage}</p> : null}
      {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}
      {loading ? <p className="text-sm text-slate-400">Chargement...</p> : null}

      {activeTab === "teams" ? (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {teamSummary.map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
                {card.helper ? <p className="text-xs text-slate-400">{card.helper}</p> : null}
              </div>
            ))}
          </div>

          <div className="section-card space-y-4">
            <h2 className="text-lg font-semibold text-white">Nouvelle équipe</h2>
            {teamFormErrors.length ? (
              <ul className="list-disc space-y-1 pl-4 text-xs text-rose-300">
                {teamFormErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
            <div className="grid gap-3 md:grid-cols-4">
              <input
                value={teamForm.name}
                onChange={(event) =>
                  setTeamForm((prev) => ({ ...prev, name: sanitizeInput(event.target.value) }))
                }
                placeholder="Nom"
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
              <input
                value={teamForm.tag}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, tag: event.target.value }))}
                placeholder="Tag"
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
              <select
                value={teamForm.division}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, division: event.target.value }))}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              >
                <option value="">Division</option>
                {DIVISION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={teamForm.logoUrl}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
                placeholder="Logo URL"
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <textarea
                value={teamForm.statsSummary}
                onChange={(event) =>
                  setTeamForm((prev) => ({ ...prev, statsSummary: event.target.value }))
                }
                placeholder="Stats personnalisées"
                className="min-h-[96px] rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
              <textarea
                value={teamForm.mainBrawlers}
                onChange={(event) =>
                  setTeamForm((prev) => ({ ...prev, mainBrawlers: event.target.value }))
                }
                placeholder="Main brawlers (séparés par des virgules)"
                className="min-h-[96px] rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
            </div>
            <button
              type="button"
              onClick={handleCreateTeam}
              className="inline-flex items-center justify-center rounded-full bg-emerald-400/90 px-5 py-2 text-sm font-semibold text-slate-900"
            >
              Ajouter l'équipe
            </button>
          </div>

          <div className="section-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Équipes</h2>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={teamSearch}
                  onChange={(event) => setTeamSearch(event.target.value)}
                  placeholder="Rechercher une équipe"
                  className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-white"
                />
                <select
                  value={teamDivision}
                  onChange={(event) => setTeamDivision(event.target.value)}
                  className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-white"
                >
                  <option value="all">Toutes divisions</option>
                  {DIVISION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={teamSortKey}
                  onChange={(event) => setTeamSortKey(event.target.value as "name" | "wins" | "points")}
                  className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-white"
                >
                  <option value="name">Tri: nom</option>
                  <option value="wins">Tri: victoires</option>
                  <option value="points">Tri: points</option>
                </select>
                <button
                  type="button"
                  onClick={() => setTeamSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
                >
                  {teamSortDir === "asc" ? "Ascendant" : "Descendant"}
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {filteredTeams.length === 0 ? (
                <p className="text-sm text-slate-400">Aucune équipe.</p>
              ) : (
                filteredTeams.map((team) => (
                  <div
                    key={team.id}
                    className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{team.name}</p>
                        <p className="text-xs text-slate-400">
                          ID: {team.id} · Division {team.division ?? "?"} · Tag {team.tag ?? "?"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                          {team.wins ?? 0}W - {team.losses ?? 0}L
                        </span>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                          {team.points ?? 0} pts
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <input
                        value={team.name}
                        onChange={(event) => handleTeamField(team.id, "name", event.target.value)}
                        className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                      />
                      <input
                        value={team.tag ?? ""}
                        onChange={(event) => handleTeamField(team.id, "tag", event.target.value)}
                        placeholder="Tag"
                        className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                      />
                      <select
                        value={team.division ?? ""}
                        onChange={(event) => handleTeamField(team.id, "division", event.target.value)}
                        className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                      >
                        <option value="">Division</option>
                        {DIVISION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        value={team.logoUrl ?? ""}
                        onChange={(event) => handleTeamField(team.id, "logoUrl", event.target.value)}
                        placeholder="Logo URL"
                        className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <textarea
                        value={team.statsSummary ?? ""}
                        onChange={(event) =>
                          handleTeamField(team.id, "statsSummary", event.target.value)
                        }
                        placeholder="Stats personnalisées"
                        className="min-h-[72px] rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                      />
                      <textarea
                        value={team.mainBrawlers ?? ""}
                        onChange={(event) =>
                          handleTeamField(team.id, "mainBrawlers", event.target.value)
                        }
                        placeholder="Main brawlers"
                        className="min-h-[72px] rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveTeam(team)}
                        className="rounded-full bg-emerald-400/90 px-4 py-2 text-xs font-semibold text-slate-900"
                      >
                        Sauver
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyTeamId(team.id)}
                        className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
                      >
                        Copier l'ID
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTeam(team.id)}
                        className="rounded-full border border-rose-400/40 px-4 py-2 text-xs text-rose-200"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {matchSummary.map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
                {card.helper ? <p className="text-xs text-slate-400">{card.helper}</p> : null}
              </div>
            ))}
          </div>

          <div className="section-card space-y-4">
            <h2 className="text-lg font-semibold text-white">Créer un match</h2>
            {matchFormErrors.length ? (
              <ul className="list-disc space-y-1 pl-4 text-xs text-rose-300">
                {matchFormErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="datetime-local"
                value={matchForm.scheduledAt}
                onChange={(event) =>
                  setMatchForm((prev) => ({ ...prev, scheduledAt: event.target.value }))
                }
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
              <select
                value={matchForm.division}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, division: event.target.value }))}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              >
                <option value="">Division</option>
                {DIVISION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={matchForm.bestOf}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, bestOf: event.target.value }))}
                placeholder="Best of"
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={matchForm.teamAId}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, teamAId: event.target.value }))}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              >
                <option value="">Équipe A</option>
                {teamOptions.map((team) => (
                  <option key={team.value} value={team.value}>
                    {team.label}
                  </option>
                ))}
              </select>
              <select
                value={matchForm.teamBId}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, teamBId: event.target.value }))}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              >
                <option value="">Équipe B</option>
                {teamOptions.map((team) => (
                  <option key={team.value} value={team.value}>
                    {team.label}
                  </option>
                ))}
              </select>
              <select
                value={matchForm.status}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, status: event.target.value }))}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleCreateMatch}
              className="inline-flex items-center justify-center rounded-full bg-emerald-400/90 px-5 py-2 text-sm font-semibold text-slate-900"
            >
              Ajouter le match
            </button>
          </div>

          <div className="section-card space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Pilotage des matchs</h2>
                <p className="text-xs text-slate-400">Filtrez, modifiez ou validez rapidement.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={matchSearch}
                  onChange={(event) => setMatchSearch(event.target.value)}
                  placeholder="Recherche équipe"
                  className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-white"
                />
                <select
                  value={matchDivision}
                  onChange={(event) => setMatchDivision(event.target.value)}
                  className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-white"
                >
                  <option value="all">Toutes divisions</option>
                  {DIVISION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={matchStatus}
                  onChange={(event) => setMatchStatus(event.target.value)}
                  className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-white"
                >
                  <option value="all">Tous statuts</option>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white">En cours / à venir</h2>
              <div className="mt-4 space-y-3">
                {matchesLive.length === 0 ? (
                  <p className="text-sm text-slate-400">Aucun match en cours.</p>
                ) : (
                  matchesLive.map((match) => (
                    <div
                      key={match.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div>
                        <p className="text-sm text-white">
                          {match.teamA.name} vs {match.teamB.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatSchedule(match.scheduledAt)} · {match.status || ""}
                        </p>
                      </div>
                      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-medium ${statusBadgeClass(
                            match.status
                          )}`}
                        >
                          {match.status ?? "pending"}
                        </span>
                        <input
                          type="datetime-local"
                          value={matchEdits[match.id]?.scheduledAt ?? ""}
                          onChange={(event) =>
                            handleMatchEditChange(match.id, "scheduledAt", event.target.value)
                          }
                          className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        />
                        <select
                          value={matchEdits[match.id]?.division ?? ""}
                          onChange={(event) =>
                            handleMatchEditChange(match.id, "division", event.target.value)
                          }
                          className="w-28 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        >
                          <option value="">Division</option>
                          {DIVISION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          value={matchEdits[match.id]?.bestOf ?? ""}
                          onChange={(event) =>
                            handleMatchEditChange(match.id, "bestOf", event.target.value)
                          }
                          placeholder="Best of"
                          className="w-20 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        />
                        <select
                          value={matchEdits[match.id]?.status ?? ""}
                          onChange={(event) =>
                            handleMatchEditChange(match.id, "status", event.target.value)
                          }
                          className="w-28 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          {STATUS_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleQuickStatus(match.id, option.value)}
                              className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-200"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        <input
                          value={resultScores[match.id]?.scoreA ?? ""}
                          onChange={(event) =>
                            handleResultChange(match.id, "scoreA", event.target.value)
                          }
                          placeholder="Score A"
                          className="w-20 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        />
                        <input
                          value={resultScores[match.id]?.scoreB ?? ""}
                          onChange={(event) =>
                            handleResultChange(match.id, "scoreB", event.target.value)
                          }
                          placeholder="Score B"
                          className="w-20 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSubmitResult(match.id)}
                          className="rounded-full bg-emerald-400/90 px-4 py-2 text-xs font-semibold text-slate-900"
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveMatch(match.id)}
                          className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
                        >
                          Mettre à jour
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white">Récents</h2>
              <div className="mt-4 space-y-3">
                {matchesRecent.length === 0 ? (
                  <p className="text-sm text-slate-400">Aucun match récent.</p>
                ) : (
                  matchesRecent.map((match) => (
                    <div
                      key={match.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div>
                        <p className="text-sm text-white">
                          {match.teamA.name} {match.scoreA ?? "-"} - {match.scoreB ?? "-"} {match.teamB.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatSchedule(match.scheduledAt)} · {match.status || ""}
                        </p>
                      </div>
                      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-medium ${statusBadgeClass(
                            match.status
                          )}`}
                        >
                          {match.status ?? "pending"}
                        </span>
                        <input
                          type="datetime-local"
                          value={matchEdits[match.id]?.scheduledAt ?? ""}
                          onChange={(event) =>
                            handleMatchEditChange(match.id, "scheduledAt", event.target.value)
                          }
                          className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        />
                        <select
                          value={matchEdits[match.id]?.division ?? ""}
                          onChange={(event) =>
                            handleMatchEditChange(match.id, "division", event.target.value)
                          }
                          className="w-28 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        >
                          <option value="">Division</option>
                          {DIVISION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          value={matchEdits[match.id]?.bestOf ?? ""}
                          onChange={(event) =>
                            handleMatchEditChange(match.id, "bestOf", event.target.value)
                          }
                          placeholder="Best of"
                          className="w-20 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        />
                        <select
                          value={matchEdits[match.id]?.status ?? ""}
                          onChange={(event) =>
                            handleMatchEditChange(match.id, "status", event.target.value)
                          }
                          className="w-28 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          {DIVISION_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleQuickDivision(match.id, option.value)}
                              className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-200"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        <input
                          value={resultScores[match.id]?.scoreA ?? String(match.scoreA ?? "")}
                          onChange={(event) =>
                            handleResultChange(match.id, "scoreA", event.target.value)
                          }
                          placeholder="Score A"
                          className="w-20 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        />
                        <input
                          value={resultScores[match.id]?.scoreB ?? String(match.scoreB ?? "")}
                          onChange={(event) =>
                            handleResultChange(match.id, "scoreB", event.target.value)
                          }
                          placeholder="Score B"
                          className="w-20 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSubmitResult(match.id)}
                          className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
                        >
                          Mettre à jour score
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveMatch(match.id)}
                          className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
                        >
                          Mettre à jour match
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {filteredMatches.length === 0 ? (
              <p className="text-xs text-slate-400">Aucun match ne correspond aux filtres.</p>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                <p className="font-semibold text-white">Matches filtrés</p>
                <ul className="mt-2 space-y-1">
                  {filteredMatches.slice(0, 8).map((match) => (
                    <li key={`filtered-${match.id}`} className="flex items-center justify-between">
                      <span>
                        {match.teamA.name} vs {match.teamB.name}
                      </span>
                      <span className="text-slate-400">
                        {match.division ?? "?"} · {match.status ?? "pending"}
                      </span>
                    </li>
                  ))}
                </ul>
                {filteredMatches.length > 8 ? (
                  <p className="mt-2 text-slate-400">
                    +{filteredMatches.length - 8} match(s) supplémentaires.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
