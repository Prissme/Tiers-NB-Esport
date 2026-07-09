export type RatingWeights = {
  kd_coef: number;
  diff_mult_tier2: number;
  diff_mult_tier1: number;
  diff_mult_tier0: number;
  comp_bonus_coef: number;
  pair_synergy_coef: number;
  trio_synergy_coef: number;
  counter_coef: number;
  mode_fit_bonus: number;
};

export const DEFAULT_WEIGHTS: RatingWeights = {
  kd_coef: 2.2,
  diff_mult_tier2: 1.0,
  diff_mult_tier1: 1.2,
  diff_mult_tier0: 1.45,
  comp_bonus_coef: 0.5,
  pair_synergy_coef: 0.5,
  trio_synergy_coef: 0.5,
  counter_coef: 0.8,
  mode_fit_bonus: 0.3,
};

// Bornes pour ne jamais laisser un poids partir en vrille avec des retours répétés.
const BOUNDS: Record<keyof RatingWeights, [number, number]> = {
  kd_coef: [1.0, 4.0],
  diff_mult_tier2: [0.8, 1.6],
  diff_mult_tier1: [0.8, 2.0],
  diff_mult_tier0: [0.8, 2.4],
  comp_bonus_coef: [0, 1.2],
  pair_synergy_coef: [0, 1.2],
  trio_synergy_coef: [0, 1.2],
  counter_coef: [0, 1.6],
  mode_fit_bonus: [0, 0.8],
};

const LEARNING_RATE = 0.06;

function clamp(value: number, [min, max]: [number, number]) {
  return Math.max(min, Math.min(max, value));
}

// Signal d'ajustement : 0-1 étoile => on réduit l'influence des facteurs qui ont
// contribué à cette note (elle était jugée peu fiable). 4-5 étoiles => on renforce
// légèrement ces mêmes facteurs (la note était jugée fiable). 2-3 étoiles => neutre.
export function starsToDelta(stars: number): number {
  if (stars <= 1) return -LEARNING_RATE;
  if (stars >= 4) return LEARNING_RATE * 0.6; // on renforce moins fort qu'on ne corrige
  if (stars === 2) return -LEARNING_RATE * 0.4;
  return 0; // 3 étoiles = jugé correct, on ne bouge rien
}

export type ContributionFlags = {
  kdUsed: boolean;
  brawlerPriority: 0 | 1 | 2;
  compBonusUsed: boolean;
  pairSynergyUsed: boolean;
  trioSynergyUsed: boolean;
  counterUsed: boolean;
  modeFitUsed: boolean;
};

// Ne bouge que les poids qui ont réellement pesé dans le calcul de cette note précise,
// pour ne pas pénaliser des facteurs qui n'étaient même pas en jeu.
export function adjustWeights(current: RatingWeights, stars: number, flags: ContributionFlags): RatingWeights {
  const delta = starsToDelta(stars);
  if (delta === 0) return current;

  const next: RatingWeights = { ...current };

  if (flags.kdUsed) {
    next.kd_coef = clamp(current.kd_coef * (1 + delta), BOUNDS.kd_coef);
  }
  const tierKey = (["diff_mult_tier0", "diff_mult_tier1", "diff_mult_tier2"] as const)[flags.brawlerPriority];
  next[tierKey] = clamp(current[tierKey] * (1 + delta), BOUNDS[tierKey]);

  if (flags.compBonusUsed) {
    next.comp_bonus_coef = clamp(current.comp_bonus_coef * (1 + delta), BOUNDS.comp_bonus_coef);
  }
  if (flags.pairSynergyUsed) {
    next.pair_synergy_coef = clamp(current.pair_synergy_coef * (1 + delta), BOUNDS.pair_synergy_coef);
  }
  if (flags.trioSynergyUsed) {
    next.trio_synergy_coef = clamp(current.trio_synergy_coef * (1 + delta), BOUNDS.trio_synergy_coef);
  }
  if (flags.counterUsed) {
    next.counter_coef = clamp(current.counter_coef * (1 + delta), BOUNDS.counter_coef);
  }
  if (flags.modeFitUsed) {
    next.mode_fit_bonus = clamp(current.mode_fit_bonus * (1 + delta), BOUNDS.mode_fit_bonus);
  }

  return next;
}
