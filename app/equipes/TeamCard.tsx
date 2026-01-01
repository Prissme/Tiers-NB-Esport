"use client";

import { useMemo, useState } from "react";

type TeamCardData = {
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

const getInitials = (name: string) => {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("");
  return letters.slice(0, 2).toUpperCase();
};

export default function TeamCard({ team }: { team: TeamCardData }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const initials = useMemo(() => getInitials(team.name), [team.name]);
  const mainBrawlers = useMemo(
    () =>
      team.mainBrawlers
        ?.split(",")
        .map((entry) => entry.trim())
        .filter(Boolean) ?? [],
    [team.mainBrawlers]
  );

  return (
    <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_25px_80px_-60px_rgba(15,23,42,0.8)]">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
          {team.logoUrl && !logoFailed ? (
            <img
              src={team.logoUrl}
              alt={`Logo ${team.name}`}
              className="h-full w-full object-cover"
              onError={() => setLogoFailed(true)}
              loading="lazy"
            />
          ) : (
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              {initials}
            </span>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
            {team.division ?? "Division"}
          </p>
          <h3 className="text-lg font-semibold text-white">{team.name}</h3>
          <p className="text-sm text-slate-300">{team.tag ?? "Tag"}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">Wins</p>
          <p className="mt-2 text-base font-semibold text-white">{team.wins ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">Losses</p>
          <p className="mt-2 text-base font-semibold text-white">{team.losses ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">Points</p>
          <p className="mt-2 text-base font-semibold text-white">{team.points ?? "-"}</p>
        </div>
      </div>

      {team.statsSummary ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">Stats</p>
          <p className="mt-2 text-sm text-white">{team.statsSummary}</p>
        </div>
      ) : null}

      {mainBrawlers.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">Main brawlers</p>
          <div className="flex flex-wrap gap-2">
            {mainBrawlers.map((brawler) => (
              <span
                key={brawler}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
              >
                {brawler}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}
