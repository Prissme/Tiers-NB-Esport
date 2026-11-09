export type RulebookTier = "Tier E" | "Tier D" | "Tier C" | "Tier B" | "Tier A" | "Tier S";

export const TIER_VALUE: Record<RulebookTier, number> = {
  "Tier E": 1,
  "Tier D": 2,
  "Tier C": 3,
  "Tier B": 4,
  "Tier A": 5,
  "Tier S": 6,
};

// Tier S n'a pas de plage de points : il dépend du Top 10% du classement global
export const TIER_POINT_RANGES: Record<Exclude<RulebookTier, "Tier S">, [number, number]> = {
  "Tier E": [1, 4],
  "Tier D": [5, 14],
  "Tier C": [15, 34],
  "Tier B": [35, 54],
  "Tier A": [55, 79],
};

export function getSeedPointsForTier(tier: RulebookTier) {
  if (tier === "Tier S") return 85;
  const [min, max] = TIER_POINT_RANGES[tier];
  return Math.floor((min + max) / 2);
}
