import { readFile, writeFile } from "fs/promises";
import path from "path";
import { unstable_noStore as noStore } from "next/cache";
import type { LfnData } from "./types";

const dataPath = path.join(process.cwd(), "data", "lfn.data.json");

let memoryData: LfnData | null = null;

const defaultData: LfnData = {
  season: {
    name: "LFN Saison 2",
    status: "",
    dates: { start: "", end: "" },
  },
  links: { discord: "", challonge: "", rules: "" },
  announcements: [],
  teams: [],
  matches: [],
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
