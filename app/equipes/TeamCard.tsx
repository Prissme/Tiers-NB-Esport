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
    <article className="group relative min-h-[360px] overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-8 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.9)] backdrop-blur-2xl">
      {team.logoUrl && !logoFailed ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-30 mix-blend-screen"
          style={{
            backgroundImage: `url(${team.logoUrl})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950/20 via-slate-950/60 to-slate-950/80" />
      <div className="pointer-events-none absolute -top-12 right-0 h-40 w-40 rounded-full bg-fuchsia-400/20 blur-3xl transition-opacity duration-500 group-hover:opacity-90" />
      <div className="relative flex items-center gap-5">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-white/20 bg-slate-900/60 backdrop-blur">
          {team.logoUrl && !logoFailed ? (
            <img
              src={team.logoUrl}
              alt={`Logo ${team.name}`}
              className="h-full w-full object-contain p-3"
              onError={() => setLogoFailed(true)}
              loading="lazy"
            />
          ) : (
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">
              {initials}
            </span>
          )}
        </div>
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
            {team.division ?? "Division"}
          </p>
          <h3 className="text-lg font-semibold text-white">{team.name}</h3>
          <p className="text-sm text-slate-300">{team.tag ?? "Tag"}</p>
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">Wins</p>
          <p className="mt-2 text-base font-semibold text-white">{team.wins ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">Losses</p>
          <p className="mt-2 text-base font-semibold text-white">{team.losses ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">Points</p>
          <p className="mt-2 text-base font-semibold text-white">{team.points ?? "-"}</p>
        </div>
      </div>

      {team.statsSummary ? (
        <div className="relative mt-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">Stats</p>
          <p className="mt-2 text-sm text-white">{team.statsSummary}</p>
        </div>
      ) : null}

      {mainBrawlers.length > 0 ? (
        <div className="relative mt-4 space-y-2">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">Main brawlers</p>
          <div className="flex flex-wrap gap-2">
            {mainBrawlers.map((brawler) => (
              <span
                key={brawler}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-slate-200 backdrop-blur"
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
