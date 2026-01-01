import Button from "../components/Button";
import Callout from "../components/Callout";
import MetricCard from "../components/MetricCard";
import SectionHeader from "../components/SectionHeader";
import Timeline from "../components/Timeline";
import { getLfnData } from "../lib/data-store";
import { formatDeadlineWithZone } from "../lib/lfn-helpers";

export default async function ParticiperPage() {
  const data = await getLfnData();
  const deadlineLabel = formatDeadlineWithZone(data.season.deadline, data.season.timezone);

  return (
    <div className="space-y-12">
      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Participer"
          title="Comment rejoindre la ligue"
          highlight="sans stress"
          description="Trois étapes simples pour préparer votre roster et intégrer la prochaine saison."
        />
        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <Timeline
            items={[
              {
                title: "Suivre la communication",
                description: "Restez au courant des annonces officielles sur le Discord LFN.",
                badge: "Étape 01",
              },
              {
                title: "Composer un roster",
                description: `${data.rules.roster.starters} titulaires + ${data.rules.roster.subsRequired} remplaçants requis.`,
                badge: "Étape 02",
              },
              {
                title: "Envoyer l'inscription",
                description: `Deadline actuelle : ${deadlineLabel}.`,
                badge: "Étape 03",
              },
            ]}
          />
          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Checklist rapide</p>
            <ul className="space-y-3">
              <li>Roster complet validé.</li>
              <li>Disponibilités alignées sur les horaires Bruxelles.</li>
              <li>Lecture rapide du règlement.</li>
              <li>Nom d&apos;équipe cohérent et unique.</li>
            </ul>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button href="/inscription" variant="primary">
                Accéder au formulaire
              </Button>
              <Button href="/reglement" variant="secondary">
                Lire le règlement
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Rappels"
          title="Ce qu'il faut retenir"
          description="Tout est pensé pour un rythme rapide et clair."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Horaires fixes"
            value="Stable"
            detail="Matchs planifiés sur des fenêtres courtes et régulières."
          />
          <MetricCard
            label="Équité"
            value="100%"
            detail="Même règles pour tout le monde, pas de flou."
          />
          <MetricCard
            label="Suivi"
            value="Centralisé"
            detail="Calendrier, scores et standings disponibles ici."
          />
        </div>
      </section>

      <Callout
        title="Besoin d'aide pour structurer votre roster ?"
        description="Notre staff peut valider vos disponibilités et vous orienter vers les bons formats."
        actions={
          <>
            <Button href="/participer" variant="secondary">
              Poser une question
            </Button>
            <Button href="/inscription" variant="primary">
              Envoyer une inscription
            </Button>
          </>
        }
      />
    </div>
  );
}
