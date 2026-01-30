import type { Metadata } from "next";
import StandingsClient from "./StandingsClient";
import { getLocale } from "../lib/i18n";

export const metadata: Metadata = {
  title: "Classements",
  description: "Classement publié après validation.",
};

export default function ClassementPage() {
  const locale = getLocale();
  return (
    <div className="page-stack page-stack--tight">
      <StandingsClient locale={locale} />
    </div>
  );
}
