import type { Metadata } from "next";
import SectionHeader from "../components/SectionHeader";
import { loadNwcState } from "../../src/lib/nwc/store";
import { emptyState } from "../../src/lib/nwc/swiss";
import NwcBoard from "./NwcBoard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NWC · Swiss Stage",
};

export default async function NwcPage() {
  let state = emptyState();
  try {
    state = await loadNwcState();
  } catch (error) {
    console.error("nwc load error", error);
  }

  return (
    <div className="page-stack">
      <section className="dominant-section space-y-10">
        <div className="relative z-10 space-y-10">
          <SectionHeader
            kicker="NWC"
            title="Swiss Stage"
            description="Le bracket en direct : phase qualificative, puis Swiss top 8. Mis à jour automatiquement."
            tone="dominant"
          />
          <NwcBoard initialState={state} />
        </div>
      </section>
    </div>
  );
}
