"use client";

import { useEffect, useMemo, useState } from "react";
import type { SiteTeam } from "../lib/site-types";
import type { Locale } from "../lib/i18n";
import { teams as fallbackTeams } from "../../src/data";
import ReloadingImage from "../components/ReloadingImage";

const copy = {
  fr: {
    fallback: "Données de secours (Supabase vide)",
    empty: "Aucun roster disponible pour le moment.",
    players: "Joueurs",
    coach: "Coach",
    sub: "Remplaçant",
    starter: "Titulaire",
    logoAlt: (teamName: string) => `Logo ${teamName}`,
  },
  en: {
    fallback: "Fallback data (empty Supabase)",
    empty: "No roster available yet.",
    players: "Players",
    coach: "Coach",
    sub: "Sub",
    starter: "Starter",
    logoAlt: (teamName: string) => `${teamName} logo`,
  },
};

const roleOrder = { starter: 0, sub: 1, coach: 2 };

const mapFallbackTeams = (): SiteTeam[] =>
  fallbackTeams.map((team) => ({
    id: team.id,
    name: team.name,
    tag: null,
    division: team.division,
    logoUrl: team.logoUrl,
    roster: team.roster.map((member, index) => ({
      id: `${team.id}-${index}`,
      role: member.role === "coach" ? "coach" : "starter",
      slot: null,
      name: member.name,
      mains: member.role ?? null,
      description: member.role ?? null,
    })),
  }));

export default function RostersClient({ locale }: { locale: Locale }) {
  const content = copy[locale];
  const [teams, setTeams] = useState<SiteTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"supabase" | "fallback">("supabase");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await fetch("/api/site/teams", { cache: "no-store" });
        const payload = (await response.json()) as { teams?: SiteTeam[] };
        const nextTeams = payload.teams ?? [];
        if (!mounted) return;
        if (nextTeams.length === 0) {
          setTeams(mapFallbackTeams());
          setSource("fallback");
          return;
        }
        setTeams(nextTeams);
      } catch (error) {
        console.error("rosters load error", error);
        if (mounted) {
          setTeams(mapFallbackTeams());
          setSource("fallback");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const orderedTeams = useMemo(
    () =>
      [...teams].sort((a, b) => {
        const divisionCompare = (a.division ?? "").localeCompare(b.division ?? "");
        if (divisionCompare !== 0) return divisionCompare;
        return a.name.localeCompare(b.name);
      }),
    [teams]
  );

  const formatRole = (role: string) => {
    if (role === "coach") return content.coach;
    if (role === "sub") return content.sub;
    return content.starter;
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="motion-card h-44" />
        ))}
      </div>
    );
  }

  if (orderedTeams.length === 0) {
    return <p className="text-sm text-muted">{content.empty}</p>;
  }

  return (
    <div className="space-y-4">
      {source === "fallback" ? (
        <p className="text-xs uppercase tracking-[0.3em] text-utility">{content.fallback}</p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {orderedTeams.map((team) => {
          const members = [...(team.roster ?? [])].sort((a, b) => {
            const roleCompare =
              (roleOrder[a.role as keyof typeof roleOrder] ?? 99) -
              (roleOrder[b.role as keyof typeof roleOrder] ?? 99);
            if (roleCompare !== 0) return roleCompare;
            return a.name.localeCompare(b.name);
          });

          return (
            <article
              key={team.id}
              className="rounded-[14px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_14px_35px_rgba(0,0,0,0.25)]"
            >
              <header className="mb-4 flex items-center gap-3">
                {team.logoUrl ? (
                  <ReloadingImage
                    src={team.logoUrl}
                    alt={content.logoAlt(team.name)}
                    className="h-12 w-12 rounded-[10px] object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-white/10 text-xs font-semibold uppercase tracking-[0.15em] text-utility">
                    {(team.tag || team.name).slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-utility">
                    {team.division ?? "—"}
                  </p>
                  <h3 className="text-base font-semibold text-white">{team.name}</h3>
                </div>
              </header>

              <p className="mb-3 text-xs uppercase tracking-[0.3em] text-utility">
                {content.players}
              </p>
              <ul className="space-y-2">
                {members.length === 0 ? (
                  <li className="text-sm text-muted">—</li>
                ) : (
                  members.map((member) => (
                    <li
                      key={member.id ?? `${team.id}-${member.name}`}
                      className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2"
                    >
                      <span className="text-sm text-white">{member.name}</span>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-utility">
                        {formatRole(member.role)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}
