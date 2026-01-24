import HeroCard from "./components/HeroCard";
import HallOfFame from "./components/HallOfFame";
import TopTeams from "./components/TopTeams";

export default function HomePage() {
  return (
    <div className="page-shell">
      <HeroCard />
      <div className="content-shell">
        <section className="grid gap-4 sm:grid-cols-2">
          <article className="section-card text-center">
            <p className="text-3xl font-semibold text-[color:var(--color-text)]">40+</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
              Matchs joués
            </p>
          </article>
          <article className="section-card text-center">
            <p className="text-3xl font-semibold text-[color:var(--color-text)]">100+</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
              Joueurs
            </p>
          </article>
        </section>
        <section className="mt-6">
          <TopTeams />
        </section>
        <HallOfFame />
      </div>
    </div>
  );
}
