"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SectionHeader from "../components/SectionHeader";

type MatchData = {
  id: string;
  status: string | null;
  scheduledAt: string | null;
  playedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  dayLabel: string | null;
  bestOf: number | null;
  scoreA: number | null;
  scoreB: number | null;
  division: string | null;
  teamA: { name: string; tag: string | null };
  teamB: { name: string; tag: string | null };
};

type MatchesError = {
  message: string;
  code?: string | null;
  hint?: string | null;
};

const DEFAULT_RECENT_LIMIT = 10;

const getStatusLabel = (status?: string | null) => {
  switch (status) {
    case "live":
      return "Live";
    case "completed":
      return "Terminé";
    case "scheduled":
      return "À venir";
    default:
      return "À venir";
  }
};

const getStatusBadgeClass = (status?: string | null) => {
  switch (status) {
    case "live":
      return "bg-fuchsia-400/20 text-fuchsia-200";
    case "completed":
      return "bg-slate-500/20 text-slate-200";
    case "scheduled":
      return "bg-sky-400/20 text-sky-200";
    default:
      return "bg-slate-500/20 text-slate-200";
  }
};

const formatMatchDate = (match: MatchData) => {
  const value =
    match.status === "completed"
      ? match.playedAt ?? match.scheduledAt ?? match.createdAt
      : match.scheduledAt ?? match.playedAt ?? match.createdAt;
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ScoreLine = ({ match }: { match: MatchData }) => {
  const hasScore = match.scoreA !== null || match.scoreB !== null;
  if (!hasScore) return null;
  return (
    <span className="text-xs text-slate-200">
      Score: {match.scoreA ?? "-"} - {match.scoreB ?? "-"}
    </span>
  );
};

const MatchSkeleton = () => (
  <div className="space-y-3">
    {[...Array(3)].map((_, index) => (
      <div
        key={`skeleton-${index}`}
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
      >
        <div className="space-y-2">
          <div className="h-4 w-40 rounded-full bg-white/10" />
          <div className="h-3 w-56 rounded-full bg-white/10" />
        </div>
        <div className="h-6 w-20 rounded-full bg-white/10" />
      </div>
    ))}
  </div>
);

export default function MatchesContent() {
  const [liveMatches, setLiveMatches] = useState<MatchData[]>([]);
  const [recentMatches, setRecentMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MatchesError | null>(null);
  const [recentLimit, setRecentLimit] = useState(DEFAULT_RECENT_LIMIT);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [liveResponse, recentResponse] = await Promise.all([
        fetch(`/api/site/matches?status=live&limit=20`, { cache: "no-store" }),
        fetch(`/api/site/matches?status=recent&limit=${recentLimit}`, { cache: "no-store" }),
      ]);

      const livePayload = await liveResponse.json();
      const recentPayload = await recentResponse.json();

      if (!liveResponse.ok || !recentResponse.ok) {
        const payload = !liveResponse.ok ? livePayload : recentPayload;
        if (payload?.error && typeof payload.error === "object") {
          setError({
            message: payload.error.message ?? "Impossible de charger les matchs.",
            code: payload.error.code ?? null,
            hint: payload.error.hint ?? null,
          });
        } else {
          setError({
            message:
              typeof payload?.error === "string"
                ? payload.error
                : "Impossible de charger les matchs.",
          });
        }
        return;
      }

      setLiveMatches(Array.isArray(livePayload?.matches) ? livePayload.matches : []);
      setRecentMatches(Array.isArray(recentPayload?.matches) ? recentPayload.matches : []);
    } catch (fetchError) {
      setError({
        message: fetchError instanceof Error ? fetchError.message : "Erreur inattendue.",
      });
    } finally {
      setLoading(false);
    }
  }, [recentLimit]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const recentByDay = useMemo(
    () =>
      recentMatches.reduce<Record<string, MatchData[]>>((acc, match) => {
        const day = match.dayLabel ?? "—";
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(match);
        return acc;
      }, {}),
    [recentMatches]
  );

  return (
    <>
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="En cours"
          title="Matchs live"
          description="Suivi en temps réel."
        />
        {loading ? (
          <MatchSkeleton />
        ) : error ? (
          <div className="space-y-2 text-sm text-rose-300">
            <p>Impossible de charger les matchs: {error.message}</p>
            {(error.code || error.hint) && (
              <p className="text-xs text-rose-200/80">
                {[error.code ? `Code: ${error.code}` : null, error.hint ? `Hint: ${error.hint}` : null]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            )}
            <button
              type="button"
              onClick={loadMatches}
              className="rounded-full border border-rose-300/40 px-4 py-2 text-xs text-rose-200"
            >
              Réessayer
            </button>
          </div>
        ) : liveMatches.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun match en cours.</p>
        ) : (
          <div className="space-y-3">
            {liveMatches.map((match) => (
              <div
                key={match.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="space-y-1">
                  <p className="text-sm text-white">
                    {match.teamA.name} vs {match.teamB.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>{match.division ?? "—"}</span>
                    <span>·</span>
                    <span>Day {match.dayLabel ?? "—"}</span>
                    <span>·</span>
                    <span>{formatMatchDate(match)}</span>
                  </div>
                  <ScoreLine match={match} />
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                    match.status
                  )}`}
                >
                  {getStatusLabel(match.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Récents"
          title="Scores officiels"
          description="Résultats Day 1 / Day 2."
        />
        {loading ? (
          <MatchSkeleton />
        ) : error ? (
          <div className="space-y-2 text-sm text-rose-300">
            <p>Impossible de charger les matchs: {error.message}</p>
            {(error.code || error.hint) && (
              <p className="text-xs text-rose-200/80">
                {[error.code ? `Code: ${error.code}` : null, error.hint ? `Hint: ${error.hint}` : null]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            )}
            <button
              type="button"
              onClick={loadMatches}
              className="rounded-full border border-rose-300/40 px-4 py-2 text-xs text-rose-200"
            >
              Réessayer
            </button>
          </div>
        ) : recentMatches.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun match récent.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(recentByDay).map(([dayLabel, matches]) => (
              <div key={dayLabel} className="overflow-hidden rounded-2xl border border-white/10">
                <div className="bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.35em] text-slate-400">
                  {dayLabel}
                </div>
                <div className="divide-y divide-white/10">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="space-y-1">
                        <p className="text-sm text-white">
                          {match.teamA.name} {match.scoreA ?? "-"} - {match.scoreB ?? "-"}{" "}
                          {match.teamB.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span>{match.division ?? "—"}</span>
                          <span>·</span>
                          <span>Day {match.dayLabel ?? "—"}</span>
                          <span>·</span>
                          <span>{formatMatchDate(match)}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px]">
                          BO{match.bestOf ?? "-"}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-medium ${getStatusBadgeClass(
                            match.status
                          )}`}
                        >
                          {getStatusLabel(match.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setRecentLimit((prev) => prev + DEFAULT_RECENT_LIMIT)}
                className="rounded-full border border-white/10 px-5 py-2 text-xs text-slate-200"
              >
                Voir plus
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
