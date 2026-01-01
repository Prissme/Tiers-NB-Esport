import Button from "../components/Button";
import Callout from "../components/Callout";
import MetricCard from "../components/MetricCard";
import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";
import { getStatusLabel } from "../lib/lfn-helpers";

export default async function InscriptionPage() {
  const data = await getLfnData();

  return (
    <div className="space-y-12">
      <section className="section-card space-y-8">
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
            <div className="flex flex-wrap gap-3">
              <Button href="/participer" variant="secondary">
                Comment participer
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <MetricCard
              label="Rosters"
              value={`${data.rules.roster.starters}+${data.rules.roster.subsRequired}`}
              detail="Joueurs requis pour une inscription validée."
            />
            <MetricCard
              label="Deadline"
              value={data.season.deadline}
              detail="Prochaine fenêtre officielle d'inscription."
            />
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
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

      <Callout
        title="Préparez votre équipe maintenant"
        description="Les meilleures équipes sont déjà prêtes avant l'ouverture officielle."
        actions={
          <>
            <Button href="/participer" variant="primary">
              Préparer mon roster
            </Button>
            <Button href="/reglement" variant="secondary">
              Lire le règlement
            </Button>
          </>
        }
      />
    </div>
  );
}
