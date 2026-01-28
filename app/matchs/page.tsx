import type { Metadata } from "next";
import MatchesClient from "./MatchesClient";

export const metadata: Metadata = {
  title: "Matchs",
  description: "Calendrier officiel LFN.",
};

export default function MatchsPage() {
  return (
    <div className="page-stack">
      <section className="secondary-section">
        <MatchesClient />
      </section>
    </div>
  );
}
