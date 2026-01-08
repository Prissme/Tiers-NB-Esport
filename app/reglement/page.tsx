import SectionHeader from "../components/SectionHeader";

const rulesSections = [
  {
    title: "Comportement",
    items: [
      "Le respect est obligatoire entre tous les joueurs.",
      "Interdits : trash-talk excessif, insultes, propos haineux.",
      "Autorisés : pouces rouges et emotes toxiques (sans messages insultants).",
    ],
  },
  {
    title: "Équipes & Roster",
    items: [
      "Chaque équipe doit avoir 3 titulaires et jusqu’à 2 remplaçants (SUB).",
      "Les rosters doivent être annoncés avant le début de la ligue.",
    ],
  },
  {
    title: "Coachs & Managers",
    items: [
      "Les coachs et managers ne peuvent pas jouer.",
      "Aucun joueur ne peut être coach & joueur en même temps, sauf en exception.",
      "Exception possible en dernier recours, avec accord de l’organisation.",
    ],
  },
  {
    title: "Changements & Remplacements",
    items: [
      "Les changements sont limités à 2 changements maximum.",
      "Les remplacements se font uniquement parmi les joueurs SUB.",
      "Aucun remplacement en cours de match.",
    ],
  },
  {
    title: "Déroulement des matchs",
    items: [
      "Les matchs se jouent sur des modes 3c3 officiels.",
      "Maps et modes communiqués à l’avance.",
      "Un retard important peut entraîner un forfait ou une sanction (au bout de 15 min, le point est accordé à l'équipe adverse, après 5 autres minutes 2-0, et 5 autres minutes 3-0).",
    ],
  },
  {
    title: "Bugs & Litiges",
    items: [
      "En cas de bug ou déconnexion justifiée, le match peut être rejoué (2 dodges = 1 point pour l'équipe adverse).",
      "Tout abus sera sanctionné.",
      "Les décisions des organisateurs sont définitives.",
    ],
  },
  {
    title: "Rename",
    items: [
      "Chaque joueur doit obligatoirement avoir les initiales de leur pseudo dans le nom (sous peine de recevoir une pénalité de 1 point).",
    ],
  },
  {
    title: "Acceptation du règlement",
    items: [
      "Toute participation implique l’acceptation totale de ce règlement.",
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
            title="Rules Book LFN"
            description="Consultez les règles officielles de la ligue."
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
