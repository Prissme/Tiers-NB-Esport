import type { Metadata } from "next";
import MatchDetailClient from "./MatchDetailClient";
import { getLocale } from "../../lib/i18n";

export const metadata: Metadata = {
  title: "Match",
  description: "Programme fixe LFN.",
};

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  const locale = getLocale();
  return <MatchDetailClient matchId={params.id} locale={locale} />;
}
