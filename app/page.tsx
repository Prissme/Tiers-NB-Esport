import HeroCard from "./components/HeroCard";
import TopTeams from "./components/TopTeams";

export default function HomePage() {
  return (
    <div className="page-shell">
      <HeroCard />
      <div className="content-shell">
        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Cadre officiel",
              description:
                "Une structure claire, des règles publiques et un cadre respectueux du temps des équipes.",
            },
            {
              title: "Progression mesurée",
              description:
                "Des saisons régulières, un rythme maîtrisé, une progression lisible.",
            },
            {
              title: "Communauté exigeante",
              description:
                "Une ligue où la discipline prime sur le spectacle.",
            },
          ].map((card) => (
            <article key={card.title} className="iron-card">
              <h2 className="text-xs uppercase tracking-[0.32em] text-[color:var(--color-text-muted)]">
                {card.title}
              </h2>
              <p className="mt-3 text-sm text-[color:var(--color-text)] sm:text-base">
                {card.description}
              </p>
            </article>
          ))}
        </section>
        <TopTeams />
      </div>
    </div>
  );
}
