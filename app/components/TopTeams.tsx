const benefits = [
  { title: "Accès anticipé", detail: "Annonces et révélations avant tout le monde." },
  { title: "Contenu premium", detail: "VODs, analyses, et interviews réservées." },
  { title: "Avantages Discord", detail: "Rôles ELITE, salons privés, rencontres." },
  { title: "Expérience live", detail: "Avant-premières, drops, événements spéciaux." },
];

export default function TopTeams() {
  return (
    <section className="ranking-panel">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
            Avantages ELITE
          </p>
          <h3 className="section-title mt-2 text-lg">Ce que vous recevez</h3>
          <p className="mt-2 text-xs uppercase tracking-[0.32em] text-[color:var(--color-text-muted)]">
            L&apos;essentiel pour vivre la LFN comme un insider.
          </p>
        </div>
        <span className="tag-verified">ELITE</span>
      </div>
      <div className="mt-6 overflow-hidden">
        <ul className="space-y-4 text-sm">
          {benefits.map((benefit) => (
            <li key={benefit.title} className="ranking-row flex flex-col gap-2 pb-4">
              <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-accent)]">
                {benefit.title}
              </span>
              <span className="text-[color:var(--color-text-muted)]">{benefit.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
