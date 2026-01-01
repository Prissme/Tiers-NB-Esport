"use client";

import { useEffect, useMemo, useState } from "react";
import { getTeamCoverSrc } from "../lib/team-covers";
import type { TeamInfo } from "../lib/teams";

const fallbackGradients = [
  "from-purple-500/30 via-slate-900/80 to-slate-950",
  "from-sky-500/30 via-slate-900/80 to-slate-950",
  "from-emerald-500/30 via-slate-900/80 to-slate-950",
  "from-amber-500/30 via-slate-900/80 to-slate-950",
];

const getInitials = (name: string) => {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("");

  return letters.slice(0, 2).toUpperCase();
};

const pickGradient = (slug: string) => {
  const index =
    slug.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    fallbackGradients.length;
  return fallbackGradients[index];
};

export default function TeamCard({ team }: { team: TeamInfo }) {
  const [coverSrc, setCoverSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getTeamCoverSrc(team.slug).then((src) => {
      if (active) {
        setCoverSrc(src);
      }
    });

    return () => {
      active = false;
    };
  }, [team.slug]);

  const initials = useMemo(() => getInitials(team.name), [team.name]);
  const gradient = useMemo(() => pickGradient(team.slug), [team.slug]);

  return (
    <article className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
            {coverSrc ? (
              <img
                src={coverSrc}
                alt={`Logo ${team.name}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                  {initials}
                </span>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{team.name}</h3>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              {team.slug}
            </p>
          </div>
        </div>
        <span className="text-xs text-slate-400">{team.division}</span>
      </div>
      <p className="mt-4 text-sm text-slate-300">
        Joueurs: {team.players?.length ? team.players.join(", ") : "Non communiqué"}
      </p>
    </article>
  );
}
