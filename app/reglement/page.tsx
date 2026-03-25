import type { Metadata } from "next";
import SectionHeader from "../components/SectionHeader";
import { getLocale } from "../lib/i18n";

export const metadata: Metadata = {
  title: "Règlement",
  description: "Rulebook officiel du système de tiers Prissme TV.",
};

const rulesSections = {
  fr: [
    {
      title: "1. Objectif du système",
      items: [
        "Le système de tiers Prissme TV structure la scène compétitive Null's Brawl.",
        "Le classement repose sur la performance, la régularité et la difficulté des résultats.",
      ],
    },
    {
      title: "2. Structure des tiers",
      items: [
        "No Tier, Tier E, Tier D, Tier C, Tier B, Tier A, Tier S.",
        "Tout nouveau joueur commence en No Tier.",
      ],
    },
    {
      title: "3. Accès au système",
      items: [
        "Entrée après 3 victoires validées OU une demi-finale minimum en tournoi.",
        "Le joueur validé entre en Tier E avec 0 point.",
      ],
    },
    {
      title: "4–6. Points & victoires",
      items: [
        "Même tier: +1 point.",
        "Tier supérieur: +3 points.",
        "Tier inférieur: 0 point.",
      ],
    },
    {
      title: "7. Système 3v3 (niveau équipe)",
      items: [
        "No Tier=0, E=1, D=2, C=3, B=4, A=5, S=6.",
        "Niveau équipe = moyenne des 3 joueurs arrondie à l'inférieur.",
      ],
    },
    {
      title: "8–9. Compétitions et LFN",
      items: [
        "Tournoi 8 équipes: demi +1, finale +2, victoire +3.",
        "Tournoi 16 équipes: quart +1, demi +2, finale +3, victoire +4.",
        "LFN: quart +3, demi +5, finale +7, victoire +10.",
      ],
    },
    {
      title: "10–11. Descente & inactivité",
      items: [
        "3 défaites de suite: -2 points. 5 défaites de suite: -5 points.",
        "Inactivité: 7j -2, 14j -5, 21j -10.",
        "Si un joueur passe sous le seuil du tier: descente automatique.",
      ],
    },
    {
      title: "12–15. Tier S, anti-abus et philosophie",
      items: [
        "Tier S réservé au top 3 global (perte automatique en sortie du top 3).",
        "Le système anti-abus limite le farm de joueurs faibles et de petits tournois.",
        "Valeurs clés: mérite, régularité, difficulté.",
        "Participer implique l'acceptation du règlement officiel Prissme TV.",
      ],
    },
  ],
  en: [
    {
      title: "Official Prissme TV Rulebook",
      items: [
        "7 tiers: No Tier, E, D, C, B, A, S.",
        "Access: 3 validated wins or at least a tournament semifinal.",
        "Points from wins and tournaments define each tier.",
        "Tier S is reserved for global top 3 players.",
        "Inactivity and losing streaks remove points.",
      ],
    },
  ],
};

export default function ReglementPage() {
  const locale = getLocale();
  const content = {
    fr: {
      kicker: "Règlement",
      title: "Rulebook officiel — Système de tiers Prissme TV",
      description: "Version officielle appliquée à la compétition LFN sur Null's Brawl.",
    },
    en: {
      kicker: "Rules",
      title: "Official Rulebook — Prissme TV Tier System",
      description: "Official version used for LFN competition on Null's Brawl.",
    },
  }[locale];

  return (
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-8">
          <SectionHeader
            kicker={content.kicker}
            title={content.title}
            description={content.description}
            tone="dominant"
          />
          <div className="signal-divider" />
          <div className="grid gap-6 lg:grid-cols-2">
            {rulesSections[locale].map((section) => (
              <div key={section.title} className="surface-flat space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-utility">{section.title}</p>
                <ul className="space-y-2 text-sm text-white">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-white/40" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
