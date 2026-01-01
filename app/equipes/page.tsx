import SectionHeader from "../components/SectionHeader";
import TeamCard from "./TeamCard";
import { teams } from "../lib/teams";

export default function EquipesPage() {
  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Équipes"
          title="Rosters officiels"
          description="Liste publiée dès confirmation officielle."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => (
            <TeamCard key={team.slug} team={team} />
          ))}
        </div>
      </section>
    </div>
  );
}
