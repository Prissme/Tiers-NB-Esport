import type { Division } from "./types";

export type TeamMember = {
  name: string;
  role: string;
  signature: string;
  status: "Titulaire" | "Remplaçant" | "Coach";
};

export type TeamStat = {
  label: string;
  value: string;
  detail: string;
};

export type TeamSocial = {
  label: string;
  handle: string;
  href: string;
};

export type TeamInfo = {
  name: string;
  slug: string;
  division: Division;
  tagline: string;
  motto: string;
  description: string;
  logoUrl?: string;
  coverUrl?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  stats: TeamStat[];
  highlights: string[];
  roster: TeamMember[];
  socials: TeamSocial[];
};

export const teams: TeamInfo[] = [
  {
    name: "Bâton d'Aiguille",
    slug: "baton-d-aiguille",
    division: "D1",
    tagline: "La précision qui pique",
    motto: "Planifier, planter, punir.",
    description:
      "Équipe reconnue pour son macro-jeu chirurgical et ses rotations ultra rapides. Leur spécialité : verrouiller les zones avant que l'adversaire ne comprenne la situation.",
    logoUrl: undefined,
    coverUrl: undefined,
    colors: {
      primary: "#7C3AED",
      secondary: "#0F172A",
      accent: "#A855F7",
    },
    stats: [
      { label: "Tempo", value: "+18%", detail: "Avantage sur les ouvertures" },
      { label: "Vision", value: "Top 3", detail: "Placement et lecture" },
      { label: "Synergie", value: "94%", detail: "Communication interne" },
    ],
    highlights: [
      "Drafts axées sur le contrôle de zone.",
      "Capacité à retourner un BO en 2 manches.",
      "Shotcall clair, focus objectifs neutres.",
    ],
    roster: [
      { name: "Akari", role: "Capitaine", signature: "Belle", status: "Titulaire" },
      { name: "Nox", role: "Strat", signature: "Gus", status: "Titulaire" },
      { name: "Lila", role: "Contrôle", signature: "Squeak", status: "Titulaire" },
      { name: "Rema", role: "Flex", signature: "Lola", status: "Remplaçant" },
      { name: "Argo", role: "Coach", signature: "Draft", status: "Coach" },
    ],
    socials: [
      { label: "Discord", handle: "@baton", href: "#" },
      { label: "X", handle: "@batonlfn", href: "#" },
    ],
  },
  {
    name: "FA Jobless",
    slug: "fa-jobless",
    division: "D2",
    tagline: "Underdogs mais affamés",
    motto: "Pas de contrat, mais des crocs.",
    description:
      "Roster explosif qui s'appuie sur des timings agressifs et des picks surprise. Ils gagnent en popularité grâce à leurs combinaisons inattendues.",
    logoUrl: undefined,
    coverUrl: undefined,
    colors: {
      primary: "#38BDF8",
      secondary: "#0F172A",
      accent: "#22D3EE",
    },
    stats: [
      { label: "First Blood", value: "71%", detail: "Initie les fights" },
      { label: "Tempo", value: "+9%", detail: "Prise d'objectif" },
      { label: "Upset", value: "3", detail: "Surprises majeures" },
    ],
    highlights: [
      "Pool de brawlers très large.",
      "Style hyper offensif dès les premières secondes.",
      "Toujours un plan B en fin de draft.",
    ],
    roster: [
      { name: "Sage", role: "Leader", signature: "Max", status: "Titulaire" },
      { name: "Jade", role: "Assaut", signature: "Crow", status: "Titulaire" },
      { name: "Mira", role: "Support", signature: "Pam", status: "Titulaire" },
      { name: "Kai", role: "Flex", signature: "Stu", status: "Remplaçant" },
      { name: "Odin", role: "Coach", signature: "Meta", status: "Coach" },
    ],
    socials: [
      { label: "Discord", handle: "@jobless", href: "#" },
      { label: "TikTok", handle: "@joblessnb", href: "#" },
    ],
  },
  {
    name: "Lâche ton grab",
    slug: "lache-ton-grab",
    division: "D1",
    tagline: "Grab rapide, exécution nette",
    motto: "Le hook qui fait la diff.",
    description:
      "Spécialistes des compos agressives, ils imposent un rythme rapide pour briser les plans adverses. Leur force : la lecture des angles et les catches.",
    logoUrl:
      "https://media.discordapp.net/attachments/1434252768633290952/1456268468918947860/dbea6200-d03f-45a3-9e81-0249fb5bdbb2.png?ex=6957bf33&is=69566db3&hm=f27e489ce6a3efb62f45ff650c721beb99b1760151a9f8574b23408a36cf34dc&=&format=webp&quality=lossless&width=607&height=405",
    coverUrl:
      "https://media.discordapp.net/attachments/1434252768633290952/1456268468918947860/dbea6200-d03f-45a3-9e81-0249fb5bdbb2.png?ex=6957bf33&is=69566db3&hm=f27e489ce6a3efb62f45ff650c721beb99b1760151a9f8574b23408a36cf34dc&=&format=webp&quality=lossless&width=607&height=405",
    colors: {
      primary: "#F97316",
      secondary: "#0F172A",
      accent: "#FDBA74",
    },
    stats: [
      { label: "Hook rate", value: "65%", detail: "Réussite d'engage" },
      { label: "Snowball", value: "Top 2", detail: "Avantages rapides" },
      { label: "Clutch", value: "79%", detail: "Fin de match" },
    ],
    highlights: [
      "Combinaisons Mortis + Buzz létales.",
      "Transition ultra rapide sur la défense.",
      "Ligne arrière solide en BO long.",
    ],
    roster: [
      {
        name: "Prissme",
        role: "Capitaine",
        signature: "Ash",
        status: "Titulaire",
      },
      { name: "Naell", role: "Joueur", signature: "Lily", status: "Titulaire" },
      { name: "Dada", role: "Joueur", signature: "Gus", status: "Titulaire" },
      {
        name: "Walid",
        role: "Sub",
        signature: "Brock",
        status: "Remplaçant",
      },
      { name: "Lexus", role: "Coach", signature: "Coach", status: "Coach" },
    ],
    socials: [
      { label: "Discord", handle: "@ltg", href: "#" },
      { label: "YouTube", handle: "@ltgplays", href: "#" },
    ],
  },
  {
    name: "Les Zommes",
    slug: "les-zommes",
    division: "D2",
    tagline: "Le roster qui monte",
    motto: "Se battre, progresser, surprendre.",
    description:
      "Équipe en progression constante avec un noyau jeune. Ils misent sur la discipline et l'optimisation des picks pour compenser l'expérience.",
    logoUrl: "/images/teams/les-zommes/cover.png",
    coverUrl: "/images/teams/les-zommes/cover.png",
    colors: {
      primary: "#EC4899",
      secondary: "#0F172A",
      accent: "#F472B6",
    },
    stats: [
      { label: "Progression", value: "+12%", detail: "Évolution sur split" },
      { label: "Discipline", value: "A+", detail: "Respect du plan" },
      { label: "Objective", value: "58%", detail: "Contrôle zone" },
    ],
    highlights: [
      "Drafts centrées sur la synergie.",
      "Communication claire et posée.",
      "Spécialistes des maps fermées.",
    ],
    roster: [
      { name: "Niko", role: "Capitaine", signature: "Colt", status: "Titulaire" },
      { name: "Pio", role: "Support", signature: "Poco", status: "Titulaire" },
      { name: "Taro", role: "DPS", signature: "R-T", status: "Titulaire" },
      { name: "Kona", role: "Flex", signature: "Maisie", status: "Remplaçant" },
      { name: "Ezra", role: "Coach", signature: "Meta", status: "Coach" },
    ],
    socials: [
      { label: "Discord", handle: "@leszommes", href: "#" },
      { label: "Instagram", handle: "@leszommes", href: "#" },
    ],
  },
  {
    name: "OFA",
    slug: "ofa",
    division: "D1",
    tagline: "Style propre, lecture premium",
    motto: "Focus sur la précision.",
    description:
      "Pilier historique de la ligue, OFA joue une Brawl propre et calculée. Ils maîtrisent les rotations et évitent les risques inutiles.",
    logoUrl: "/images/teams/ofa/cover.png",
    coverUrl: "/images/teams/ofa/cover.png",
    colors: {
      primary: "#10B981",
      secondary: "#0F172A",
      accent: "#6EE7B7",
    },
    stats: [
      { label: "Stabilité", value: "S", detail: "Rythme constant" },
      { label: "Macro", value: "92%", detail: "Lecture globale" },
      { label: "Mental", value: "Top", detail: "Calme en BO" },
    ],
    highlights: [
      "Excellente gestion des temps morts.",
      "Focus sur la data et l'anti-draft.",
      "Line-up très stable.",
    ],
    roster: [
      { name: "Riko", role: "Capitaine", signature: "Byron", status: "Titulaire" },
      { name: "Zed", role: "Assaut", signature: "Leon", status: "Titulaire" },
      { name: "Maya", role: "Support", signature: "Gale", status: "Titulaire" },
      { name: "Tyra", role: "Flex", signature: "Amber", status: "Remplaçant" },
      { name: "Coach K", role: "Coach", signature: "Draft", status: "Coach" },
    ],
    socials: [
      { label: "Discord", handle: "@ofa", href: "#" },
      { label: "X", handle: "@ofa_brawl", href: "#" },
    ],
  },
  {
    name: "Rodavland",
    slug: "rodavland",
    division: "D1",
    tagline: "Aggressif, clair, méthodique",
    motto: "Avancer ensemble.",
    description:
      "Rodavland impose un tempo constant et garde une discipline stricte sur les resets. Leur collectif vise à étouffer l'adversaire dès le mid game.",
    logoUrl: "/images/teams/rodavland/cover.png",
    coverUrl: "/images/teams/rodavland/cover.png",
    colors: {
      primary: "#38BDF8",
      secondary: "#0F172A",
      accent: "#0EA5E9",
    },
    stats: [
      { label: "Pression", value: "Top 1", detail: "Zone avancée" },
      { label: "Tempo", value: "+14%", detail: "Push rapide" },
      { label: "Combos", value: "87%", detail: "Synergie" },
    ],
    highlights: [
      "Combos d'ultimes synchronisés.",
      "Focus sur l'étouffement mid.",
      "Très fort sur Brawl Ball.",
    ],
    roster: [
      { name: "Zara", role: "Capitaine", signature: "Sam", status: "Titulaire" },
      { name: "Mako", role: "Assaut", signature: "Surge", status: "Titulaire" },
      { name: "Lynx", role: "Support", signature: "Lola", status: "Titulaire" },
      { name: "Brix", role: "Flex", signature: "Spike", status: "Remplaçant" },
      { name: "Juno", role: "Coach", signature: "Meta", status: "Coach" },
    ],
    socials: [
      { label: "Discord", handle: "@rodav", href: "#" },
      { label: "TikTok", handle: "@rodavland", href: "#" },
    ],
  },
  {
    name: "T2",
    slug: "t2",
    division: "D2",
    tagline: "Teamwork avant tout",
    motto: "Entraînement, exécution, résultat.",
    description:
      "T2 mise sur un roster stable et des rotations travaillées. Ils aiment les drafts équilibrées avec un bruiser solide.",
    logoUrl: "/images/teams/t2/cover.png",
    coverUrl: "/images/teams/t2/cover.png",
    colors: {
      primary: "#FACC15",
      secondary: "#0F172A",
      accent: "#FDE047",
    },
    stats: [
      { label: "Macro", value: "81%", detail: "Lecture map" },
      { label: "Objet", value: "66%", detail: "Contrôle zone" },
      { label: "Draft", value: "B+", detail: "Adaptation" },
    ],
    highlights: [
      "Jeu sécurisé en early.",
      "Contrôle rigoureux des timers.",
      "Strats dédiées Gem Grab.",
    ],
    roster: [
      { name: "Ren", role: "Capitaine", signature: "Pam", status: "Titulaire" },
      { name: "Kiro", role: "Assaut", signature: "Fang", status: "Titulaire" },
      { name: "Yuki", role: "Support", signature: "Janet", status: "Titulaire" },
      { name: "Iris", role: "Flex", signature: "Meg", status: "Remplaçant" },
      { name: "Axel", role: "Coach", signature: "Draft", status: "Coach" },
    ],
    socials: [
      { label: "Discord", handle: "@t2", href: "#" },
      { label: "YouTube", handle: "@t2nb", href: "#" },
    ],
  },
  {
    name: "Valhalla",
    slug: "valhalla",
    division: "D2",
    tagline: "Métal et discipline",
    motto: "Tenir la ligne.",
    description:
      "Valhalla est une équipe robuste qui joue sur la durée. Leur spécialité est de sécuriser les objectifs en fin de match.",
    logoUrl: "/images/teams/valhalla/cover.png",
    coverUrl: "/images/teams/valhalla/cover.png",
    colors: {
      primary: "#94A3B8",
      secondary: "#0F172A",
      accent: "#CBD5F5",
    },
    stats: [
      { label: "Endgame", value: "88%", detail: "Fin de match" },
      { label: "Tank", value: "A", detail: "Frontline" },
      { label: "Vision", value: "76%", detail: "Info map" },
    ],
    highlights: [
      "Compos tank lourdes.",
      "Excellente discipline sur la défense.",
      "Temps forts sur Knockout.",
    ],
    roster: [
      { name: "Eira", role: "Capitaine", signature: "Rosa", status: "Titulaire" },
      { name: "Hale", role: "Assaut", signature: "Colt", status: "Titulaire" },
      { name: "Valk", role: "Support", signature: "Sprout", status: "Titulaire" },
      { name: "Rune", role: "Flex", signature: "Griff", status: "Remplaçant" },
      { name: "Gunnar", role: "Coach", signature: "Meta", status: "Coach" },
    ],
    socials: [
      { label: "Discord", handle: "@valhalla", href: "#" },
      { label: "Instagram", handle: "@valhallanb", href: "#" },
    ],
  },
];
