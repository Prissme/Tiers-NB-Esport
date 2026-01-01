import Button from "../components/Button";
import Callout from "../components/Callout";
import MetricCard from "../components/MetricCard";
import SectionHeader from "../components/SectionHeader";

export default function PartenariatsPage() {
  return (
    <div className="space-y-12">
      <section className="section-card space-y-8">
        <SectionHeader
          kicker="Partenariats"
          title="Discrets, utiles, orientés communauté"
          description="Une présence sobre qui soutient la scène sans perturber l'expérience spectateur."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Visibilité"
            value="Sobre"
            detail="Intégration élégante sur le site et les overlays."
          />
          <MetricCard
            label="Impact"
            value="Direct"
            detail="Soutien à la production et à la narration des matchs."
          />
          <MetricCard
            label="Contact"
            value="Fluide"
            detail="Un canal dédié pour discuter des activations."
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              title: "Visibilité maîtrisée",
              detail: "Présence sur la home et les pages clés, sans intrusion pendant la saison.",
            },
            {
              title: "Impact mesurable",
              detail: "Reporting clair sur les activations et la visibilité obtenue.",
            },
            {
              title: "Activation communautaire",
              detail: "Opérations dédiées aux joueurs, giveaways et contenus exclusifs.",
            },
            {
              title: "Contact simple",
              detail: "Discussion ouverte pour construire un format sur mesure.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{item.title}</p>
              <p className="mt-3 text-sm text-white">{item.detail}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button href="/matchs" variant="secondary">
            Voir les matchs
          </Button>
          <Button href="/participer" variant="primary">
            Découvrir la ligue
          </Button>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Process"
          title="Comment lancer un partenariat"
          description="Un processus court pour construire une collaboration efficace."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Premier contact</p>
            <p className="mt-3 text-sm text-white">Discussion rapide sur vos objectifs et votre cible.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Activation</p>
            <p className="mt-3 text-sm text-white">Plan d'action, calendrier et suivi des retombées.</p>
          </div>
        </div>
      </section>

      <Callout
        title="Envie de soutenir la scène LFN ?"
        description="Nous sommes disponibles pour construire un partenariat cohérent avec votre marque et la communauté."
        actions={
          <>
            <Button href="/partenariats" variant="secondary">
              Télécharger la brochure
            </Button>
            <Button href="/participer" variant="primary">
              Planifier un échange
            </Button>
          </>
        }
      />
    </div>
  );
}
