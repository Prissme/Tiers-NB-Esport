"use client";

import { useEffect, useMemo, useState } from "react";
import TeamCard from "../components/TeamCard";
import type { SiteTeam } from "../lib/site-types";
import { teams as fallbackTeams } from "../../src/data";
import type { Locale } from "../lib/i18n";

const divisionOptions: Record<Locale, Array<{ label: string; value: string }>> = {
  fr: [
    { label: "Toutes", value: "all" },
    { label: "D1", value: "D1" },
    { label: "D2", value: "D2" },
  ],
  en: [
    { label: "All", value: "all" },
    { label: "D1", value: "D1" },
    { label: "D2", value: "D2" },
  ],
};

const copy = {
  fr: {
    fallback: "Données de secours (Supabase vide)",
    searchPlaceholder: "Rechercher une équipe",
    noTeams: "Aucune équipe trouvée.",
  },
  en: {
    fallback: "Fallback data (empty Supabase)",
    searchPlaceholder: "Search for a team",
    noTeams: "No teams found.",
  },
};

const mapFallbackTeams = (): SiteTeam[] =>
  fallbackTeams.map((team) => ({
    id: team.id,
    name: team.name,
    tag: null,
    division: team.division,
    logoUrl: team.logoUrl,
    roster: team.roster.map((member) => ({
      role: member.role,
      slot: member.slot ?? null,
      name: member.name,
      mains: member.mains ?? null,
      description: member.role ?? null,
    })),
  }));

export default function TeamsClient({ locale }: { locale: Locale }) {
  const content = copy[locale];
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [search, setSearch] = useState("");
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
        if (mounted) {
          if (nextTeams.length === 0) {
            setTeams(mapFallbackTeams());
            setSource("fallback");
          } else {
            setTeams(nextTeams);
          }
        }
      } catch (error) {
        console.error("teams load error", error);
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

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const divisionMatch = divisionFilter === "all" || team.division === divisionFilter;
      const searchMatch = team.name.toLowerCase().includes(search.toLowerCase());
      return divisionMatch && searchMatch;
    });
  }, [divisionFilter, search, teams]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="skeleton h-12 w-full rounded-full md:w-64" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="skeleton h-9 w-16 rounded-full" />
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="motion-card h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {source === "fallback" ? (
        <p className="text-xs uppercase tracking-[0.3em] text-utility">
          {content.fallback}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={content.searchPlaceholder}
          className="w-full rounded-full bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-utility md:w-64"
        />
        <div className="flex flex-wrap gap-2">
          {divisionOptions[locale].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDivisionFilter(option.value)}
              className={`rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.3em] transition ${
                divisionFilter === option.value
                  ? "bg-amber-400/15 text-amber-100"
                  : "bg-white/5 text-utility"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredTeams.length === 0 ? (
        <p className="text-sm text-muted">{content.noTeams}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredTeams.map((team) => (
            <TeamCard key={team.id} team={team} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
