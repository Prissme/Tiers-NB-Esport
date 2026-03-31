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
  title: "Règlement | Prissme TV",
  description:
    "Official Prissme TV regulation page for Null's Brawl: League Rulebook and Tier System Rulebook.",
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
        "7 competitive tiers from No Tier to Tier S",
        "Points are earned through wins and tournament progression",
        "Tier S is reserved for the current global Top 3",
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
            "No Tier",
            "Tier E",
            "Tier D",
            "Tier C",
            "Tier B",
            "Tier A",
            "Tier S",
            "All new players begin in No Tier.",
          ],
        },
        {
          id: "3",
          title: "Access to the System",
          bullets: [
            "A player enters the system after 3 validated wins, or",
            "At least one semifinal appearance in a tournament.",
            "Once validated, the player enters Tier E with 0 points.",
          ],
        },
        {
          id: "4",
          title: "General Points System",
          bullets: [
            "Players accumulate points through match wins.",
            "Players accumulate points through tournament performances.",
            "Points directly determine tier progression.",
          ],
        },
        {
          id: "5",
          title: "Tier Thresholds",
          bullets: [
            "Tier E: 0 to 9 points",
            "Tier D: 10 to 19 points",
            "Tier C: 20 to 34 points",
            "Tier B: 35 to 54 points",
            "Tier A: 55+ points",
            "Tier S is determined by global ranking position.",
          ],
        },
        {
          id: "6",
          title: "Points System — Wins",
          bullets: [
            "Win against a team of the same tier: +1 point",
            "Win against a team of a higher tier: +3 points",
            "Win against a team of a lower tier: 0 points",
          ],
        },
        {
          id: "7",
          title: "3v3 Team Level Calculation",
          body: "A team's level is based on tiers, not raw points.",
          bullets: [
            "Tier values: No Tier = 0, Tier E = 1, Tier D = 2, Tier C = 3, Tier B = 4, Tier A = 5, Tier S = 6.",
            "Compute the average value of the three players.",
            "Round down to the nearest integer.",
            "Example: Tier B (4) + Tier C (3) + Tier C (3) = 10 / 3 = 3.33 -> Team tier = Tier C.",
          ],
        },
        {
          id: "8",
          title: "Points System — Tournaments",
          bullets: [
            "8-team tournament: Semifinal +1, Final +2, Winner +3",
            "16-team tournament: Quarterfinal +1, Semifinal +2, Final +3, Winner +4",
          ],
        },
        {
          id: "9",
          title: "LFN (Main Competition)",
          body: "LFN is the main competition in the system.",
          bullets: [
            "Quarterfinal: +3 points",
            "Semifinal: +5 points",
            "Final: +7 points",
            "Winner: +10 points",
          ],
        },
        {
          id: "10",
          title: "Demotion System",
          bullets: [
            "3 consecutive losses: -2 points",
            "5 consecutive losses: -5 points",
            "If a player falls below their current tier threshold, demotion is automatic.",
          ],
        },
        {
          id: "11",
          title: "Inactivity",
          body: "Inactivity causes progressive point loss to keep the scene active and prevent frozen tiers.",
          bullets: [
            "7 days without playing: -2 points",
            "14 days without playing: -5 points",
            "21 days without playing: -10 points",
          ],
        },
        {
          id: "12",
          title: "Tier S",
          bullets: [
            "Tier S represents the highest level.",
            "Condition: the player must be in the global Top 3 ranking.",
            "Retention depends on performance and activity.",
            "A player leaving the Top 3 automatically loses Tier S.",
          ],
        },
        {
          id: "13",
          title: "Anti-Abuse Philosophy",
          bullets: [
            "The system is designed to prevent farming weaker players.",
            "The system is designed to prevent farming small tournaments.",
          ],
        },
        {
          id: "14",
          title: "Core Principles",
          bullets: ["Merit", "Consistency", "Difficulty"],
        },
        {
          id: "15",
          title: "Conclusion",
          body: "The Prissme TV Tier System aims to become the competitive reference on Null's Brawl. It creates a natural hierarchy where only the strongest and most consistent players reach the highest levels. Participation in the system implies full acceptance of this official rulebook.",
        },
      ],
    },
    {
      anchor: "league",
      title: "Official Rulebook — Prissme TV League (Null's Brawl)",
      subtitle: "League Operations",
      intro:
        "This document defines the official rules governing the monthly Prissme TV League competition.",
      highlights: [
        "8-team monthly format with Regular Season and Playoffs",
        "Standard match format is BO5, Grand Final is BO7",
        "Strict conduct and admin authority policies apply",
      ],
      sections: [
        {
          id: "1",
          title: "League Structure",
          bullets: [
            "Monthly competition on Null's Brawl.",
            "Format: 8 teams, Regular Season + Playoffs.",
            "Matches are scheduled every Wednesday and Friday.",
            "All teams are expected to be available on match days.",
          ],
        },
        {
          id: "2",
          title: "Teams and Rosters",
          bullets: [
            "Minimum roster size: 3 players",
            "Maximum roster size: 6 players",
            "Roster lock applies once the league starts.",
            "Any roster change requires admin approval.",
            "A player may only represent one team.",
            "Smurfing is strictly prohibited.",
          ],
        },
        {
          id: "3",
          title: "Match Format",
          bullets: [
            "All standard matches are Best of 5 (BO5).",
            "First team to win 3 sets wins the match.",
            "Playoff Grand Final is Best of 7 (BO7).",
          ],
        },
        {
          id: "4",
          title: "Maps, Modes, and Match Rules",
          bullets: [
            "Maps and modes are predefined by league administration.",
            "Teams must follow the official match rotation.",
          ],
        },
        {
          id: "5",
          title: "Banned Brawler",
          body: "Najia is permanently banned.",
          bullets: [
            "If a team selects Najia, that team automatically loses the set.",
            "No remake will be granted in that case.",
          ],
          note: "Critical enforcement: set loss is automatic and immediate.",
        },
        {
          id: "6",
          title: "Match Procedure",
          bullets: [
            "Teams must be ready at the scheduled time.",
            "Up to 5 minutes delay: allowed.",
            "After 5 minutes: warning.",
            "After 10 minutes: forfeit.",
          ],
        },
        {
          id: "7",
          title: "Standings System",
          bullets: [
            "Match win: +3 points",
            "Match loss: 0 points",
            "Tiebreaker 1: Set difference",
            "Tiebreaker 2: Head-to-head result",
            "Tiebreaker 3: Overall performance (admin decision if required)",
          ],
        },
        {
          id: "8",
          title: "Playoffs",
          bullets: [
            "Top 4 teams from the Regular Season qualify.",
            "Semifinal 1: 1st vs 4th",
            "Semifinal 2: 2nd vs 3rd",
            "Winners advance to the Grand Final (BO7).",
          ],
        },
        {
          id: "9",
          title: "Stream and Broadcast",
          bullets: [
            "Matches may be streamed and cast live.",
            "Players must join spectator systems when required.",
            "Players must remain available on time for broadcast operations.",
          ],
        },
        {
          id: "10",
          title: "Fair Play and Conduct",
          bullets: [
            "All players must maintain professional and respectful behavior.",
            "Cheating and exploiting are prohibited.",
            "Toxic behavior and harassment are prohibited.",
            "Possible sanctions: warning, set loss, match loss, disqualification, or ban from future events.",
          ],
        },
        {
          id: "11",
          title: "Forfeits",
          bullets: [
            "A team that cannot play forfeits the match.",
            "Default forfeited score: 0-3 loss.",
          ],
        },
        {
          id: "12",
          title: "Activity Requirement",
          bullets: [
            "Teams must remain active for the full duration of the league.",
            "Failure to participate may result in replacement or disqualification.",
          ],
        },
        {
          id: "13",
          title: "Admin Authority",
          bullets: [
            "Admin decisions are final.",
            "Rules may be interpreted and enforced at admin discretion.",
          ],
        },
        {
          id: "14",
          title: "Rule Changes",
          bullets: [
            "The league reserves the right to update rules at any time.",
            "All teams will be informed of official rule changes.",
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
        "7 niveaux compétitifs, de No Tier à Tier S",
        "Des points gagnés via les victoires et les parcours en tournoi",
        "Le Tier S est réservé au Top 3 global actuel",
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
            "No Tier",
            "Tier E",
            "Tier D",
            "Tier C",
            "Tier B",
            "Tier A",
            "Tier S",
            "Tout nouveau joueur débute en No Tier.",
          ],
        },
        {
          id: "3",
          title: "Accès au système",
          bullets: [
            "Un joueur intègre le système après 3 victoires validées, ou",
            "Au moins une demi-finale en tournoi.",
            "Une fois validé, le joueur entre en Tier E avec 0 point.",
          ],
        },
        {
          id: "4",
          title: "Système général de points",
          bullets: [
            "Les joueurs cumulent des points via les victoires de match.",
            "Les joueurs cumulent des points via les performances en tournoi.",
            "Les points déterminent directement la progression de tier.",
          ],
        },
        {
          id: "5",
          title: "Seuils de tiers",
          bullets: [
            "Tier E : 0 à 9 points",
            "Tier D : 10 à 19 points",
            "Tier C : 20 à 34 points",
            "Tier B : 35 à 54 points",
            "Tier A : 55+ points",
            "Le Tier S dépend du classement global.",
          ],
        },
        {
          id: "6",
          title: "Système de points — Victoires",
          bullets: [
            "Victoire contre une équipe du même tier : +1 point",
            "Victoire contre une équipe d'un tier supérieur : +3 points",
            "Victoire contre une équipe d'un tier inférieur : 0 point",
          ],
        },
        {
          id: "7",
          title: "Calcul du niveau d'équipe en 3v3",
          body: "Le niveau d'une équipe est défini par les tiers, et non par les points bruts.",
          bullets: [
            "Valeurs : No Tier = 0, Tier E = 1, Tier D = 2, Tier C = 3, Tier B = 4, Tier A = 5, Tier S = 6.",
            "Calculer la moyenne des 3 joueurs.",
            "Arrondir à l'entier inférieur.",
            "Exemple : Tier B (4) + Tier C (3) + Tier C (3) = 10 / 3 = 3,33 -> Tier d'équipe = Tier C.",
          ],
        },
        {
          id: "8",
          title: "Système de points — Tournois",
          bullets: [
            "Tournoi 8 équipes : demi-finale +1, finale +2, vainqueur +3",
            "Tournoi 16 équipes : quart +1, demi +2, finale +3, vainqueur +4",
          ],
        },
        {
          id: "9",
          title: "LFN (compétition principale)",
          body: "La LFN est la compétition principale du système.",
          bullets: [
            "Quart de finale : +3 points",
            "Demi-finale : +5 points",
            "Finale : +7 points",
            "Vainqueur : +10 points",
          ],
        },
        {
          id: "10",
          title: "Système de relégation",
          bullets: [
            "3 défaites consécutives : -2 points",
            "5 défaites consécutives : -5 points",
            "Si un joueur passe sous le seuil de son tier, la relégation est automatique.",
          ],
        },
        {
          id: "11",
          title: "Inactivité",
          body: "L'inactivité entraîne une perte progressive de points pour maintenir une scène active et éviter les tiers figés.",
          bullets: [
            "7 jours sans jouer : -2 points",
            "14 jours sans jouer : -5 points",
            "21 jours sans jouer : -10 points",
          ],
        },
        {
          id: "12",
          title: "Tier S",
          bullets: [
            "Le Tier S représente le niveau le plus élevé.",
            "Condition : être dans le Top 3 global.",
            "Le maintien dépend de la performance et de l'activité.",
            "Toute sortie du Top 3 entraîne la perte automatique du Tier S.",
          ],
        },
        {
          id: "13",
          title: "Philosophie anti-abus",
          bullets: [
            "Le système est conçu pour empêcher le farm de joueurs plus faibles.",
            "Le système est conçu pour empêcher le farm de petits tournois.",
          ],
        },
        {
          id: "14",
          title: "Principes fondamentaux",
          bullets: ["Mérite", "Régularité", "Difficulté"],
        },
        {
          id: "15",
          title: "Conclusion",
          body: "Le système de tiers Prissme TV a pour objectif de devenir la référence compétitive sur Null's Brawl. Il crée une hiérarchie naturelle dans laquelle seuls les joueurs les plus forts et les plus réguliers atteignent les plus hauts niveaux. Toute participation implique l'acceptation complète de ce règlement officiel.",
        },
      ],
    },
    {
      anchor: "league",
      title: "Règlement officiel — Ligue Prissme TV (Null's Brawl)",
      subtitle: "Fonctionnement de la ligue",
      intro:
        "Ce document définit les règles officielles qui encadrent la Ligue mensuelle Prissme TV.",
      highlights: [
        "Format mensuel à 8 équipes : saison régulière + playoffs",
        "Format standard en BO5, Grande Finale en BO7",
        "Politique stricte de conduite et d'autorité admin",
      ],
      sections: [
        {
          id: "1",
          title: "Structure de la ligue",
          bullets: [
            "Compétition mensuelle sur Null's Brawl.",
            "Format : 8 équipes, saison régulière + playoffs.",
            "Les matchs se jouent chaque mercredi et vendredi.",
            "Toutes les équipes doivent être disponibles les jours de match.",
          ],
        },
        {
          id: "2",
          title: "Équipes et rosters",
          bullets: [
            "Roster minimum : 3 joueurs",
            "Roster maximum : 6 joueurs",
            "Le roster est verrouillé au début de la ligue.",
            "Toute modification requiert l'approbation des admins.",
            "Un joueur ne peut représenter qu'une seule équipe.",
            "Le smurf est strictement interdit.",
          ],
        },
        {
          id: "3",
          title: "Format des matchs",
          bullets: [
            "Tous les matchs standards se jouent en Best of 5 (BO5).",
            "La première équipe à 3 sets remporte le match.",
            "La Grande Finale des playoffs se joue en Best of 7 (BO7).",
          ],
        },
        {
          id: "4",
          title: "Maps, modes et règles de match",
          bullets: [
            "Les maps et les modes sont prédéfinis par l'administration.",
            "Les équipes doivent respecter la rotation officielle.",
          ],
        },
        {
          id: "5",
          title: "Brawler interdit",
          body: "Najia est bannie de façon permanente.",
          bullets: [
            "Si une équipe sélectionne Najia, elle perd automatiquement le set.",
            "Aucun remake ne sera accordé dans ce cas.",
          ],
          note: "Application critique : perte du set immédiate et automatique.",
        },
        {
          id: "6",
          title: "Procédure de match",
          bullets: [
            "Les équipes doivent être prêtes à l'heure prévue.",
            "Jusqu'à 5 minutes de retard : toléré.",
            "Après 5 minutes : avertissement.",
            "Après 10 minutes : forfait.",
          ],
        },
        {
          id: "7",
          title: "Système de classement",
          bullets: [
            "Victoire : +3 points",
            "Défaite : 0 point",
            "Tie-break 1 : différence de sets",
            "Tie-break 2 : résultat du face-à-face",
            "Tie-break 3 : performance globale (décision admin si nécessaire)",
          ],
        },
        {
          id: "8",
          title: "Playoffs",
          bullets: [
            "Les 4 meilleures équipes de la saison régulière se qualifient.",
            "Demi-finale 1 : 1er vs 4e",
            "Demi-finale 2 : 2e vs 3e",
            "Les vainqueurs accèdent à la Grande Finale (BO7).",
          ],
        },
        {
          id: "9",
          title: "Stream et diffusion",
          bullets: [
            "Les matchs peuvent être diffusés et commentés en direct.",
            "Les joueurs doivent rejoindre le mode spectateur si demandé.",
            "Les joueurs doivent être disponibles à l'heure pour la diffusion.",
          ],
        },
        {
          id: "10",
          title: "Fair play et conduite",
          bullets: [
            "Tous les joueurs doivent adopter un comportement professionnel et respectueux.",
            "La triche et l'exploitation sont interdites.",
            "La toxicité et le harcèlement sont interdits.",
            "Sanctions possibles : avertissement, perte de set, perte du match, disqualification ou ban des futurs événements.",
          ],
        },
        {
          id: "11",
          title: "Forfaits",
          bullets: [
            "Une équipe indisponible perd le match par forfait.",
            "Score appliqué par défaut : défaite 0-3.",
          ],
        },
        {
          id: "12",
          title: "Exigence d'activité",
          bullets: [
            "Les équipes doivent rester actives pendant toute la ligue.",
            "Un manque de participation peut entraîner un remplacement ou une disqualification.",
          ],
        },
        {
          id: "13",
          title: "Autorité des admins",
          bullets: [
            "Les décisions des admins sont finales.",
            "L'interprétation et l'application des règles relèvent de leur discrétion.",
          ],
        },
        {
          id: "14",
          title: "Mises à jour du règlement",
          bullets: [
            "La ligue se réserve le droit de modifier les règles à tout moment.",
            "Toutes les équipes seront informées de tout changement officiel.",
          ],
        },
      ],
    },
  ],
};

