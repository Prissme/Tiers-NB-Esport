import HeroCard from "./components/HeroCard";
import TopTeams from "./components/TopTeams";

export default function HomePage() {
  return (
    <div className="page-shell">
      <HeroCard />
      <div className="content-shell">
        <section className="grid gap-6 lg:grid-cols-[1fr_1fr_1.1fr]">
          <article className="section-card">
            <h2 className="section-title text-base">SAISON</h2>
            <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">
              Saison encadrée avec calendrier officiel.
            </p>
          </article>
          <article className="section-card">
            <h2 className="section-title text-base">RÈGLES</h2>
            <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">
              Règlement public. Statut ELITE sur sélection, révocable.
            </p>
          </article>
          <TopTeams />
        </section>
      </div>
    </div>
  );
}
