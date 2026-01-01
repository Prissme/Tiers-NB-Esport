"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import { createSupabaseBrowserClient } from "../../src/lib/supabaseClient";
import type { Team } from "../../src/lib/types";

type MatchReport = {
  id: string;
  status: string | null;
  match_id: string | null;
  team_reporting_id: string | null;
  score_a: number | null;
  score_b: number | null;
  notes: string | null;
  created_at: string | null;
};

type Match = {
  id: string;
  scheduled_at: string | null;
  division: string | null;
  match_day: number | null;
  team_a_id: string | null;
  team_b_id: string | null;
};

type TeamMap = Record<string, Team>;

type MatchMap = Record<string, Match>;

export default function AdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<MatchReport[]>([]);
  const [matches, setMatches] = useState<MatchMap>({});
  const [teams, setTeams] = useState<TeamMap>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [approvingReportId, setApprovingReportId] = useState<string | null>(null);

  const checkStaffAccess = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      setIsStaff(false);
      return;
    }

    const { data: staffMember } = await supabase
      .from("staff_members")
      .select("id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    setIsStaff(Boolean(staffMember));
  }, [supabase]);

  const fetchPendingReports = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data: reportData, error } = await supabase
      .from("match_reports")
      .select("id, status, match_id, team_reporting_id, score_a, score_b, notes, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const nextReports = reportData ?? [];
    setReports(nextReports);

    const matchIds = Array.from(
      new Set(nextReports.map((report) => report.match_id).filter(Boolean))
    ) as string[];

    const teamIds = Array.from(
      new Set(nextReports.map((report) => report.team_reporting_id).filter(Boolean))
    ) as string[];

    if (matchIds.length > 0) {
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("id, scheduled_at, division, match_day, team_a_id, team_b_id")
        .in("id", matchIds);

      if (matchError) {
        setErrorMessage(matchError.message);
        setLoading(false);
        return;
      }

      const matchMap = (matchData ?? []).reduce<MatchMap>((acc, match) => {
        acc[match.id] = match;
        return acc;
      }, {});

      setMatches(matchMap);

      matchData?.forEach((match) => {
        if (match.team_a_id) {
          teamIds.push(match.team_a_id);
        }
        if (match.team_b_id) {
          teamIds.push(match.team_b_id);
        }
      });
    }

    const uniqueTeamIds = Array.from(new Set(teamIds));

    if (uniqueTeamIds.length > 0) {
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("id, tag, logo_url, name")
        .in("id", uniqueTeamIds);

      if (teamError) {
        setErrorMessage(teamError.message);
        setLoading(false);
        return;
      }

      const teamMap = (teamData ?? []).reduce<TeamMap>((acc, team) => {
        acc[team.id] = team;
        return acc;
      }, {});

      setTeams(teamMap);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    checkStaffAccess();
  }, [checkStaffAccess]);

  useEffect(() => {
    if (isStaff) {
      fetchPendingReports();
    } else {
      setLoading(false);
    }
  }, [fetchPendingReports, isStaff]);

  const handleApprove = useCallback(
    async (reportId: string) => {
      setApprovingReportId(reportId);
      setErrorMessage(null);

      const { error } = await supabase.rpc("approve_match_report", {
        report_id: reportId,
      });

      if (error) {
        setErrorMessage(error.message);
        setApprovingReportId(null);
        return;
      }

      await fetchPendingReports();
      setApprovingReportId(null);
    },
    [fetchPendingReports, supabase]
  );

  if (!isStaff && !loading) {
    return (
      <div className="space-y-10">
        <section className="section-card space-y-6">
          <SectionHeader
            title="Espace admin"
            description="Accès réservé au staff."
          />
          <p className="text-sm text-slate-300">
            Vous n'avez pas les droits nécessaires pour accéder à cette page.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          title="Espace admin"
          description="Validation des rapports de match en attente."
        />

        {loading ? <p className="text-sm text-slate-300">Chargement…</p> : null}
        {errorMessage ? (
          <p className="text-sm text-rose-200">Erreur: {errorMessage}</p>
        ) : null}

        {!loading && reports.length === 0 ? (
          <p className="text-sm text-slate-300">Aucun rapport en attente.</p>
        ) : null}

        <div className="space-y-4">
          {reports.map((report) => {
            const match = report.match_id ? matches[report.match_id] : undefined;
            const teamA = match?.team_a_id ? teams[match.team_a_id] : undefined;
            const teamB = match?.team_b_id ? teams[match.team_b_id] : undefined;
            const reportingTeam = report.team_reporting_id
              ? teams[report.team_reporting_id]
              : undefined;

            return (
              <div
                key={report.id}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
                      {match?.division ?? "Division TBD"}
                      {match?.match_day
                        ? ` · Journée ${match.match_day}`
                        : ""}
                    </p>
                    <div className="text-sm font-semibold text-white">
                      {teamA?.tag ?? "Team A"} vs {teamB?.tag ?? "Team B"}
                    </div>
                    <p className="text-xs text-slate-400">
                      Rapporté par {reportingTeam?.tag ?? "équipe"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">
                      {report.status ?? "pending"}
                    </span>
                    <span className="text-lg font-semibold text-white">
                      {(report.score_a ?? 0).toString()} - {(report.score_b ?? 0).toString()}
                    </span>
                  </div>
                </div>
                {report.notes ? (
                  <p className="mt-3 text-sm text-slate-300">Notes: {report.notes}</p>
                ) : null}
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleApprove(report.id)}
                    disabled={approvingReportId === report.id}
                    className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {approvingReportId === report.id ? "Validation…" : "Approve"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
