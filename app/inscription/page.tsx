import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";
import { getStatusLabel } from "../lib/lfn-helpers";
export default async function InscriptionPage() {
  const data = await getLfnData();

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Inscriptions"
          title="Inscriptions fermées"
          description="Les inscriptions rouvriront à l'annonce officielle."
        />
        <div className="grid gap-6 md:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4 text-sm text-slate-200">
            <p>
              Statut actuel : <span className="text-white">{getStatusLabel(data.season.status)}</span>
            </p>
            <p>
              Inscriptions fermées. La ligue est en cours et les équipes sont déjà verrouillées.
            </p>
            <p className="text-slate-400">
              Communication officielle LFN pour préparer votre équipe et recevoir l&apos;ouverture
              des prochaines inscriptions.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">À retenir</p>
            <ul className="mt-3 space-y-2">
              <li>Suivre l&apos;actualité officielle LFN.</li>
              <li>Préparer un roster complet à l&apos;avance.</li>
              <li>Anticiper les horaires Bruxelles.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section-card space-y-4">
        <SectionHeader
          kicker="Rappels"
          title="Points clés"
          description="Ce qui compte pour la prochaine saison."
        />
        <ul className="grid gap-3 text-sm text-slate-200 md:grid-cols-2">
          <li>Rosters complets obligatoires dès l&apos;ouverture.</li>
          <li>Les retards entraînent des sanctions automatiques.</li>
          <li>Départage des égalités au winrate.</li>
          <li>Stats centralisées par l&apos;orga.</li>
        </ul>
      </section>
    </div>
  );
}
