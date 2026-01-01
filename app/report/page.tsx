"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import { createSupabaseBrowserClient } from "../../src/lib/supabaseClient";
import type { Team } from "../../src/lib/types";

type PlayerTeam = {
  team_id: string;
  team: Team | null;
};

type Match = {
  id: string;
  scheduled_at: string | null;
  division: string | null;
  match_day: number | null;
  team_a_id: string | null;
  team_b_id: string | null;
  status: string | null;
};

const formatMatchLabel = (match: Match, teams: Record<string, Team>) => {
  const teamA = match.team_a_id ? teams[match.team_a_id] : null;
  const teamB = match.team_b_id ? teams[match.team_b_id] : null;
  const dateLabel = match.scheduled_at
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(match.scheduled_at))
    : "Date TBD";

  return `${teamA?.tag ?? "Team A"} vs ${teamB?.tag ?? "Team B"} · ${dateLabel}`;
};

export default function ReportPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [playerTeams, setPlayerTeams] = useState<PlayerTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [notes, setNotes] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPlayerContext = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setErrorMessage("Veuillez vous connecter pour soumettre un rapport.");
      setLoading(false);
      return;
    }

    const { data: playerByAuth } = await supabase
      .from("players")
      .select("id")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();

    const { data: playerByUserId } = await supabase
      .from("players")
      .select("id")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    const playerId = playerByAuth?.id ?? playerByUserId?.id;

    if (!playerId) {
      setErrorMessage("Aucun profil joueur associé à ce compte.");
      setLoading(false);
      return;
    }

    const { data: teamMembers, error: teamError } = await supabase
      .from("team_members")
      .select("team_id, team:teams(id, tag, logo_url, name)")
      .eq("player_id", playerId);

    if (teamError) {
      setErrorMessage(teamError.message);
      setLoading(false);
      return;
    }

    const teamList = teamMembers ?? [];
    setPlayerTeams(teamList);

    const teamIds = teamList.map((team) => team.team_id);

    const teamMap = teamList.reduce<Record<string, Team>>((acc, teamMember) => {
      if (teamMember.team) {
        acc[teamMember.team.id] = teamMember.team;
      }
      return acc;
    }, {});

    setTeams(teamMap);

    if (teamIds.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select("id, scheduled_at, division, match_day, team_a_id, team_b_id, status")
      .or(`team_a_id.in.(${teamIds.join(",")}),team_b_id.in.(${teamIds.join(",")})`)
      .order("scheduled_at", { ascending: true });

    if (matchError) {
      setErrorMessage(matchError.message);
      setLoading(false);
      return;
    }

    const nextMatches = matchData ?? [];
    setMatches(nextMatches);

    const matchTeamIds = Array.from(
      new Set(
        nextMatches
          .flatMap((match) => [match.team_a_id, match.team_b_id])
          .filter((id): id is string => Boolean(id))
      )
    );

    const missingTeamIds = matchTeamIds.filter((teamId) => !teamMap[teamId]);

    if (missingTeamIds.length > 0) {
      const { data: extraTeams, error: extraTeamError } = await supabase
        .from("teams")
        .select("id, tag, logo_url, name")
        .in("id", missingTeamIds);

      if (extraTeamError) {
        setErrorMessage(extraTeamError.message);
        setLoading(false);
        return;
      }

      extraTeams?.forEach((team) => {
        teamMap[team.id] = team;
      });

      setTeams({ ...teamMap });
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadPlayerContext();
  }, [loadPlayerContext]);

  useEffect(() => {
    if (!selectedMatchId) {
      setSelectedTeamId("");
      return;
    }

    const match = matches.find((item) => item.id === selectedMatchId);
    if (!match) {
      setSelectedTeamId("");
      return;
    }

    const availableTeams = playerTeams
      .map((teamMember) => teamMember.team_id)
      .filter(
        (teamId) => teamId === match.team_a_id || teamId === match.team_b_id
      );

    setSelectedTeamId(availableTeams[0] ?? "");
  }, [matches, playerTeams, selectedMatchId]);

  const availableReportingTeams = useMemo(() => {
    const match = matches.find((item) => item.id === selectedMatchId);
    if (!match) {
      return [];
    }

    return playerTeams
      .map((teamMember) => teamMember.team_id)
      .filter((teamId) => teamId === match.team_a_id || teamId === match.team_b_id);
  }, [matches, playerTeams, selectedMatchId]);

  const handleSubmit = useCallback(async () => {
    setErrorMessage(null);
    setSubmissionStatus(null);

    if (!selectedMatchId || !selectedTeamId) {
      setErrorMessage("Sélectionne un match et une équipe.");
      return;
    }

    const { error } = await supabase.rpc("submit_match_report", {
      match_id: selectedMatchId,
      team_reporting_id: selectedTeamId,
      score_a: Number(scoreA),
      score_b: Number(scoreB),
      notes: notes.trim() || null,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSubmissionStatus("pending");
  }, [notes, scoreA, scoreB, selectedMatchId, selectedTeamId, supabase]);

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          title="Rapport de match"
          description="Soumets le score officiel de ta rencontre pour validation par le staff."
        />

        {loading ? <p className="text-sm text-slate-300">Chargement…</p> : null}
        {errorMessage ? (
          <p className="text-sm text-rose-200">Erreur: {errorMessage}</p>
        ) : null}

        {!loading && playerTeams.length === 0 ? (
          <p className="text-sm text-slate-300">
            Tu n'es pas encore rattaché à une équipe.
          </p>
        ) : null}

        {!loading && playerTeams.length > 0 ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Match
                <select
                  value={selectedMatchId}
                  onChange={(event) => setSelectedMatchId(event.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                >
                  <option value="">Sélectionne un match</option>
                  {matches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {formatMatchLabel(match, teams)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Équipe qui reporte
                <select
                  value={selectedTeamId}
                  onChange={(event) => setSelectedTeamId(event.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                >
                  <option value="">Sélectionne une équipe</option>
                  {availableReportingTeams.map((teamId) => (
                    <option key={teamId} value={teamId}>
                      {teams[teamId]?.tag ?? teams[teamId]?.name ?? teamId}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Score A
                <input
                  type="number"
                  min={0}
                  value={scoreA}
                  onChange={(event) => setScoreA(Number(event.target.value))}
                  className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Score B
                <input
                  type="number"
                  min={0}
                  value={scoreB}
                  onChange={(event) => setScoreB(Number(event.target.value))}
                  className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-[120px] rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                placeholder="Infos utiles, erreurs, justificatifs…"
              />
            </label>

            <button
              type="button"
              onClick={handleSubmit}
              className="w-fit rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-emerald-300"
            >
              Envoyer le rapport
            </button>
          </div>
        ) : null}

        {submissionStatus ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            Rapport soumis: statut {submissionStatus}. Le staff validera le match prochainement.
          </div>
        ) : null}
      </section>
    </div>
  );
}
