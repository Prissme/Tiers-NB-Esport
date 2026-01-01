export const lfnData = {
  name: "LFN",
  game: "Null’s Brawl",
  region: "FR (francophone)",
  language: "Français",
  creationYear: 2025,
  season: {
    status: "Saison en cours",
    phase: "Qualifications",
    lastUpdated: "Jeudi 01/01/2026",
    nextStep: "Prochaine étape à annoncer",
  },
  format: {
    bestOf: 5,
    weeklyRhythm: {
      monday: "Match 1",
      wednesday: "Match 2",
      friday: "Match 3",
      weekend: "Playoffs",
      breaks: "Pause mardi/jeudi",
    },
    pointsSystem: "1 set gagné = 1 point",
    tiebreak: "Nombre de sets perdus",
    divisions: {
      d1: { label: "Div 1", teams: 4 },
      d2: { label: "Div 2", teams: 4 },
    },
    roster: {
      starters: 3,
      subsMax: 3,
    },
  },
  stats: {
    teamsRegistered: 8,
    teamsActive: 8,
    divisions: 2,
    matchesPerWeek: 4,
  },
  lastResult: {
    teamA: "T2",
    teamB: "LZ",
    scoreA: 3,
    scoreB: 2,
    date: "01/01/2026",
    time: "21h",
  },
  organization: {
    communication: "Communication officielle sur Discord",
    management: "Gestion manuelle",
    publication: "Résultats publiés sur Discord + site",
    sanctions: ["warns", "forfait", "exclusion"],
    administrationLabel: "Administration LFN",
  },
} as const;
