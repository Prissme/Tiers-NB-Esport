import { readFile, writeFile } from "fs/promises";
import path from "path";
import { unstable_noStore as noStore } from "next/cache";
import type { LfnData } from "./types";

const dataPath = path.join(process.cwd(), "data", "lfn.data.json");

let memoryData: LfnData | null = null;

const defaultData: LfnData = {
  season: {
    name: "LFN Saison 2",
    status: "inscriptions",
    deadline: "2025-12-29T15:00:00+01:00",
    timezone: "Europe/Brussels",
  },
  links: { discord: "https://discord.gg/q6sFPWCKD7" },
  format: {
    d1: { teams: 4, bo: 5, fearlessDraft: true, matchesPerDay: 2 },
    d2: { teams: 4, bo: 5, matchesPerDay: 2 },
    times: ["19:00", "20:00", "21:00"],
  },
  rules: {
    tiebreak: "winrate",
    roster: { starters: 3, subsRequired: 3, coachOptional: true },
    lateness: { "15min": "lose_1_set", "20min": "autolose" },
  },
  announcements: [],
  teams: [],
  matches: [],
  results: [],
  standings: [],
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
