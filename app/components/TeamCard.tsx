import Link from "next/link";
import type { SiteTeam } from "../lib/site-types";

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function TeamCard({ team }: { team: SiteTeam }) {
  return (
    <Link
      href={`/equipes/${team.id}`}
      className="group flex items-center gap-4 rounded-[12px] bg-white/[0.04] px-5 py-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08] animate-in"
    >
      {team.logoUrl ? (
        <img
          src={team.logoUrl}
          alt={`Logo ${team.name}`}
          className="h-12 w-12 rounded-[10px] object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-white/10 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
          {getInitials(team.name)}
        </div>
      )}
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
          {team.division ?? "—"}
        </p>
        <p className="text-sm font-semibold text-white">{team.name}</p>
      </div>
    </Link>
  );
}
