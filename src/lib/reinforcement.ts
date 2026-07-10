/**
 * rating-reinforcement.ts
 *
 * Système de renforcement léger par feedback humain (RLHF simplifié).
 *
 * Principe :
 *  - Un admin dit "la note était trop basse" (up) ou "trop haute" (down).
 *  - On identifie quels poids ont contribué à cette note (via le breakdown
 *    sauvegardé dans performance_rating_computations).
 *  - On ajuste chaque poids concerné dans le sens voulu, avec :
 *      · Un learning rate de base (BASE_LR)
 *      · Un multiplicateur de force (weak/normal/strong)
 *      · Un facteur adaptatif : plus on a de feedbacks, plus on ralentit
 *        (évite l'oscillation quand le modèle a déjà beaucoup appris).
 *      · Des bornes min/max par poids (régularisation dure).
 *      · Une régularisation douce vers les défauts (L2-like) : chaque
 *        ajustement tire légèrement le poids vers sa valeur par défaut.
 */

import {
  DEFAULT_WEIGHTS,
  type Direction,
  type RatingWeights,
  type RawSignals,
} from "../../app/lib/rating-weights";
import { createServerClient } from "./supabase/server";
import { withSchema } from "./supabase/schema";

// ─── Constantes ────────────────────────────────────────────────────────────

/** Learning rate de base : proportion de changement par feedback "normal". */
const BASE_LR = 0.08;

/** Multiplicateurs selon la force du signal. */
const STRENGTH_MULT: Record<Strength, number> = {
  weak: 0.5,
  normal: 1.0,
  strong: 1.5,
};

/**
 * Learning rate adaptatif : diminue quand on accumule des feedbacks.
 * Formule : BASE_LR * decay. Plus feedbackCount est grand, plus decay est petit.
 * On plancher à 20 % du BASE_LR pour ne jamais complètement arrêter d'apprendre.
 *
 * Exemples :
 *   0  feedbacks →  decay ≈ 1.00  → LR = BASE_LR
 *  20  feedbacks →  decay ≈ 0.59
 *  50  feedbacks →  decay ≈ 0.37
 * 100  feedbacks →  decay ≈ 0.22
 * 200+ feedbacks →  plancher à 0.20
 */
function adaptiveLR(baseRate: number, feedbackCount: number): number {
  const decay = Math.max(0.2, Math.exp(-feedbackCount / 80));
  return baseRate * decay;
}

/**
 * Régularisation douce (L2-like) : à chaque ajustement, on tire légèrement
 * le poids vers sa valeur par défaut. Évite la dérive progressive.
 * λ petit = effet doux, λ = 0 = pas de régularisation.
 */
const L2_LAMBDA = 0.05;

function l2Pull(weight: number, defaultValue: number): number {
  return -L2_LAMBDA * (weight - defaultValue);
}

/** Bornes min/max par poids. */
const BOUNDS: Record<keyof RatingWeights, [number, number]> = {
  kd_coef:           [1.0, 4.0],
  diff_mult_tier2:   [0.8, 1.6],
  diff_mult_tier1:   [0.8, 2.0],
  diff_mult_tier0:   [0.8, 2.4],
  comp_bonus_coef:   [0.0, 1.2],
  pair_synergy_coef: [0.0, 1.2],
  trio_synergy_coef: [0.0, 1.2],
  counter_coef:      [0.0, 1.6],
  mode_fit_bonus:    [0.0, 0.8],
  star_player_bonus: [0.5, 4.0],
  dmg_heal_fit_coef: [0.0, 0.8],
};

// ─── Types ─────────────────────────────────────────────────────────────────

export type Strength = "weak" | "normal" | "strong";

