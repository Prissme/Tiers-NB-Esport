import FeatureCard from "./components/FeatureCard";
import HeroCard from "./components/HeroCard";
import EliteOffer from "./components/EliteOffer";
import TopTeams from "./components/TopTeams";

const features = [
  {
    title: "Élitisme",
    description:
      "Accès réservé aux équipes qui prouvent leur valeur. Chaque slot est une opportunité rare.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M12 3l3.5 7h7l-5.5 4 2 7-7-4-7 4 2-7L1.5 10h7L12 3z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    title: "Règles",
    description:
      "Un règlement clair, un arbitrage ferme et des formats pensés pour l&apos;excellence compétitive.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M6 3h12v2H6V3zm0 4h12v2H6V7zm0 4h12v2H6v-2zm0 4h7v2H6v-2z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    title: "Récompenses",
    description:
      "Trophées, visibilité et invitations exclusives. Le podium ouvre toutes les portes.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M6 4h12l-1 7H7L6 4zm2 10h8v6H8v-6z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <div className="relative">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 pb-20 pt-4 sm:px-6">
        <HeroCard />
        <EliteOffer />
        <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
              />
            ))}
          </div>
          <TopTeams />
        </section>
      </div>
    </div>
  );
}
