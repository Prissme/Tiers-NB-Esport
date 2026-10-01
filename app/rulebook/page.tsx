import type { Metadata } from "next";
import SectionHeader from "../components/SectionHeader";
import { getLocale } from "../lib/i18n";

type RuleSection = {
  id: string;
  title: string;
  body?: string;
  bullets?: string[];
  note?: string;
};

type Rulebook = {
  anchor: string;
  title: string;
  subtitle: string;
  intro: string;
  sections: RuleSection[];
  highlights: string[];
};

export const metadata: Metadata = {
  title: "Rulebook | Prissme TV",
  description:
    "Official Prissme TV regulation page for Null's Brawl: Tier System Rulebook.",
};

const rulebooksByLocale: Record<"fr" | "en", Rulebook[]> = {
  en: [
    {
      anchor: "tier-system",
      title: "Official Rulebook — Prissme TV Tier System (Null's Brawl)",
      subtitle: "Ranking Framework",
      intro:
        "This document defines the official Prissme TV player ranking framework for Null's Brawl.",
      highlights: [
        "6 competitive tiers from Tier E to Tier S",
        "Points are earned through wins and tournament results",
        "Tier S is reserved for the current Top 10% of Tier A players",
      ],
      sections: [
        {
          id: "1",
          title: "Purpose of the System",
          body: "The Prissme TV Tier System structures the competitive Null's Brawl scene through a ranking model based on performance, consistency, and result difficulty. It is designed to provide a clear, evolving, and difficult-to-exploit hierarchy. This system constitutes the official Prissme TV ranking.",
        },
        {
          id: "2",
          title: "Tier Structure",
          bullets: [
            "Tier E",
            "Tier D",
            "Tier C",
            "Tier B",
            "Tier A",
            "Tier S",
            "All new players begin in Tier E with 1 point.",
          ],
        },
        {
          id: "3",
          title: "General Points System",
          bullets: [
            "Players accumulate points through match wins.",
            "Players accumulate points through tournament results.",
            "Points directly determine tier progression.",
          ],
        },
        {
          id: "4",
          title: "Tier Thresholds",
          bullets: [
            "Tier E: 1 to 4 points",
            "Tier D: 5 to 14 points",
            "Tier C: 15 to 34 points",
            "Tier B: 35 to 54 points",
            "Tier A: 55+ points",
            "Tier S: current Top 10% of Tier A players",
          ],
        },
        {
          id: "5",
          title: "Points System — Match Results",
          body: "Points are awarded based on the tier comparison between the two teams at the time of the match.",
          bullets: [
            "Win against a higher-tier team (upset): +3 points for the winner, -2 points for the loser",
            "Win against a team of the same tier: +2 points for the winner, -1 point for the loser",
            "Win against a lower-tier team: +1 point for the winner, 0 points for the loser",
          ],
        },
        {
          id: "6",
          title: "3v3 Team Level Calculation",
          body: "A team's level is based on tiers, not raw points.",
          bullets: [
            "Tier values: Tier E = 1, Tier D = 2, Tier C = 3, Tier B = 4, Tier A = 5, Tier S = 6.",
            "Compute the average value of the three players.",
            "Round down to the nearest integer.",
            "Example: Tier B (4) + Tier C (3) + Tier C (3) = 10 / 3 = 3.33 -> Team tier = Tier C.",
          ],
        },
        {
          id: "7",
          title: "Points System — Tournament Progression",
          bullets: [
            "Top 1: +3 points",
            "Top 2: +2 points",
            "Top 3: +1 point",
          ],
        },
      ],
    },
  ],
  fr: [
    {
      anchor: "tier-system",
      title: "Règlement officiel — Système de tiers Prissme TV (Null's Brawl)",
      subtitle: "Cadre du classement",
      intro:
        "Ce document définit le cadre officiel du classement joueur Prissme TV sur Null's Brawl.",
      highlights: [
        "6 niveaux compétitifs, de Tier E à Tier S",
        "Des points gagnés via les victoires et les résultats en tournoi",
        "Le Tier S est réservé au Top 10% actuel des joueurs Tier A",
      ],
      sections: [
        {
          id: "1",
          title: "Objectif du système",
          body: "Le système de tiers Prissme TV structure la scène compétitive Null's Brawl via un classement fondé sur la performance, la régularité et la difficulté des résultats. Il vise une hiérarchie claire, évolutive et difficilement exploitable. Ce système constitue le classement officiel Prissme TV.",
        },
        {
          id: "2",
          title: "Structure des tiers",
          bullets: [
            "Tier E",
            "Tier D",
            "Tier C",
            "Tier B",
            "Tier A",
            "Tier S",
            "Tout nouveau joueur débute en Tier E avec 1 point.",
          ],
        },
        {
          id: "3",
          title: "Système général de points",
          bullets: [
            "Les joueurs cumulent des points via les victoires de match.",
            "Les joueurs cumulent des points via les résultats en tournoi.",
            "Les points déterminent directement la progression de tier.",
          ],
        },
        {
          id: "4",
          title: "Seuils de tiers",
          bullets: [
            "Tier E : 1 à 4 points",
            "Tier D : 5 à 14 points",
            "Tier C : 15 à 34 points",
            "Tier B : 35 à 54 points",
            "Tier A : 55+ points",
            "Tier S : Top 10% actuel des joueurs Tier A",
          ],
        },
        {
          id: "5",
          title: "Système de points — Résultats de match",
          body: "Les points sont attribués en fonction de la comparaison de tiers entre les deux équipes au moment du match.",
          bullets: [
            "Victoire contre une équipe de tier supérieur (upset) : +3 pts pour le vainqueur, -2 pts pour le perdant",
            "Victoire contre une équipe du même tier : +2 pts pour le vainqueur, -1 pt pour le perdant",
            "Victoire contre une équipe de tier inférieur : +1 pt pour le vainqueur, 0 pt pour le perdant",
          ],
        },
        {
          id: "6",
          title: "Calcul du niveau d'équipe en 3v3",
          body: "Le niveau d'une équipe est défini par les tiers, et non par les points bruts.",
          bullets: [
            "Valeurs : Tier E = 1, Tier D = 2, Tier C = 3, Tier B = 4, Tier A = 5, Tier S = 6.",
            "Calculer la moyenne des 3 joueurs.",
            "Arrondir à l'entier inférieur.",
            "Exemple : Tier B (4) + Tier C (3) + Tier C (3) = 10 / 3 = 3,33 -> Tier d'équipe = Tier C.",
          ],
        },
        {
          id: "7",
          title: "Système de points — Progression en tournoi",
          bullets: [
            "Top 1 : +3 points",
            "Top 2 : +2 points",
            "Top 3 : +1 point",
          ],
        },
      ],
    },
  ],
};

