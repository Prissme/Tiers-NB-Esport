import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";

export default async function FormatPage() {
  const data = await getLfnData();

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Format"
          title="Format officiel LFN"
          description="Structure fixe, sans interprétation." 
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">D1</p>
            <p className="mt-2 text-sm text-white">
              {data.format.d1.teams} équipes · BO{data.format.d1.bo} ·
              {data.format.d1.fearlessDraft ? " Fearless Draft" : ""}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {data.format.d1.matchesPerDay} matchs par jour
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">D2</p>
            <p className="mt-2 text-sm text-white">
              {data.format.d2.teams} équipes · BO{data.format.d2.bo}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {data.format.d2.matchesPerDay} matchs par jour
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Horaires</p>
            <p className="mt-2 text-sm text-white">
              {data.format.times.join(" / ")} (Bruxelles)
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
