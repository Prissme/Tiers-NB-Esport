import Callout from "../components/Callout";
import MetricCard from "../components/MetricCard";
import SectionHeader from "../components/SectionHeader";
import { lfnData } from "../lib/lfnData";

export default function FormatPage() {
  const { format } = lfnData;

  return (
    <div className="space-y-12">
      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Compétition"
          title="Format officiel LFN"
          description="BO5, rythme hebdo clair, scoring transparent et structure stable."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Best of" value={`BO${format.bestOf}`} detail="Chaque rencontre suit ce format." />
          <MetricCard label="Points" value="3-1-0" detail={format.pointsSystem} />
          <MetricCard label="Tie-break" value="TB" detail={format.tiebreak} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Horaires</p>
            <div className="mt-3 text-sm text-white">
              <p>Lundi : {format.weeklyRhythm.monday}</p>
              <p>Mercredi : {format.weeklyRhythm.wednesday}</p>
              <p>Vendredi : {format.weeklyRhythm.friday}</p>
              <p>Week-end : {format.weeklyRhythm.weekend}</p>
              <p className="text-xs text-slate-400">{format.weeklyRhythm.breaks}</p>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Structure</p>
            <div className="mt-3 space-y-2 text-sm text-white">
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
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Règles clés</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>BO{format.bestOf} pour toutes les rencontres.</li>
              <li>{format.pointsSystem}.</li>
              <li>Tie-break : {format.tiebreak}.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Préparation"
          title="Ce que les équipes doivent anticiper"
          description="Une bonne préparation passe par la maîtrise du rythme, des drafts et du roster."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Draft",
              detail: "Préparer des compos par map et par scénario.",
            },
            {
              title: "Synergie",
              detail: "Travailler les trio fixes pour réduire les erreurs.",
            },
            {
              title: "Rotation",
              detail: "Identifier les timings clés sur chaque mode.",
            },
            {
              title: "Mental",
              detail: "Tenir la pression sur un BO complet.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{item.title}</p>
              <p className="mt-3 text-sm text-white">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <Callout
        title="Besoin d'un rappel rapide avant un match ?"
        description="Le format officiel est le même pour toutes les divisions : prenez l'habitude et préparez vos drafts."
      />
    </div>
  );
}