export type ReinforcementResult = {
  ok: true;
  weightsBefore: RatingWeights;
  weightsAfter: RatingWeights;
  changes: { key: string; before: number; after: number }[];
  feedbackId: string;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function clamp(v: number, [min, max]: [number, number]): number {
  return Math.max(min, Math.min(max, v));
}

function sign(n: number): -1 | 0 | 1 {
  if (n > 0) return 1;
  if (n < 0) return -1;
  return 0;
}

/**
 * Ajuste un poids unique selon :
 *  - la contribution de ce poids à la note (contributionSign)
 *  - la direction du feedback (up/down)
 *  - le learning rate effectif (déjà calculé avec adaptive + strength)
 *  - la régularisation douce vers la valeur par défaut
 */
function adjustOne(
  weight: number,
  defaultValue: number,
  bounds: [number, number],
  contributionSign: number,
  direction: Direction,
  lr: number
): number {
  if (contributionSign === 0) return weight;

  // +1 si on veut monter la note, -1 si on veut la descendre.
  const wantSign = direction === "up" ? 1 : -1;

  // Si la contribution allait dans le même sens que le feedback → amplifier.
  // Si elle allait en sens inverse → réduire.
  const delta = wantSign * contributionSign * lr;

  // Régularisation douce : tire vers le défaut.
  const reg = l2Pull(weight, defaultValue);

  return clamp(weight * (1 + delta) + reg * lr, bounds);
}

// ─── Fonction principale ────────────────────────────────────────────────────

/**
 * Applique un ajustement de renforcement léger à partir d'un feedback humain.
 *
 * @param computationId  UUID de la computation notée (dans performance_rating_computations)
 * @param direction      "up" = note trop basse, "down" = note trop haute
 * @param strength       Force du signal : "weak" | "normal" | "strong" (défaut: "normal")
 */
export async function applyReinforcementLearning(
  computationId: string,
  direction: Direction,
  strength: Strength = "normal"
): Promise<ReinforcementResult> {
  const supabase = withSchema(createServerClient());

  // 1. Charger la computation pour récupérer son breakdown.
  const { data: computation, error: compErr } = await supabase
    .from("performance_rating_computations")
    .select("id, breakdown, weights_snapshot")
    .eq("id", computationId)
    .maybeSingle();

  if (compErr) throw new Error(compErr.message);
  if (!computation) throw new Error("Computation not found.");

  // 2. Charger les poids actuels (pas le snapshot : on veut les poids LIVE).
  const { data: weightsRow, error: weightsErr } = await supabase
    .from("performance_rating_weights")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (weightsErr) throw new Error(weightsErr.message);

  const currentWeights: RatingWeights = weightsRow
    ? {
        kd_coef:           weightsRow.kd_coef,
        diff_mult_tier2:   weightsRow.diff_mult_tier2,
        diff_mult_tier1:   weightsRow.diff_mult_tier1,
        diff_mult_tier0:   weightsRow.diff_mult_tier0,
        comp_bonus_coef:   weightsRow.comp_bonus_coef,
        pair_synergy_coef: weightsRow.pair_synergy_coef,
        trio_synergy_coef: weightsRow.trio_synergy_coef,
        counter_coef:      weightsRow.counter_coef,
        mode_fit_bonus:    weightsRow.mode_fit_bonus,
        star_player_bonus: weightsRow.star_player_bonus,
        dmg_heal_fit_coef: weightsRow.dmg_heal_fit_coef ?? DEFAULT_WEIGHTS.dmg_heal_fit_coef,
      }
    : DEFAULT_WEIGHTS;

  // 3. Compter les feedbacks existants pour le learning rate adaptatif.
  const { count: feedbackCount } = await supabase
    .from("performance_rating_feedback")
    .select("id", { count: "exact", head: true });

  const totalFeedbacks = feedbackCount ?? 0;

  // 4. Calculer le learning rate effectif.
  const lr = adaptiveLR(BASE_LR, totalFeedbacks) * STRENGTH_MULT[strength];

  // 5. Reconstruire les signaux bruts depuis le breakdown sauvegardé.
  // Le breakdown est généré par /api/admin/performance-rating/route.ts.
  const bd = computation.breakdown as {
    kd: number;
    brawlerPriority: 0 | 1 | 2;
    compAvgPriority: number;
    pairSynergy: number;
    trioSynergy: number;
    counterEffect: number;
    modeFitBonus: number;
    starPlayer: boolean;
  };

  const raw: RawSignals = {
    kdDelta:         bd.kd - 1,
    brawlerPriority: bd.brawlerPriority,
    compRaw:         bd.compAvgPriority - 1,
    pairSynergyRaw:  bd.pairSynergy,
    trioSynergyRaw:  bd.trioSynergy,
    counterEffect:   bd.counterEffect,
    modeFitRaw:      bd.modeFitBonus,
    starPlayer:      bd.starPlayer,
  };

  // 6. Appliquer les ajustements poids par poids.
  const next: RatingWeights = { ...currentWeights };

  if (raw.kdDelta !== 0) {
    const s = sign(raw.kdDelta);
    next.kd_coef = adjustOne(currentWeights.kd_coef, DEFAULT_WEIGHTS.kd_coef, BOUNDS.kd_coef, s, direction, lr);
    // Ajuste le multiplicateur de tier correspondant au brawler joué.
    const tierKey = (["diff_mult_tier0", "diff_mult_tier1", "diff_mult_tier2"] as const)[raw.brawlerPriority];
    next[tierKey] = adjustOne(currentWeights[tierKey], DEFAULT_WEIGHTS[tierKey], BOUNDS[tierKey], s, direction, lr);
  }
  if (raw.compRaw !== 0) {
    next.comp_bonus_coef = adjustOne(
      currentWeights.comp_bonus_coef, DEFAULT_WEIGHTS.comp_bonus_coef,
      BOUNDS.comp_bonus_coef, sign(raw.compRaw), direction, lr
    );
  }
  if (raw.pairSynergyRaw !== 0) {
    next.pair_synergy_coef = adjustOne(
      currentWeights.pair_synergy_coef, DEFAULT_WEIGHTS.pair_synergy_coef,
      BOUNDS.pair_synergy_coef, sign(raw.pairSynergyRaw), direction, lr
    );
  }
  if (raw.trioSynergyRaw !== 0) {
    next.trio_synergy_coef = adjustOne(
      currentWeights.trio_synergy_coef, DEFAULT_WEIGHTS.trio_synergy_coef,
      BOUNDS.trio_synergy_coef, sign(raw.trioSynergyRaw), direction, lr
    );
  }
  if (raw.counterEffect !== 0) {
    next.counter_coef = adjustOne(
      currentWeights.counter_coef, DEFAULT_WEIGHTS.counter_coef,
      BOUNDS.counter_coef, sign(raw.counterEffect), direction, lr
    );
  }
  if (raw.modeFitRaw > 0) {
    next.mode_fit_bonus = adjustOne(
      currentWeights.mode_fit_bonus, DEFAULT_WEIGHTS.mode_fit_bonus,
      BOUNDS.mode_fit_bonus, 1, direction, lr
    );
  }
  if (raw.starPlayer) {
    next.star_player_bonus = adjustOne(
      currentWeights.star_player_bonus, DEFAULT_WEIGHTS.star_player_bonus,
      BOUNDS.star_player_bonus, 1, direction, lr
    );
  }

  // 7. Calculer le résumé des changements (pour la réponse API et le log).
  const changes = (Object.keys(next) as (keyof RatingWeights)[])
    .filter((k) => Math.abs(next[k] - currentWeights[k]) > 0.0001)
    .map((k) => ({
      key: k,
      before: Math.round(currentWeights[k] * 10000) / 10000,
      after:  Math.round(next[k] * 10000) / 10000,
    }));

  // 8. Sauvegarder les nouveaux poids.
  const { error: upsertErr } = await supabase
    .from("performance_rating_weights")
    .upsert({ id: 1, ...next, updated_at: new Date().toISOString() });

  if (upsertErr) throw new Error(upsertErr.message);

  // 9. Logger le feedback dans l'historique.
  const { data: feedbackRow, error: logErr } = await supabase
    .from("performance_rating_feedback")
    .insert({
      computation_id:         computationId,
      direction,
      strength,
      weights_before:         currentWeights,
      weights_after:          next,
      changes,
      feedback_count_at_time: totalFeedbacks,
    })
    .select("id")
    .single();

  if (logErr) throw new Error(logErr.message);

  return {
    ok: true,
    weightsBefore: currentWeights,
    weightsAfter:  next,
    changes,
    feedbackId:    feedbackRow.id,
  };
}