export default function ReglementPage() {
  const locale = getLocale();
  const rulebooks = rulebooksByLocale[locale];

  const headingContent =
    locale === "en"
      ? {
          kicker: "Official Regulation",
          title: "Prissme TV Competitive Rulebooks",
          description:
            "These are the official rules governing Prissme TV Null's Brawl competitions and player ranking progression.",
          navLabel: "Jump to rulebook",
        }
      : {
          kicker: "Règlement officiel",
          title: "Rulebooks compétitifs Prissme TV",
          description:
            "Ces règles officielles encadrent les compétitions Null's Brawl de Prissme TV et la progression du classement joueur.",
          navLabel: "Accès rapide",
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

          <div className="signal-divider" />

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-utility">{headingContent.navLabel}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {rulebooks.map((book) => (
                <a
                  key={book.anchor}
                  href={`#${book.anchor}`}
                  className="surface-flat group flex items-center justify-between gap-4 border border-white/10 px-4 py-3 transition hover:border-white/25 hover:bg-white/[0.04]"
                >
                  <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white/90">
                    {book.subtitle}
                  </span>
                  <span className="text-xs uppercase tracking-[0.28em] text-utility group-hover:text-white/80">
                    {locale === "en" ? "View" : "Voir"}
                  </span>
                </a>
              ))}
            </div>
          </div>
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
