import HeroCard from "./components/HeroCard";
import HallOfFame from "./components/HallOfFame";
import EliteOffer from "./components/EliteOffer";
import SectionHeader from "./components/SectionHeader";

export default function HomePage() {
  return (
    <div className="page-shell">
      <HeroCard />
      <div className="page-stack page-stack--tight">
        <section className="secondary-section">
          <div className="asymmetric-grid items-start">
            <div className="space-y-6">
              <SectionHeader
                kicker="Pourquoi la LFN ?"
                title="Une ligue claire, une hype constante"
                description="Trois points simples, sans détour."
                align="left"
                tone="support"
              />
              <div className="space-y-6 text-left">
                {[
                  {
                    title: "Compétitif structuré",
                    detail: "Saisons encadrées, règles nettes, classement officiel.",
                  },
                  {
                    title: "Hype continue",
                    detail: "Matchs suivis, résultats rapides, mise en avant des équipes.",
                  },
                  {
                    title: "Entrée simple",
                    detail: "Tout passe par Discord pour rejoindre, suivre et progresser.",
                  },
                ].map((item) => (
                  <div key={item.title} className="surface-flat flex flex-col gap-2">
                    <p className="text-xs uppercase tracking-[0.35em] text-utility">
                      {item.title}
                    </p>
                    <p className="text-sm text-slate-200">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-6 text-center sm:grid-cols-2">
              <article className="social-proof-card social-proof-card--gold">
                <p className="social-proof-number font-sekuya text-5xl text-[color:var(--color-text)] sm:text-6xl">
                  40+
                </p>
                <p className="social-proof-label mt-2 text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-text-faint)]">
                  Matchs joués
                </p>
              </article>
              <article className="social-proof-card social-proof-card--gold social-proof-card--delay">
                <p className="social-proof-number font-sekuya text-5xl text-[color:var(--color-text)] sm:text-6xl">
                  100+
                </p>
                <p className="social-proof-label mt-2 text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-text-faint)]">
                  Joueurs
                </p>
              </article>
            </div>
          </div>
        </section>
        <div className="silent-gap" aria-hidden="true" />
        <div className="secondary-section">
          <EliteOffer />
        </div>
        <div className="silent-gap" aria-hidden="true" />
        <section className="secondary-section space-y-4">
          <SectionHeader
            kicker="LFN & Null’s Brawl"
            title="Une ligue francophone dédiée à Null’s Brawl"
            description="Compétition communautaire structurée pour la scène francophone."
            tone="support"
          />
        </section>
        <section className="secondary-section mt-6">
          <HallOfFame />
        </section>
      </div>
    </div>
  );
}