export default function RulebookPage() {
  const locale = getLocale();
  const rulebooks = rulebooksByLocale[locale];

  const headingContent =
    locale === "en"
      ? {
          kicker: "Official Regulation",
          title: "Prissme TV Tier System Rulebook",
          description:
            "These are the official rules governing the Prissme TV Null's Brawl player ranking progression.",
        }
      : {
          kicker: "Règlement officiel",
          title: "Rulebook du système de tiers Prissme TV",
          description:
            "Ces règles officielles encadrent la progression du classement joueur Prissme TV sur Null's Brawl.",
        };

  return (
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-8">
          <SectionHeader
            kicker={headingContent.kicker}
            title={headingContent.title}
            description={headingContent.description}
            tone="dominant"
          />
        </div>
      </section>

      {rulebooks.map((book) => (
        <section id={book.anchor} key={book.anchor} className="surface-dominant dominant-section scroll-mt-28">
          <div className="space-y-8">
            <SectionHeader
              kicker={book.subtitle}
              title={book.title}
              description={book.intro}
              tone="dominant"
            />

            <div className="grid gap-4 lg:grid-cols-3">
              {book.highlights.map((highlight) => (
                <div key={highlight} className="surface-flat border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-utility">
                    {locale === "en" ? "Key Standard" : "Standard clé"}
                  </p>
                  <p className="mt-2 text-sm text-white">{highlight}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {book.sections.map((section) => (
                <article key={`${book.anchor}-${section.id}`} className="surface-flat border border-white/10 p-5 sm:p-6">
                  <h3 className="text-sm uppercase tracking-[0.25em] text-white/90">
                    {section.id}. {section.title}
                  </h3>

                  {section.body ? <p className="mt-3 text-sm leading-relaxed text-white/80">{section.body}</p> : null}

                  {section.bullets?.length ? (
                    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-white/90">
                      {section.bullets.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[color:var(--color-accent)]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {section.note ? (
                    <p className="mt-4 rounded-[10px] border border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent)]/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-[color:var(--color-accent)]">
                      {section.note}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
