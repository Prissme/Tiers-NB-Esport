import type { Metadata } from "next";
import SectionHeader from "../components/SectionHeader";
import StandingsClient from "./StandingsClient";

export const metadata: Metadata = {
  title: "Classements",
  description: "Classement disponible après validation officielle.",
};

export default function ClassementPage() {
  return (
    <div className="space-y-14">
      <section className="motion-field p-10">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Classement"
            title="Classement officiel"
            description="Le classement sera publié après validation officielle."
          />
        </div>
      </section>

      <StandingsClient />
    </div>
  );
}
