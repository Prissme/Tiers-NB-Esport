const rulebookSections = [
  {
    title: "Format",
    items: [
      "**Best-of-three** series for all regular season matches.",
      "Teams must check-in **15 minutes** before the scheduled start.",
      "Match start is locked; late arrivals at **+10 minutes** forfeit Map 1.",
    ],
  },
  {
    title: "Schedule",
    items: [
      "Matchdays are fixed. **No reschedules** without league approval.",
      "Requested changes must be submitted **48 hours** in advance.",
      "All teams are responsible for monitoring the weekly schedule post.",
    ],
  },
  {
    title: "Rosters & Subs",
    items: [
      "Each roster is **5 starters + up to 2 subs**.",
      "Substitutions must be declared **before map veto**.",
      "Roster locks at **Week 3** unless granted an emergency exception.",
    ],
  },
  {
    title: "No-shows",
    items: [
      "A team missing at start time receives an **automatic map loss**.",
      "A full **15-minute** no-show results in a series forfeit.",
      "Repeat no-shows trigger **disciplinary review**.",
    ],
  },
  {
    title: "Reporting scores",
    items: [
      "Captains must submit results within **30 minutes** of match end.",
      "Score reports require **screenshots or VOD timestamps**.",
      "Incorrect reports may result in **point deductions**.",
    ],
  },
  {
    title: "Penalties",
    items: [
      "Rule violations can lead to **map loss, point loss, or suspension**.",
      "Cheating results in an **immediate ban** and season removal.",
      "Unsportsmanlike conduct is a **zero-tolerance** offense.",
    ],
  },
  {
    title: "Disputes",
    items: [
      "Disputes must be filed within **24 hours** of match end.",
      "Provide **all evidence** (screenshots, clips, logs).",
      "League ops decisions are **final and binding**.",
    ],
  },
];

const renderBold = (text) => {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, index) => {
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      return (
        <strong key={`${chunk}-${index}`} className="font-semibold text-white">
          {chunk.replace(/\*\*/g, "")}
        </strong>
      );
    }
    return <span key={`${chunk}-${index}`}>{chunk}</span>;
  });
};

export default function RulebookPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-frost">
          League Operations
        </p>
        <h1 className="text-4xl font-semibold text-white">LFN Rulebook</h1>
        <p className="max-w-3xl text-frost">
          Strict, scannable rules for every matchday. Violations carry immediate
          consequences.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {rulebookSections.map((section) => (
          <section key={section.title} className="glass-panel p-6">
            <h2 className="section-title">{section.title}</h2>
            <ul className="mt-4 space-y-3 text-sm text-frost">
              {section.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-pulse" />
                  <span>{renderBold(item)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
