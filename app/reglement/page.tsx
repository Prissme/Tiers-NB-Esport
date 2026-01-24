import type { Metadata } from "next";
import SectionHeader from "../components/SectionHeader";

export const metadata: Metadata = {
  title: "Règlement",
  description: "Règlement officiel de la ligue LFN.",
};

const rulesSections = [
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
    items: [
      "Initiales du pseudo obligatoires dans le nom (sinon -1 point).",
    ],
  },
  {
    title: "Acceptation du règlement",
    items: [
      "Participation = acceptation du règlement.",
      "L’organisation peut modifier le règlement si nécessaire.",
    ],
  },
];

export default function ReglementPage() {
  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-14 top-8 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-2 top-4 h-56 w-56 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Règlement"
            title="Règlement LFN"
            description="Règles officielles de la ligue."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {rulesSections.map((section) => (
              <div key={section.title} className="motion-card motion-shimmer space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{section.title}</p>
                <ul className="space-y-2 text-sm text-white">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-amber-400" />
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
