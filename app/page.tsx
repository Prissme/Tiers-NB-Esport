import HeroCard from "./components/HeroCard";
import EliteSection from "./components/EliteSection";
import TopTeams from "./components/TopTeams";

export default function HomePage() {
  return (
    <div className="page-shell">
      <HeroCard />
      <div className="content-shell">
        <section className="grid gap-6 lg:grid-cols-[1fr_1fr_1.1fr]">
          <article className="section-card">
            <h2 className="text-xs uppercase tracking-[0.32em] text-[color:var(--color-text-muted)]">
              Découvrir la LFN
            </h2>
            <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">
              La Ligue Française Null&apos;s Brawl réunit les meilleurs joueurs francophones sur des
              formats compétitifs réguliers.
            </p>
          </article>
          <article className="section-card">
            <h2 className="text-xs uppercase tracking-[0.32em] text-[color:var(--color-text-muted)]">
              Pourquoi ELITE ?
            </h2>
            <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">
              Un abonnement premium pour suivre la ligue avec des contenus exclusifs, accès en avant-première
              et avantages réservés aux membres.
            </p>
          </article>
          <TopTeams />
        </section>
        <EliteSection />
      </div>
    </div>
  );
}
