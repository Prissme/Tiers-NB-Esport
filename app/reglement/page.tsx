import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";

export default async function ReglementPage() {
  const data = await getLfnData();

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Rulebook"
          title="Règlement officiel"
          description="Cadre strict. L'inscription vaut acceptation." 
        />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 text-sm text-slate-200">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Roster</p>
              <p className="mt-2 text-white">
                {data.rules.roster.starters} joueurs titulaires + {data.rules.roster.subsRequired} subs obligatoires.
              </p>
              <p className="mt-2 text-xs text-slate-400">Coach optionnel.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Départage</p>
              <p className="mt-2 text-white">Égalités départagées au {data.rules.tiebreak}.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Retards</p>
              <p className="mt-2 text-white">15 min = 1 set perdu · 20 min = autolose.</p>
            </div>
          </div>
          <div className="space-y-4 text-sm text-slate-200">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Format D1</p>
              <p className="mt-2 text-white">
                {data.format.d1.teams} équipes · BO{data.format.d1.bo} ·
                {data.format.d1.fearlessDraft ? " Fearless Draft" : ""}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {data.format.d1.matchesPerDay} matchs par jour.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Format D2</p>
              <p className="mt-2 text-white">
                {data.format.d2.teams} équipes · BO{data.format.d2.bo}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {data.format.d2.matchesPerDay} matchs par jour.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Horaires</p>
              <p className="mt-2 text-white">{data.format.times.join(" / ")} (Bruxelles)</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-card space-y-4">
        <SectionHeader
          kicker="Stats"
          title="Statistiques officielles"
          description="Saisie par l'orga aujourd'hui. Délégation plus tard." 
        />
        <p className="text-sm text-slate-200">
          Les statistiques publiques sont centralisées par l'orga pour garantir la source de vérité.
        </p>
      </section>
    </div>
  );
}
