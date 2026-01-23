import HeroCard from "./components/HeroCard";
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
              Des saisons structurées et un suivi clair pour les équipes méritantes.
            </p>
          </article>
          <article className="section-card">
            <h2 className="text-xs uppercase tracking-[0.32em] text-[color:var(--color-text-muted)]">
              Règles
            </h2>
            <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">
              Un règlement clair et compétitif. Statut elite sur sélection et révocable.
            </p>
          </article>
          <TopTeams />
        </section>
      </div>
    </div>
  );
}
