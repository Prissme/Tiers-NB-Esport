import HeroCard from "./components/HeroCard";
import HallOfFame from "./components/HallOfFame";

export default function HomePage() {
  return (
    <div className="page-shell">
      <HeroCard />
      <div className="content-shell">
        <section className="grid gap-6 text-center sm:grid-cols-2">
          <article>
            <p className="font-sekuya text-5xl text-[color:var(--color-text)] sm:text-6xl">40+</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
              Matchs joués
            </p>
          </article>
          <article>
            <p className="font-sekuya text-5xl text-[color:var(--color-text)] sm:text-6xl">100+</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
              Joueurs
            </p>
          </article>
        </section>
        <section className="mt-6">
          <HallOfFame />
        </section>
      </div>
    </div>
  );
}
