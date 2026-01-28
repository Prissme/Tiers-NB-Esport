import HeroCard from "./components/HeroCard";
import HallOfFame from "./components/HallOfFame";
import EliteOffer from "./components/EliteOffer";
import SectionHeader from "./components/SectionHeader";

export default function HomePage() {
  return (
    <div className="page-shell">
      <HeroCard />
      <div className="page-stack page-stack--tight">
        <section className="secondary-section social-proof-section">
          <div className="space-y-8">
            <SectionHeader
              title="Preuves sociales"
              description="Des chiffres qui parlent, une ambiance qui reste."
              align="center"
            />
            <div className="grid gap-6 text-center sm:grid-cols-3">
              <article className="social-proof-card social-proof-card--gold">
                <p className="social-proof-number font-sekuya text-4xl text-white sm:text-5xl">
                  40+
                </p>
                <p className="social-proof-label mt-2 text-[10px] uppercase tracking-[0.3em] text-slate-200">
                  Matchs joués
                </p>
              </article>
              <article className="social-proof-card social-proof-card--gold social-proof-card--delay">
                <p className="social-proof-number font-sekuya text-4xl text-white sm:text-5xl">
                  100+
                </p>
                <p className="social-proof-label mt-2 text-[10px] uppercase tracking-[0.3em] text-slate-200">
                  Joueurs
                </p>
              </article>
              <article className="social-proof-card social-proof-card--emotion">
                <p className="social-proof-number font-sekuya text-lg text-white sm:text-xl">
                  Et le plus important : De l&apos;émotion
                </p>
                <p className="social-proof-label mt-3 text-[10px] uppercase tracking-[0.28em] text-slate-200/80">
                  L&apos;impact avant tout
                </p>
              </article>
            </div>
          </div>
        </section>
        <div className="silent-gap" aria-hidden="true" />
        <div className="secondary-section">
          <EliteOffer />
        </div>
        <section className="secondary-section mt-6">
          <HallOfFame />
        </section>
      </div>
    </div>
  );
}
