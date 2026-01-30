import type { Metadata } from "next";
import MatchesClient from "./MatchesClient";
import { getLocale } from "../lib/i18n";

export const metadata: Metadata = {
  title: "Matchs",
  description: "Calendrier officiel LFN.",
};

export default function MatchsPage() {
  const locale = getLocale();
  return (
    <div className="page-stack">
      <section className="secondary-section">
        <MatchesClient locale={locale} />
      </section>
    </div>
  );
}
