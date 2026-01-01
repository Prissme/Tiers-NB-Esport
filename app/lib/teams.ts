import type { Division } from "./types";

export type TeamInfo = {
  name: string;
  slug: string;
  division: Division;
  players?: string[];
};

export const teams: TeamInfo[] = [
  {
    name: "Bâton d'Aiguille",
    slug: "baton-d-aiguille",
    division: "D1",
  },
  {
    name: "FA Jobless",
    slug: "fa-jobless",
    division: "D2",
  },
  {
    name: "Lâche ton grab",
    slug: "lache-ton-grab",
    division: "D1",
  },
  {
    name: "Les Zommes",
    slug: "les-zommes",
    division: "D2",
  },
  {
    name: "OFA",
    slug: "ofa",
    division: "D1",
  },
  {
    name: "Rodavland",
    slug: "rodavland",
    division: "D1",
  },
  {
    name: "T2",
    slug: "t2",
    division: "D2",
  },
  {
    name: "Valhalla",
    slug: "valhalla",
    division: "D2",
  },
];
