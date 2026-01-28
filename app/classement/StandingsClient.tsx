"use client";

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import StandingsTable, { type StandingsRow } from "../components/StandingsTable";
import type { SiteStandingsRow, SiteTeam } from "../lib/site-types";
import { teams as fallbackTeams } from "../../src/data";

const mapFallbackTeams = (): SiteTeam[] =>
  fallbackTeams.map((team) => ({
    id: team.id,
    name: team.name,
    tag: null,
    division: team.division,
    logoUrl: team.logoUrl,
  }));

const toStandingsRows = (standings: SiteStandingsRow[]): StandingsRow[] =>
  standings.map((row) => ({
    teamId: row.teamId,
    teamName: row.teamName,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    points: row.pointsTotal ?? row.pointsSets ?? 0,
    matchesPlayed: (row.wins ?? 0) + (row.losses ?? 0),
  }));

export default function StandingsClient() {
  const [standings, setStandings] = useState<SiteStandingsRow[]>([]);
  const [teams, setTeams] = useState<SiteTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"supabase" | "fallback">("supabase");
  const [activeDivision, setActiveDivision] = useState<string | null>(null);

  const teamFallbackStandings = useMemo<SiteStandingsRow[]>(() => {
    return teams.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      teamTag: team.tag ?? null,
      division: team.division ?? "D1",
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      pointsSets: 0,
      pointsAdmin: 0,
      pointsTotal: 0,
    }));
  }, [teams]);

  const standingsToDisplay = standings.length > 0 ? standings : teamFallbackStandings;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [standingsResponse, teamsResponse] = await Promise.all([
          fetch("/api/site/standings", { cache: "no-store" }),
          fetch("/api/site/teams", { cache: "no-store" }),
        ]);
        const standingsPayload = (await standingsResponse.json()) as {
          standings?: SiteStandingsRow[];
        };
        const teamsPayload = (await teamsResponse.json()) as { teams?: SiteTeam[] };
        if (mounted) {
          const nextStandings = standingsPayload.standings ?? [];
          const nextTeams = teamsPayload.teams ?? [];
          if (nextStandings.length === 0 && nextTeams.length === 0) {
            setTeams(mapFallbackTeams());
            setSource("fallback");
          } else {
            setStandings(nextStandings);
            setTeams(nextTeams.length ? nextTeams : mapFallbackTeams());
          }
        }
      } catch (error) {
        console.error("standings load error", error);
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

  const { standingsByDivision, teamsById } = useMemo(() => {
    const teamsMap = Object.fromEntries(teams.map((team) => [team.id, team]));
    const grouped = standingsToDisplay.reduce<Record<string, SiteStandingsRow[]>>((acc, row) => {
      const division = row.division ?? "D1";
      if (!acc[division]) acc[division] = [];
      acc[division].push(row);
      return acc;
    }, {});

    return { standingsByDivision: grouped, teamsById: teamsMap };
  }, [standingsToDisplay, teams]);

  const availableDivisions = useMemo(() => {
    const keys = Object.keys(standingsByDivision);
    const preferred = ["D1", "D2"];
    const preferredOrder = preferred.filter((division) => keys.includes(division));
    const remaining = keys.filter((division) => !preferred.includes(division)).sort();
    return [...preferredOrder, ...remaining];
  }, [standingsByDivision]);

  useEffect(() => {
    if (availableDivisions.length === 0) {
      setActiveDivision(null);
      return;
    }
    if (!activeDivision || !availableDivisions.includes(activeDivision)) {
      setActiveDivision(availableDivisions[0]);
    }
  }, [availableDivisions, activeDivision]);

  if (loading) {
    return (
      <section className="section-card dominant-section space-y-6">
        <div className="space-y-2">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-6 w-48" />
        </div>
        <div className="motion-card h-48" />
      </section>
    );
  }

  if (standingsToDisplay.length === 0) {
    return (
      <section className="section-card dominant-section space-y-4">
        <SectionHeader
          kicker="Information"
          title="Publication à venir"
          description="Programme public pendant la validation."
          tone="dominant"
        />
        <p className="text-sm text-muted">
          Résultats non publics. Classement publié après validation de l'organisation.
        </p>
      </section>
    );
  }

  return (
    <section className="section-card dominant-section space-y-10 border-0 bg-white/[0.03]">
      <SectionHeader
        kicker="Classement"
        title="Classement officiel"
        description={
          standings.length === 0
            ? "Liste des équipes enregistrées."
            : "Publication officielle."
        }
        tone="dominant"
      />
      {source === "fallback" ? (
        <p className="text-xs uppercase tracking-[0.3em] text-utility">
          Données de secours (Supabase vide)
        </p>
      ) : null}
      {availableDivisions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          {availableDivisions.map((division) => {
            const isActive = division === activeDivision;
            return (
              <button
                key={division}
                type="button"
                onClick={() => setActiveDivision(division)}
                className={`division-toggle ${isActive ? "division-toggle--active" : ""}`}
              >
                {division}
              </button>
            );
          })}
        </div>
      ) : null}
      {(activeDivision ? [[activeDivision, standingsByDivision[activeDivision] ?? []]] : []).map(
        ([division, rows]) => (
          <div key={division} className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-utility">
              {division}
            </p>
            <StandingsTable rows={toStandingsRows(rows)} teamsById={teamsById} />
          </div>
        )
      )}
    </section>
  );
}
