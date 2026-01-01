export const lfnData = {
  name: "LFN",
  game: "Null’s Brawl",
  region: "FR (francophone)",
  language: "Français",
  creationYear: 2025,
  season: {
    status: "Saison en cours",
    phase: "Qualifications",
    lastUpdated: "Lundi 29/12/2025",
    nextStep: "Playoffs le 03/01/2026",
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
    teamsRegistered: 19,
    teamsActive: 11,
    divisions: 2,
    matchesPerWeek: 3,
  },
  lastResult: {
    teamA: "T2",
    teamB: "JL",
    scoreA: 3,
    scoreB: 1,
    date: "29/12/2025",
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
