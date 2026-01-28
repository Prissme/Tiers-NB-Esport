import type { Metadata } from "next";
import MatchDetailClient from "./MatchDetailClient";

export const metadata: Metadata = {
  title: "Match",
  description: "Programme fixe LFN.",
};

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  return <MatchDetailClient matchId={params.id} />;
}
