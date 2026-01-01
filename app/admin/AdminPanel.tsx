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

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"teams" | "matches">("teams");
  const [teams, setTeams] = useState<Team[]>([]);
  const [matchesLive, setMatchesLive] = useState<Match[]>([]);
  const [matchesRecent, setMatchesRecent] = useState<Match[]>([]);
  const [teamForm, setTeamForm] = useState(emptyTeamForm);
  const [matchForm, setMatchForm] = useState(emptyMatchForm);
  const [matchEdits, setMatchEdits] = useState<
    Record<string, { scheduledAt: string; status: string; bestOf: string; division: string }>
  >({});
  const [resultScores, setResultScores] = useState<Record<string, { scoreA: string; scoreB: string }>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    if (!teamForm.name.trim()) {
      setErrorMessage("Le nom est obligatoire.");
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

    if (!matchForm.scheduledAt || !matchForm.teamAId || !matchForm.teamBId) {
      setErrorMessage("Veuillez renseigner la date et les deux équipes.");
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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-sm ${
            activeTab === "teams" ? "bg-emerald-400/90 text-slate-900" : "bg-white/5 text-slate-200"
          }`}
          onClick={() => setActiveTab("teams")}
        >
          Équipes
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-sm ${
            activeTab === "matches" ? "bg-emerald-400/90 text-slate-900" : "bg-white/5 text-slate-200"
          }`}
          onClick={() => setActiveTab("matches")}
        >
          Matchs
        </button>
      </div>

      {statusMessage ? <p className="text-sm text-emerald-300">{statusMessage}</p> : null}
      {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}
      {loading ? <p className="text-sm text-slate-400">Chargement...</p> : null}

      {activeTab === "teams" ? (
        <section className="space-y-6">
          <div className="section-card space-y-4">
            <h2 className="text-lg font-semibold text-white">Nouvelle équipe</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <input
                value={teamForm.name}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Nom"
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
              <input
                value={teamForm.tag}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, tag: event.target.value }))}
                placeholder="Tag"
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
              <input
                value={teamForm.division}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, division: event.target.value }))}
                placeholder="Division"
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
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
              Ajouter
            </button>
          </div>

          <div className="section-card space-y-4">
            <h2 className="text-lg font-semibold text-white">Équipes</h2>
            <div className="space-y-4">
              {teams.length === 0 ? (
                <p className="text-sm text-slate-400">Aucune équipe.</p>
              ) : (
                teams.map((team) => (
                  <div
                    key={team.id}
                    className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1.2fr,0.8fr,0.8fr,1.2fr,1.5fr,1.5fr,auto]"
                  >
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
                    <input
                      value={team.division ?? ""}
                      onChange={(event) => handleTeamField(team.id, "division", event.target.value)}
                      placeholder="Division"
                      className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                    />
                    <input
                      value={team.logoUrl ?? ""}
                      onChange={(event) => handleTeamField(team.id, "logoUrl", event.target.value)}
                      placeholder="Logo URL"
                      className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                    />
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
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveTeam(team)}
                        className="rounded-full bg-emerald-400/90 px-4 py-2 text-xs font-semibold text-slate-900"
                      >
                        Sauver
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTeam(team.id)}
                        className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
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
          <div className="section-card space-y-4">
            <h2 className="text-lg font-semibold text-white">Créer un match</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="datetime-local"
                value={matchForm.scheduledAt}
                onChange={(event) =>
                  setMatchForm((prev) => ({ ...prev, scheduledAt: event.target.value }))
                }
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
              <input
                value={matchForm.division}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, division: event.target.value }))}
                placeholder="Division"
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
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
              <input
                value={matchForm.status}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, status: event.target.value }))}
                placeholder="Statut"
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
              />
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
                          {match.scheduledAt || "À planifier"} · {match.status || ""}
                        </p>
                      </div>
                      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                        <input
                          type="datetime-local"
                          value={matchEdits[match.id]?.scheduledAt ?? ""}
                          onChange={(event) =>
                            handleMatchEditChange(match.id, "scheduledAt", event.target.value)
                          }
                          className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        />
                        <input
                          value={matchEdits[match.id]?.division ?? ""}
                          onChange={(event) =>
                            handleMatchEditChange(match.id, "division", event.target.value)
                          }
                          placeholder="Division"
                          className="w-24 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        />
                        <input
                          value={matchEdits[match.id]?.bestOf ?? ""}
                          onChange={(event) =>
                            handleMatchEditChange(match.id, "bestOf", event.target.value)
                          }
                          placeholder="Best of"
                          className="w-20 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        />
                        <input
                          value={matchEdits[match.id]?.status ?? ""}
                          onChange={(event) =>
                            handleMatchEditChange(match.id, "status", event.target.value)
                          }
                          placeholder="Statut"
                          className="w-24 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        />
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
                          {match.scheduledAt || ""} · {match.status || ""}
                        </p>
                      </div>
                      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                        <input
                          type="datetime-local"
                          value={matchEdits[match.id]?.scheduledAt ?? ""}
                          onChange={(event) =>
                            handleMatchEditChange(match.id, "scheduledAt", event.target.value)
                          }
                          className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        />
                        <input
                          value={matchEdits[match.id]?.division ?? ""}
                          onChange={(event) =>
                            handleMatchEditChange(match.id, "division", event.target.value)
                          }
                          placeholder="Division"
                          className="w-24 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        />
                        <input
                          value={matchEdits[match.id]?.bestOf ?? ""}
                          onChange={(event) =>
                            handleMatchEditChange(match.id, "bestOf", event.target.value)
                          }
                          placeholder="Best of"
                          className="w-20 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        />
                        <input
                          value={matchEdits[match.id]?.status ?? ""}
                          onChange={(event) =>
                            handleMatchEditChange(match.id, "status", event.target.value)
                          }
                          placeholder="Statut"
                          className="w-24 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        />
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
          </div>
        </section>
      )}
    </div>
  );
}
