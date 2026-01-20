import { unstable_noStore as noStore } from "next/cache";
import type { LfnData } from "./types";

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
  memoryData = defaultData;
  return defaultData;
};

export const updateLfnData = async (
  data: LfnData
): Promise<{ persisted: boolean; message?: string }> => {
  memoryData = data;
  return {
    persisted: false,
    message:
      "Écriture désactivée. Données gardées en mémoire pour cette session.",
  };
};
