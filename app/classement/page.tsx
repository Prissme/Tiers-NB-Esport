import type { Metadata } from "next";
import PreSeasonBanner from "../components/PreSeasonBanner";
import SectionHeader from "../components/SectionHeader";
import StandingsTable from "../components/StandingsTable";
import { matches, teams } from "../../src/data";
import { buildStandings } from "../lib/standings";

export const metadata: Metadata = {
  title: "Classements",
  description: "Classements officiels LFN, pré-saison puis saison régulière.",
};

export default function ClassementPage() {
  const d1Standings = buildStandings("D1", teams, matches);
  const d2Standings = buildStandings("D2", teams, matches);
  const teamsById = Object.fromEntries(teams.map((team) => [team.id, team]));

  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-14 top-10 h-52 w-52 motion-drift" />
        <div className="motion-orb motion-orb--blue right-0 top-6 h-44 w-44 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Classement"
            title="Classements officiels"
            description="Pré-saison, les points démarrent au premier match." 
          />
          <div className="grid gap-4 md:grid-cols-3">
            {teams.slice(0, 3).map((team, index) => (
              <div key={team.id} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Top {index + 1}</p>
                <p className="mt-3 text-sm text-white">{team.name}</p>
                <p className="mt-2 text-xs text-amber-200/80">{team.division}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {(["D1", "D2"] as const).map((division) => {
        const standings = division === "D1" ? d1Standings : d2Standings;
        const divisionTeams = teams
          .filter((team) => team.division === division)
          .sort((a, b) => a.name.localeCompare(b.name, "fr"));

        return (
          <section key={division} className="section-card space-y-6">
            <SectionHeader
              kicker={`Division ${division}`}
              title={`Classement ${division}`}
              description="MJ/V/D/Pts et tie-breakers officiels." 
            />
            {!standings.hasResults ? (
              <div className="space-y-4">
                <PreSeasonBanner message="Pré-saison — classement actif dès le premier match officiel." />
                <div className="grid gap-3 md:grid-cols-2">
                  {divisionTeams.map((team) => (
                    <div
                      key={team.id}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                    >
                      {team.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <StandingsTable rows={standings.rows} teamsById={teamsById} />
            )}
          </section>
        );
      })}
    </div>
  );
}
