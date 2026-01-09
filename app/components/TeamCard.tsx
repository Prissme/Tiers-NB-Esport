import Link from "next/link";
import type { Team } from "../../src/data";

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function TeamCard({ team }: { team: Team }) {
  return (
    <Link
      href={`/equipes/${team.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition hover:border-amber-300/40 hover:bg-white/10"
    >
      {team.logoUrl ? (
        <img
          src={team.logoUrl}
          alt={`Logo ${team.name}`}
          className="h-12 w-12 rounded-2xl object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
          {getInitials(team.name)}
        </div>
      )}
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{team.division}</p>
        <p className="text-sm font-semibold text-white">{team.name}</p>
      </div>
    </Link>
  );
}
