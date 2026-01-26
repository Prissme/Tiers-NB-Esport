import HeroCard from "./components/HeroCard";
import HallOfFame from "./components/HallOfFame";

export default function HomePage() {
  return (
    <div className="page-shell">
      <HeroCard />
      <div className="content-shell">
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
        <section className="mt-6 space-y-4 text-center sm:text-left">
          <p className="text-sm text-slate-300 sm:text-base">
            La LFN est le projet le plus ambitieux de tout Null&apos;s Brawl : une ligue e-sport
            pensée pour les joueurs français, avec un cadre compétitif clair et une communauté qui
            met en avant la performance.
          </p>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">
            Sponsors &amp; partenaires :{" "}
            <a
              href="mailto:contact@lfn-esports.fr"
              className="font-semibold text-slate-200 hover:text-white"
            >
              contact@lfn-esports.fr
            </a>
          </p>
        </section>
        <section className="mt-6">
          <HallOfFame />
        </section>
      </div>
    </div>
  );
}
