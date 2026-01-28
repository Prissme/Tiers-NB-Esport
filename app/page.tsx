import HeroCard from "./components/HeroCard";
import HallOfFame from "./components/HallOfFame";
import EliteOffer from "./components/EliteOffer";
import SectionHeader from "./components/SectionHeader";

export default function HomePage() {
  return (
    <div className="page-shell">
      <HeroCard />
      <div className="content-shell">
        <section className="space-y-6">
          <SectionHeader
            kicker="Pourquoi la LFN ?"
            title="Une ligue claire, une hype constante"
            description="Trois points simples, sans détour."
            align="center"
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
              <div
                key={item.title}
                className="surface-flat flex flex-col gap-2"
              >
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400 title-accent">
                  {item.title}
                </p>
                <p className="text-sm text-slate-200">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="grid gap-6 text-center sm:grid-cols-2">
          <article className="social-proof-card social-proof-card--gold">
            <p className="social-proof-number font-sekuya text-5xl text-[color:var(--color-text)] sm:text-6xl">
              40+
            </p>
            <p className="social-proof-label mt-2 text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
              Matchs joués
            </p>
          </article>
          <article className="social-proof-card social-proof-card--gold social-proof-card--delay">
            <p className="social-proof-number font-sekuya text-5xl text-[color:var(--color-text)] sm:text-6xl">
              100+
            </p>
            <p className="social-proof-label mt-2 text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
              Joueurs
            </p>
          </article>
        </section>
        <section className="space-y-6">
          <EliteOffer />
        </section>
        <section className="space-y-4">
          <SectionHeader
            kicker="LFN & Null’s Brawl"
            title="Une ligue francophone dédiée à Null’s Brawl"
            description="Compétition communautaire structurée pour la scène francophone."
          />
        </section>
        <section className="mt-6">
          <HallOfFame />
        </section>
      </div>
    </div>
  );
}
