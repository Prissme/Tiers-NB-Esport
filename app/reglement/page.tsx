import type { Metadata } from "next";
import SectionHeader from "../components/SectionHeader";
import { getLocale } from "../lib/i18n";

export const metadata: Metadata = {
  title: "Règlement",
  description: "Règlement officiel de la ligue LFN.",
};

const rulesSections = {
  fr: [
    {
      title: "Comportement",
      items: [
        "Respect obligatoire entre joueurs.",
        "Interdit : trash-talk excessif, insultes, propos haineux.",
        "Autorisés : pouces rouges et emotes toxiques, sans messages insultants.",
      ],
    },
    {
      title: "Équipes & Roster",
      items: [
        "3 titulaires, jusqu’à 2 remplaçants (SUB).",
        "Roster annoncé avant le début de la ligue.",
      ],
    },
    {
      title: "Coachs & Managers",
      items: [
        "Coachs et managers ne jouent pas.",
        "Pas de double rôle coach/joueur, sauf exception.",
        "Exception possible en dernier recours, avec accord de l’organisation.",
      ],
    },
    {
      title: "Changements & Remplacements",
      items: [
        "Max 2 changements.",
        "Remplacements uniquement parmi les SUB.",
        "Pas de remplacement en cours de match.",
      ],
    },
    {
      title: "Déroulement des matchs",
      items: [
        "Matchs en modes 3c3 officiels.",
        "Maps et modes communiqués à l’avance.",
        "Retard important = sanction. 15 min : point adverse, +5 min : 2-0, +5 min : 3-0.",
      ],
    },
    {
      title: "Bugs & Litiges",
      items: [
        "Bug/déconnexion justifiée : match rejoué (2 dodges = 1 point adverse).",
        "Tout abus sera sanctionné.",
        "Décisions des organisateurs définitives.",
      ],
    },
    {
      title: "Rename",
      items: ["Initiales du pseudo obligatoires dans le nom (sinon -1 point)."],
    },
    {
      title: "Acceptation du règlement",
      items: [
        "Participation = acceptation du règlement.",
        "L’organisation peut modifier le règlement si nécessaire.",
      ],
    },
  ],
  en: [
    {
      title: "Behavior",
      items: [
        "Mandatory respect between players.",
        "Forbidden: excessive trash talk, insults, hateful speech.",
        "Allowed: red thumbs and toxic emotes, without insulting messages.",
      ],
    },
    {
      title: "Teams & Roster",
      items: [
        "3 starters, up to 2 substitutes (SUB).",
        "Roster announced before the league starts.",
      ],
    },
    {
      title: "Coaches & Managers",
      items: [
        "Coaches and managers do not play.",
        "No double coach/player role, except by exception.",
        "Exception possible as a last resort, with organizer approval.",
      ],
    },
    {
      title: "Changes & Substitutions",
      items: [
        "Max 2 changes.",
        "Substitutions only among SUB.",
        "No substitution during a match.",
      ],
    },
    {
      title: "Match flow",
      items: [
        "Matches in official 3v3 modes.",
        "Maps and modes communicated in advance.",
        "Significant delay = penalty. 15 min: opponent point, +5 min: 2-0, +5 min: 3-0.",
      ],
    },
    {
      title: "Bugs & Disputes",
      items: [
        "Justified bug/disconnect: match replayed (2 dodges = 1 opponent point).",
        "Any abuse will be sanctioned.",
        "Organizers' decisions are final.",
      ],
    },
    {
      title: "Rename",
      items: ["Nickname initials required in the name (otherwise -1 point)."],
    },
    {
      title: "Rule acceptance",
      items: [
        "Participation = acceptance of the rules.",
        "The organization may modify the rules if necessary.",
      ],
    },
  ],
};

export default function ReglementPage() {
  const locale = getLocale();
  const content = {
    fr: {
      kicker: "Règlement",
      title: "Règlement LFN",
      description: "Règles officielles de la ligue.",
    },
    en: {
      kicker: "Rules",
      title: "LFN Rules",
      description: "Official league rules.",
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
              <div
                key={section.title}
                className="surface-flat space-y-3"
              >
                <p className="text-xs uppercase tracking-[0.35em] text-utility">
                  {section.title}
                </p>
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
