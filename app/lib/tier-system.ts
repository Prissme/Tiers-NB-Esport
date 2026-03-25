export type RulebookTier = "No Tier" | "Tier E" | "Tier D" | "Tier C" | "Tier B" | "Tier A" | "Tier S";

export const TIER_VALUE: Record<RulebookTier, number> = {
  "No Tier": 0,
  "Tier E": 1,
  "Tier D": 2,
  "Tier C": 3,
  "Tier B": 4,
  "Tier A": 5,
  "Tier S": 6,
};

export const TIER_POINT_RANGES: Record<Exclude<RulebookTier, "No Tier" | "Tier S">, [number, number]> = {
  "Tier E": [0, 9],
  "Tier D": [10, 19],
  "Tier C": [20, 34],
  "Tier B": [35, 54],
  "Tier A": [55, 79],
};

export function getRulebookTierFromMmr(mmr: number): RulebookTier {
  if (mmr >= 2200) return "Tier S";
  if (mmr >= 2000) return "Tier A";
  if (mmr >= 1800) return "Tier B";
  if (mmr >= 1600) return "Tier C";
  if (mmr >= 1400) return "Tier D";
  if (mmr >= 1000) return "Tier E";
  return "No Tier";
}

export function getSeedPointsForTier(tier: RulebookTier) {
  if (tier === "No Tier") return 0;
  if (tier === "Tier S") return 85;
  const [min, max] = TIER_POINT_RANGES[tier];
  return Math.floor((min + max) / 2);
}
