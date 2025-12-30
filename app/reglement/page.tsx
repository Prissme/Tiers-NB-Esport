import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";

export default async function ReglementPage() {
  const data = await getLfnData();

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Règlement"
          title="Règlement simple, ferme, appliqué"
          description="Cadre clair, décisions appliquées sans débat public."
        />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 text-sm text-slate-200">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Roster</p>
              <p className="mt-2 text-white">
                {data.rules.roster.starters} joueurs titulaires + {data.rules.roster.subsRequired} subs obligatoires.
              </p>
              <p className="mt-2 text-xs text-slate-400">Coach optionnel. Roster figé après validation.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Départage</p>
              <p className="mt-2 text-white">Égalités départagées au {data.rules.tiebreak}.</p>
              <p className="mt-2 text-xs text-slate-400">Données publiques, calcul transparent.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Retards</p>
              <p className="mt-2 text-white">15 min = 1 set perdu · 20 min = autolose.</p>
              <p className="mt-2 text-xs text-slate-400">Aucune exception sans preuve claire.</p>
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
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Gouvernance</p>
              <p className="mt-2 text-white">
                L’orga statue, applique et clôt les litiges. Autorité assumée.
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Objectif : protéger l’équité et le rythme de la ligue.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-card space-y-4">
        <SectionHeader
          kicker="Sanctions"
          title="Sanctions applicables"
          description="Discipline ferme pour préserver le niveau."
        />
        <div className="grid gap-4 text-sm text-slate-200 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Comportement</p>
            <p className="mt-2 text-white">Toxicité, triche ou abus = exclusion immédiate.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Matches</p>
            <p className="mt-2 text-white">No-show répété = disqualification.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
