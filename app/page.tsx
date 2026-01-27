import HeroCard from "./components/HeroCard";
import HallOfFame from "./components/HallOfFame";
import EliteOffer from "./components/EliteOffer";
import SectionHeader from "./components/SectionHeader";
import Button from "./components/Button";

const DISCORD_INVITE = "https://discord.gg/q6sFPWCKD7";

export default function HomePage() {
  return (
    <div className="page-shell">
      <HeroCard />
      <div className="content-shell">
        <section className="space-y-6">
          <SectionHeader
            kicker="Pourquoi la LFN ?"
            title="Une ligue claire, une hype constante"
            description="Un cadre compétitif lisible, des matchs réguliers, et une communauté qui suit chaque étape."
            align="center"
          />
          <div className="grid gap-4 text-left md:grid-cols-3">
            {[
              {
                title: "Compétitif structuré",
                detail: "Saisons encadrées, règles nettes, classement officiel.",
              },
              {
                title: "Hype en continu",
                detail: "Matchs suivis, résultats rapides, mise en avant des équipes.",
              },
              {
                title: "Entrée simple",
                detail: "Tout passe par Discord pour rejoindre, suivre et progresser.",
              },
            ].map((item) => (
              <article key={item.title} className="section-card space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{item.title}</p>
                <p className="text-sm text-slate-200">{item.detail}</p>
              </article>
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
          <SectionHeader
            kicker="ELITE"
            title="Le cercle prestige de la LFN"
            description="Influence la ligue, participe aux décisions et marque ta saison."
          />
          <EliteOffer />
        </section>
        <section className="section-card flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <SectionHeader
              kicker="Discord"
              title="Rejoins la communauté LFN sur Discord"
              description="Calendrier, inscriptions, annonces et entraide : tout se passe dans le serveur."
            />
          </div>
          <Button href={DISCORD_INVITE} variant="primary" external>
            Rejoindre le Discord
          </Button>
        </section>
        <section className="space-y-4">
          <SectionHeader
            kicker="LFN & Null’s Brawl"
            title="Une ligue francophone dédiée à Null’s Brawl"
            description="La LFN (Ligue Francophone) est une compétition communautaire créée pour structurer la scène Null’s Brawl. Chaque saison rassemble des équipes francophones qui veulent un cadre clair, des matchs réguliers et une visibilité grandissante."
          />
          <p className="text-sm text-slate-300">
            Null’s Brawl est un serveur privé inspiré de Brawl Stars. La LFN existe pour offrir un
            niveau de jeu organisé, des résultats fiables et des événements qui donnent envie de
            revenir chaque semaine.
          </p>
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
