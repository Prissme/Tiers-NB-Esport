import type { Metadata } from "next";
import StandingsClient from "./StandingsClient";

export const metadata: Metadata = {
  title: "Classements",
  description: "Classement publié après validation.",
};

export default function ClassementPage() {
  return (
    <div className="content-shell">
      <StandingsClient />
    </div>
  );
}
