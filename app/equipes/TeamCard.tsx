"use client";

import { useMemo, useState } from "react";
import type { TeamInfo } from "../lib/teams";

const buildGradient = (team: TeamInfo) => {
  return `linear-gradient(135deg, ${team.colors.primary}33, ${team.colors.secondary}cc)`;
};

const buildAccent = (team: TeamInfo) => {
  return `linear-gradient(135deg, ${team.colors.primary}, ${team.colors.accent})`;
};

const getInitials = (name: string) => {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("");
  return letters.slice(0, 2).toUpperCase();
};

export default function TeamCard({ team }: { team: TeamInfo }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const initials = useMemo(() => getInitials(team.name), [team.name]);
  const gradient = useMemo(() => buildGradient(team), [team]);
  const accent = useMemo(() => buildAccent(team), [team]);
  const hasCover = team.coverUrl && !coverFailed;
  const hasLogo = team.logoUrl && !logoFailed;

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-[0_25px_80px_-60px_rgba(15,23,42,0.8)]">
      <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
        <div
          className="absolute -left-24 top-6 h-48 w-48 rounded-full blur-3xl"
          style={{ background: `${team.colors.accent}33` }}
        />
        <div
          className="absolute -bottom-20 right-0 h-52 w-52 rounded-full blur-3xl"
          style={{ background: `${team.colors.primary}22` }}
        />
      </div>
      <div className="relative h-40 overflow-hidden">
        {hasCover ? (
          <img
            src={team.coverUrl}
            alt={`Bannière ${team.name}`}
            className="h-full w-full object-cover"
            onError={() => setCoverFailed(true)}
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full" style={{ background: gradient }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
      </div>

      <div className="relative -mt-8 flex items-center gap-4 px-6">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
          {hasLogo ? (
            <img
              src={team.logoUrl}
              alt={`Logo ${team.name}`}
              className="h-full w-full object-cover"
              onError={() => setLogoFailed(true)}
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center" style={{ background: accent }}>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-950">
                {initials}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-300/80">{team.division}</p>
          <h3 className="text-xl font-semibold text-white">{team.name}</h3>
          <p className="text-sm text-slate-300">{team.tagline}</p>
        </div>
      </div>

      <div className="relative space-y-4 px-6 pb-6 pt-5">
        <p className="text-sm text-slate-300">{team.description}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {team.stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">{stat.label}</p>
              <p className="mt-2 text-base font-semibold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400">{stat.detail}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Temps forts</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            {team.highlights.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-emerald-300">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1.2fr,0.8fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Roster</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              {team.roster.map((member) => (
                <li key={member.name} className="flex items-center justify-between gap-3">
                  <span className="text-white">{member.name}</span>
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {member.role}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Signature</p>
            <ul className="mt-3 space-y-2 text-xs text-slate-300">
              {team.roster.map((member) => (
                <li key={`${member.name}-${member.signature}`} className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full" style={{ background: team.colors.accent }} />
                  <span>{member.signature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{team.motto}</p>
          <div className="flex flex-wrap gap-2">
            {team.socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 transition hover:border-white/30 hover:text-white"
              >
                {social.label} · {social.handle}
              </a>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
