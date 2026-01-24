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
              Saison
            </h2>
            <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">
              Une saison = un test. Durée longue, pression, endurance.
            </p>
          </article>
          <article className="section-card">
            <h2 className="text-xs uppercase tracking-[0.32em] text-[color:var(--color-text-muted)]">
              Règles
            </h2>
            <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">
              Contrat non négociable. Zéro tolérance. Statut révocable.
            </p>
          </article>
          <TopTeams />
        </section>
        <EliteSection />
      </div>
    </div>
  );
}
