import SectionHeader from "../components/SectionHeader";
import { lfnData } from "../lib/lfnData";

export default function FormatPage() {
  const { format } = lfnData;

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Compétition"
          title="Format officiel LFN"
          description="BO5, rythme hebdo clair, scoring transparent."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Règles clés</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-200">
              <li>BO{format.bestOf} pour toutes les rencontres.</li>
              <li>{format.pointsSystem}.</li>
              <li>Tie-break : {format.tiebreak}.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Horaires</p>
            <div className="mt-2 text-sm text-white">
              <p>Lundi : {format.weeklyRhythm.monday}</p>
              <p>Mercredi : {format.weeklyRhythm.wednesday}</p>
              <p>Vendredi : {format.weeklyRhythm.friday}</p>
              <p>Week-end : {format.weeklyRhythm.weekend}</p>
              <p className="text-xs text-slate-400">{format.weeklyRhythm.breaks}</p>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Structure</p>
            <div className="mt-2 space-y-2 text-sm text-white">
              <p>
                {format.divisions.d1.label} : {format.divisions.d1.teams} équipes
              </p>
              <p>
                {format.divisions.d2.label} : {format.divisions.d2.teams} équipes
              </p>
              <p>
                Roster : {format.roster.starters} joueurs + jusqu’à {format.roster.subsMax} subs
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
