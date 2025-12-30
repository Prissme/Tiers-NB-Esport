import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";

export default async function FormatPage() {
  const data = await getLfnData();

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Compétition"
          title="Format officiel LFN"
          description="Deux divisions, un cadre unique."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Division 1</p>
            <p className="mt-2 text-sm text-white">
              {data.format.d1.teams} équipes · BO{data.format.d1.bo} ·
              {data.format.d1.fearlessDraft ? " Fearless Draft" : ""}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {data.format.d1.matchesPerDay} matchs par jour
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Division 2</p>
            <p className="mt-2 text-sm text-white">
              {data.format.d2.teams} équipes · BO{data.format.d2.bo}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {data.format.d2.matchesPerDay} matchs par jour
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Règles clés</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-200">
              <li>BO5 pour toutes les rencontres.</li>
              <li>1 set gagné = 1 point au classement.</li>
              <li>Saisons courtes de 6 jours, rythme hebdo.</li>
            </ul>
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
