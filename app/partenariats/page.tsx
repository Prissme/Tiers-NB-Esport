import Button from "../components/Button";
import SectionHeader from "../components/SectionHeader";

export default function PartenariatsPage() {
  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Partenariats"
          title="Discrets, utiles, orientés communauté"
          description="Une présence sobre qui soutient la scène sans perturber l'expérience spectateur."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Visibilité maîtrisée",
              detail: "Une ligne en bas de la home, zéro intrusion pendant la saison.",
            },
            {
              title: "Impact mesurable",
              detail: "Soutien direct à la production et à la narration des matchs.",
            },
            {
              title: "Contact simple",
              detail: "Un canal dédié pour discuter des formats possibles.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.title}</p>
              <p className="mt-2 text-sm text-white">{item.detail}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button href="/matchs" variant="secondary">
            Voir les matchs
          </Button>
        </div>
      </section>
    </div>
  );
}
