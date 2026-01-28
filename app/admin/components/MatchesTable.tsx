"use client";

import { useEffect, useMemo, useState } from "react";
import MatchFormDialog, { type TeamOption } from "./MatchFormDialog";
import { supabase } from "../../../lib/supabaseClient";

export type MatchRecord = {
  id: string;
  day_label: string | null;
  day: number | null;
  round: number | null;
  match_group: string | null;
  phase: string | null;
  division: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  scheduled_at: string | null;
  start_time: string | null;
  status: string | null;
  score_a: number | null;
  score_b: number | null;
  sets_a: number | null;
  sets_b: number | null;
  played_at: string | null;
  proof_url: string | null;
  vod_url: string | null;
  season_id: string | null;
};

type MatchesTableProps = {
  seasonId?: string | null;
  onMatchesUpdated?: (matches: MatchRecord[]) => void;
};

const PAGE_SIZE = 10;

const splitDate = (value?: string | null) => {
  if (!value) return "";
  return value.split("T")[0];
};

const splitTime = (value?: string | null) => {
  if (!value) return "";
  return value.split("T")[1]?.slice(0, 5) ?? "";
};

export default function MatchesTable({ seasonId, onMatchesUpdated }: MatchesTableProps) {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    division: "",
    phase: "",
    status: "",
    day: "",
    search: "",
  });

  const fetchMatches = async () => {
    setLoading(true);
    setErrorMessage(null);

    let query = supabase
      .from("lfn_matches")
      .select("*", { count: "exact" })
      .order("day", { ascending: true })
      .order("round", { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (seasonId) {
      query = query.eq("season_id", seasonId);
    }
    if (filters.division) {
      query = query.eq("division", filters.division);
    }
    if (filters.phase) {
      query = query.eq("phase", filters.phase);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.day) {
      query = query.eq("day", Number(filters.day));
    }
    if (filters.search) {
      query = query.or(
        `match_group.ilike.%${filters.search}%,day_label.ilike.%${filters.search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const loaded = (data ?? []) as MatchRecord[];
    setMatches(loaded);
    setTotalCount(count ?? 0);
    onMatchesUpdated?.(loaded);
    setLoading(false);
  };

  const fetchTeams = async () => {
    const { data } = await supabase
      .from("lfn_teams")
      .select("id,name,tag,division")
      .order("name", { ascending: true });

    setTeams((data ?? []) as TeamOption[]);
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [page, seasonId, filters]);

  const teamMap = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team]));
  }, [teams]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handleDelete = async (matchId: string) => {
    if (!confirm("Supprimer ce match ?")) {
      return;
    }
    const { error } = await supabase.from("lfn_matches").delete().eq("id", matchId);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    fetchMatches();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Matchs</p>
          <h3 className="text-xl font-semibold text-white">Gestion des matchs</h3>
        </div>
        <button
          onClick={() => {
            setSelectedMatch(null);
            setDialogOpen(true);
          }}
          className="surface-pill surface-pill--active px-4 py-2 text-sm font-semibold text-black"
        >
          Créer match
        </button>
      </div>

      <div className="surface-card--flat grid gap-3 md:grid-cols-5">
        <input
          value={filters.search}
          onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          placeholder="Recherche"
          className="surface-input"
        />
        <input
          value={filters.day}
          onChange={(event) => setFilters((prev) => ({ ...prev, day: event.target.value }))}
          placeholder="Day"
          type="number"
          className="surface-input"
        />
        <input
          value={filters.division}
          onChange={(event) => setFilters((prev) => ({ ...prev, division: event.target.value }))}
          placeholder="Division"
          className="surface-input"
        />
        <input
          value={filters.phase}
          onChange={(event) => setFilters((prev) => ({ ...prev, phase: event.target.value }))}
          placeholder="Phase"
          className="surface-input"
        />
        <input
          value={filters.status}
          onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
          placeholder="Status"
          className="surface-input"
        />
      </div>

      {errorMessage ? (
        <div className="surface-alert surface-alert--error">
          {errorMessage}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-[12px] bg-slate-950/70">
        <table className="surface-table text-sm text-white/80">
          <thead className="surface-table__header text-xs uppercase text-white/40">
            <tr>
              <th className="px-4 py-3 text-left">Jour</th>
              <th className="px-4 py-3 text-left">Round</th>
              <th className="px-4 py-3 text-left">Match</th>
              <th className="px-4 py-3 text-left">Phase</th>
              <th className="px-4 py-3 text-left">Division</th>
              <th className="px-4 py-3 text-left">Team A</th>
              <th className="px-4 py-3 text-left">Team B</th>
              <th className="px-4 py-3 text-left">Programmé</th>
              <th className="px-4 py-3 text-left">Start</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-white/40" colSpan={11}>
                  Chargement...
                </td>
              </tr>
            ) : matches.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-white/40" colSpan={11}>
                  Aucun match trouvé.
                </td>
              </tr>
            ) : (
              matches.map((match) => (
                <tr key={match.id} className="surface-table__row">
                  <td className="px-4 py-3">{match.day_label ?? match.day ?? "—"}</td>
                  <td className="px-4 py-3">{match.round ?? "—"}</td>
                  <td className="px-4 py-3">{match.match_group ?? "—"}</td>
                  <td className="px-4 py-3">{match.phase ?? "—"}</td>
                  <td className="px-4 py-3">{match.division ?? "—"}</td>
                  <td className="px-4 py-3">
                    {teamMap.get(match.team_a_id ?? "")?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {teamMap.get(match.team_b_id ?? "")?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">{splitDate(match.scheduled_at)} {splitTime(match.scheduled_at)}</td>
                  <td className="px-4 py-3">{splitDate(match.start_time)} {splitTime(match.start_time)}</td>
                  <td className="px-4 py-3">
                    <span className="surface-chip surface-chip--muted">
                      {match.status ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedMatch(match);
                          setDialogOpen(true);
                        }}
                        className="surface-pill px-3 py-1 text-xs text-white/70 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(match.id)}
                        className="surface-pill px-3 py-1 text-xs text-red-200 hover:text-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-white/60">
        <span>
          Page {page + 1} / {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            disabled={page === 0}
            className="surface-pill px-3 py-1 disabled:opacity-40"
          >
            Précédent
          </button>
          <button
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
            disabled={page >= totalPages - 1}
            className="surface-pill px-3 py-1 disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      </div>

      <MatchFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={fetchMatches}
        teams={teams}
        seasonId={seasonId}
        initialValues={
          selectedMatch
            ? {
                id: selectedMatch.id,
                day: selectedMatch.day ?? 1,
                dayLabel: selectedMatch.day_label ?? "",
                round: selectedMatch.round ?? null,
                matchGroup: selectedMatch.match_group ?? "",
                phase: selectedMatch.phase ?? "",
                division: selectedMatch.division ?? "",
                teamAId: selectedMatch.team_a_id ?? "",
                teamBId: selectedMatch.team_b_id ?? "",
                status: selectedMatch.status ?? "scheduled",
                scheduledDate: splitDate(selectedMatch.scheduled_at),
                scheduledTime: splitTime(selectedMatch.scheduled_at),
                startDate: splitDate(selectedMatch.start_time),
                startTime: splitTime(selectedMatch.start_time),
                playedDate: splitDate(selectedMatch.played_at),
                playedTime: splitTime(selectedMatch.played_at),
                scoreA: selectedMatch.score_a ?? null,
                scoreB: selectedMatch.score_b ?? null,
                setsA: selectedMatch.sets_a ?? null,
                setsB: selectedMatch.sets_b ?? null,
                proofUrl: selectedMatch.proof_url ?? "",
                vodUrl: selectedMatch.vod_url ?? "",
                seasonId: selectedMatch.season_id ?? seasonId ?? null,
              }
            : null
        }
      />
    </div>
  );
}
