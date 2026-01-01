import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";
import MatchesClient from "./MatchesClient";

export default async function MatchsPage() {
  const data = await getLfnData();
  const timezoneLabel = data.season.timezone || "Europe/Brussels";

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Matchs"
          title="Planning & résultats"
          description="Suivez la saison en un coup d'œil : prochains matchs et scores officiels."
        />
      </section>
      <MatchesClient
        matches={data.matches}
        results={data.results}
        timezoneLabel={timezoneLabel}
      />
    </div>
  );
}
