import type { Metadata } from "next";
import HallOfFame from "../components/HallOfFame";
import { getLocale } from "../lib/i18n";

export const metadata: Metadata = {
  title: "Hall Of Fame",
  description: "Les champions de la LFN à travers les saisons.",
};

export default function HallOfFamePage() {
  const locale = getLocale();
  return (
    <div className="page-stack">
      <section className="secondary-section">
        <HallOfFame locale={locale} />
      </section>
    </div>
  );
}
