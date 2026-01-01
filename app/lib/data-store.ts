import { readFile, writeFile } from "fs/promises";
import path from "path";
import { unstable_noStore as noStore } from "next/cache";
import type { LfnData } from "./types";

const dataPath = path.join(process.cwd(), "data", "lfn.data.json");

let memoryData: LfnData | null = null;

const defaultData: LfnData = {
  season: {
    name: "LFN",
    status: "en_cours",
    deadline: "2025-12-29T15:00:00+01:00",
    timezone: "Europe/Brussels",
  },
  links: { discord: "" },
  format: {
    d1: { teams: 4, bo: 5, fearlessDraft: true, matchesPerDay: 2 },
    d2: { teams: 4, bo: 5, matchesPerDay: 2 },
    times: ["19:00", "20:00", "21:00"],
  },
  rules: {
    tiebreak: "nombre de sets perdus",
    roster: { starters: 3, subsRequired: 3, coachOptional: true },
    lateness: { "15min": "lose_1_set", "20min": "autolose" },
  },
  announcements: [
    {
      title: "Day 1 validé",
      date: "2025-03-18",
      content: "Scores officiels publiés et classements mis à jour.",
    },
  ],
  teams: [
    {
      id: "bt",
      name: "BT",
      tag: "BT",
      logoUrl: "",
      division: "D1",
      players: [],
    },
    {
      id: "rdld",
      name: "RDLD",
      tag: "RDLD",
      logoUrl: "/images/teams/rodavland/cover.png",
      division: "D1",
      players: [],
    },
    {
      id: "ofa",
      name: "OFA",
      tag: "OFA",
      logoUrl: "/images/teams/ofa/cover.png",
      division: "D1",
      players: [],
    },
    {
      id: "ltg",
      name: "LTG",
      tag: "LTG",
      logoUrl: "/images/teams/lache-ton-grab/cover.png",
      division: "D1",
      players: [],
    },
    {
      id: "vlh",
      name: "VLH",
      tag: "VLH",
      logoUrl: "/images/teams/valhalla/cover.png",
      division: "D2",
      players: [],
    },
    {
      id: "jl",
      name: "JL",
      tag: "JL",
      logoUrl: "",
      division: "D2",
      players: [],
    },
    {
      id: "t2",
      name: "T2",
      tag: "T2",
      logoUrl: "/images/teams/t2/cover.png",
      division: "D2",
      players: [],
    },
    {
      id: "lz",
      name: "LZ",
      tag: "LZ",
      logoUrl: "/images/teams/les-zommes/cover.png",
      division: "D2",
      players: [],
    },
  ],
  matches: [
    {
      id: "d1-day1-1",
      date: "Day 1",
      time: "18h",
      division: "D1",
      teamA: "BT",
      teamB: "OFA",
      bo: 5,
    },
    {
      id: "d1-day1-2",
      date: "Day 1",
      time: "19h",
      division: "D1",
      teamA: "RDLD",
      teamB: "LTG",
      bo: 5,
    },
    {
      id: "d2-day1-1",
      date: "Day 1",
      time: "20h",
      division: "D2",
      teamA: "VLH",
      teamB: "LZ",
      bo: 5,
    },
    {
      id: "d2-day1-2",
      date: "Day 1",
      time: "21h",
      division: "D2",
      teamA: "T2",
      teamB: "JL",
      bo: 5,
    },
    {
      id: "d1-day2-1",
      date: "Day 2",
      time: "18h",
      division: "D1",
      teamA: "BT",
      teamB: "RDLD",
      bo: 5,
    },
    {
      id: "d1-day2-2",
      date: "Day 2",
      time: "19h",
      division: "D1",
      teamA: "OFA",
      teamB: "LTG",
      bo: 5,
    },
    {
      id: "d2-day2-1",
      date: "Day 2",
      time: "20h",
      division: "D2",
      teamA: "VLH",
      teamB: "JL",
      bo: 5,
    },
    {
      id: "d2-day2-2",
      date: "Day 2",
      time: "21h",
      division: "D2",
      teamA: "T2",
      teamB: "LZ",
      bo: 5,
    },
  ],
  results: [
    {
      matchId: "d1-day1-1",
      scoreA: 3,
      scoreB: 0,
      reportedAt: "2025-03-18T20:30:00+01:00",
    },
    {
      matchId: "d1-day1-2",
      scoreA: 1,
      scoreB: 3,
      reportedAt: "2025-03-18T21:15:00+01:00",
    },
    {
      matchId: "d2-day1-1",
      scoreA: 3,
      scoreB: 0,
      reportedAt: "2025-03-18T22:00:00+01:00",
    },
    {
      matchId: "d2-day1-2",
      scoreA: 3,
      scoreB: 1,
      reportedAt: "2025-03-18T22:45:00+01:00",
    },
  ],
  standings: [
    {
      division: "D1",
      rows: [
        { teamId: "bt", wins: 1, losses: 0, setsWon: 3, setsLost: 0 },
        { teamId: "ltg", wins: 1, losses: 0, setsWon: 3, setsLost: 1 },
        { teamId: "rdld", wins: 0, losses: 1, setsWon: 1, setsLost: 3 },
        { teamId: "ofa", wins: 0, losses: 1, setsWon: 0, setsLost: 3 },
      ],
    },
    {
      division: "D2",
      rows: [
        { teamId: "vlh", wins: 1, losses: 0, setsWon: 3, setsLost: 0 },
        { teamId: "t2", wins: 1, losses: 0, setsWon: 3, setsLost: 1 },
        { teamId: "jl", wins: 0, losses: 1, setsWon: 1, setsLost: 3 },
        { teamId: "lz", wins: 0, losses: 1, setsWon: 0, setsLost: 3 },
      ],
    },
  ],
};

export const getLfnData = async (): Promise<LfnData> => {
  noStore();
  if (memoryData) {
    return memoryData;
  }

  try {
    const file = await readFile(dataPath, "utf-8");
    const parsed = JSON.parse(file) as LfnData;
    memoryData = parsed;
    return parsed;
  } catch (error) {
    memoryData = defaultData;
    return defaultData;
  }
};

export const updateLfnData = async (
  data: LfnData
): Promise<{ persisted: boolean; message?: string }> => {
  memoryData = data;
  try {
    await writeFile(dataPath, JSON.stringify(data, null, 2));
    return { persisted: true };
  } catch (error) {
    return {
      persisted: false,
      message:
        "Écriture fichier impossible en serverless. Données gardées en mémoire pour cette session.",
    };
  }
};
