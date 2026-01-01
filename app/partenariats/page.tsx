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
          description="Présence sobre, utile."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Visibilité"
            value="Sobre"
            detail="Site + overlays."
          />
          <MetricCard
            label="Impact"
            value="Direct"
            detail="Soutien production."
          />
          <MetricCard
            label="Contact"
            value="Fluide"
            detail="Canal dédié."
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              title: "Visibilité maîtrisée",
              detail: "Présence sur les pages clés.",
            },
            {
              title: "Impact mesurable",
              detail: "Reporting simple.",
            },
            {
              title: "Activation communautaire",
              detail: "Actions communauté.",
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
          description="Process court."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Premier contact</p>
            <p className="mt-3 text-sm text-white">Objectifs & cible.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Activation</p>
            <p className="mt-3 text-sm text-white">Plan & calendrier.</p>
          </div>
        </div>
      </section>

      <Callout
        title="Envie de soutenir la scène LFN ?"
        description="Partenariat simple et clair."
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
