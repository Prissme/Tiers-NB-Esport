/**
 * rating-reinforcement.ts
 *
 * Système de renforcement léger par feedback humain (RLHF simplifié).
 *
 * Deux signaux combinés :
 *
 *  1. VICTORY (signal primaire, objectif)
 *     Victoire  → renforcer les poids de synergies, counter, mode fit.
 *     Défaite   → les atténuer.
 *     Poids 2x dans la combinaison finale.
 *     Logique : si une compo bat une autre, l'IA doit apprendre que
 *     ses synergies/counters sont bons/mauvais — c'est une vérité terrain.
 *
 *  2. DIRECTION admin (signal secondaire, subjectif)
 *     "Trop basse" / "Trop haute" — correction humaine de la calibration.
 *     Poids 1x. Ajuste aussi K/D et star player que victory ne touche pas.
 *
 *  Quand les deux convergent → consensus amplifié (jusqu'à 1.5x LR).
 *  Quand ils divergent      → effet atténué (signal contradictoire).
 *
 * Régularisation :
 *  - Bornes dures min/max par poids (clamp).
 *  - Régularisation L2 douce : tire chaque poids vers sa valeur par défaut
 *    à chaque ajustement, évite la dérive progressive.
 *  - Learning rate adaptatif : diminue exponentiellement avec le nombre
 *    de feedbacks accumulés (plancher à 20 % du BASE_LR).
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

/** Learning rate de base pour un feedback "normal". */
const BASE_LR = 0.08;

/** Multiplicateurs selon la force du signal. */
const STRENGTH_MULT: Record<Strength, number> = {
  weak: 0.5,
  normal: 1.0,
  strong: 1.5,
};

/**
 * Learning rate adaptatif.
 * Décroît exponentiellement avec le nombre de feedbacks passés.
 * Plancher à 20 % du BASE_LR pour ne jamais arrêter d'apprendre.
 *
 *   0  feedbacks → decay ≈ 1.00
 *  20  feedbacks → decay ≈ 0.78
 *  50  feedbacks → decay ≈ 0.54
 * 100  feedbacks → decay ≈ 0.29
 * 200+ feedbacks → plancher 0.20
 */
function adaptiveLR(baseRate: number, feedbackCount: number): number {
  const decay = Math.max(0.2, Math.exp(-feedbackCount / 150));
  return baseRate * decay;
}

/**
 * Régularisation L2 douce : tire le poids vers sa valeur par défaut.
 * λ petit = effet très doux, évite la dérive sans jamais forcer le retour.
 */
const L2_LAMBDA = 0.05;

function l2Pull(weight: number, defaultValue: number): number {
  return -L2_LAMBDA * (weight - defaultValue);
}

/** Bornes dures min/max par poids. */
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
 * Ajuste un poids unique.
 *
 * @param weight          Valeur actuelle du poids
 * @param defaultValue    Valeur par défaut (pour régularisation L2)
 * @param bounds          [min, max] autorisés
 * @param contributionSign  Signe de la contribution de ce poids à la note (+1/-1/0)
 * @param direction       Direction souhaitée ("up" = monter la note, "down" = la baisser)
 * @param lr              Learning rate effectif (déjà calculé)
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

  // +1 si on veut monter la note, -1 si on veut la baisser
  const wantSign = direction === "up" ? 1 : -1;

  // Si la contribution allait dans le même sens → amplifier le poids.
  // Si elle allait en sens inverse → le réduire.
  const delta = wantSign * contributionSign * lr;

  // Régularisation douce : tire vers le défaut
  const reg = l2Pull(weight, defaultValue);

  return clamp(weight * (1 + delta) + reg * lr, bounds);
}

// ─── Fonction principale ────────────────────────────────────────────────────

/**
 * Applique un ajustement de renforcement à partir d'un feedback humain.
 *
 * @param computationId  UUID de la computation (dans performance_rating_computations)
 * @param direction      "up" = note trop basse, "down" = note trop haute
 * @param strength       Force du signal : "weak" | "normal" | "strong"
 */
export async function applyReinforcementLearning(
  computationId: string,
  direction: Direction,
  strength: Strength = "normal"
): Promise<ReinforcementResult> {
  const supabase = withSchema(createServerClient());

  // 1. Charger la computation (breakdown + résultat du match)
  const { data: computation, error: compErr } = await supabase
    .from("performance_rating_computations")
    .select("id, breakdown, weights_snapshot, victory")
    .eq("id", computationId)
    .maybeSingle();

  if (compErr) throw new Error(compErr.message);
  if (!computation) throw new Error("Computation not found.");

  // 2. Charger les poids LIVE (pas le snapshot)
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

  // 3. Compter les feedbacks existants pour le LR adaptatif
  const { count: feedbackCount } = await supabase
    .from("performance_rating_feedback")
    .select("id", { count: "exact", head: true });

  const totalFeedbacks = feedbackCount ?? 0;
  const lr = adaptiveLR(BASE_LR, totalFeedbacks) * STRENGTH_MULT[strength];

  // 4. Signaux bruts depuis le breakdown sauvegardé
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

  // 5. Résultat du match : signal primaire (objectif, terrain)
  const victory: boolean | null = (computation as { victory?: boolean | null }).victory ?? null;

  // 6. Combiner les deux signaux en une direction effective.
  //
  //    Score victory  : +2 (victoire) / 0 (inconnu) / -2 (défaite)
  //    Score direction: +1 (up)       / -1 (down)
  //    Total possible : -3 à +3
  //
  //    → positif = effectiveDirection "up"
  //    → négatif = effectiveDirection "down"
  //    → consensus (|score| élevé) → LR amplifié jusqu'à 1.5x
  const victoryScore  = victory === null ? 0 : victory ? 2 : -2;
  const directionScore = direction === "up" ? 1 : -1;
  const combinedScore  = victoryScore + directionScore;

  const effectiveDirection: Direction = combinedScore >= 0 ? "up" : "down";

  // Amplification si consensus fort (max 1.5x), atténuation si contradiction
  const consensus    = Math.min(1.5, Math.abs(combinedScore) / 2);
  const effectiveLR  = lr * Math.max(0.5, consensus); // plancher 0.5x si signaux opposés

  // 7. Appliquer les ajustements poids par poids
  const next: RatingWeights = { ...currentWeights };

  // ── K/D + tier : performance individuelle, victory ne dit rien là-dessus.
  //    Un joueur peut perdre avec un excellent K/D. → direction admin seule.
  if (raw.kdDelta !== 0) {
    const s = sign(raw.kdDelta);
    next.kd_coef = adjustOne(
      currentWeights.kd_coef, DEFAULT_WEIGHTS.kd_coef,
      BOUNDS.kd_coef, s, direction, lr
    );
    const tierKey = (["diff_mult_tier0", "diff_mult_tier1", "diff_mult_tier2"] as const)[raw.brawlerPriority];
    next[tierKey] = adjustOne(
      currentWeights[tierKey], DEFAULT_WEIGHTS[tierKey],
      BOUNDS[tierKey], s, direction, lr
    );
  }

  // ── Synergies, counter, mode fit : résultat du match est le signal principal.
  //    C'est ici que l'IA apprend que compo A bat compo B sur telle map.
  if (raw.compRaw !== 0) {
    next.comp_bonus_coef = adjustOne(
      currentWeights.comp_bonus_coef, DEFAULT_WEIGHTS.comp_bonus_coef,
      BOUNDS.comp_bonus_coef, sign(raw.compRaw), effectiveDirection, effectiveLR
    );
  }
  if (raw.pairSynergyRaw !== 0) {
    next.pair_synergy_coef = adjustOne(
      currentWeights.pair_synergy_coef, DEFAULT_WEIGHTS.pair_synergy_coef,
      BOUNDS.pair_synergy_coef, sign(raw.pairSynergyRaw), effectiveDirection, effectiveLR
    );
  }
  if (raw.trioSynergyRaw !== 0) {
    next.trio_synergy_coef = adjustOne(
      currentWeights.trio_synergy_coef, DEFAULT_WEIGHTS.trio_synergy_coef,
      BOUNDS.trio_synergy_coef, sign(raw.trioSynergyRaw), effectiveDirection, effectiveLR
    );
  }
  if (raw.counterEffect !== 0) {
    next.counter_coef = adjustOne(
      currentWeights.counter_coef, DEFAULT_WEIGHTS.counter_coef,
      BOUNDS.counter_coef, sign(raw.counterEffect), effectiveDirection, effectiveLR
    );
  }
  if (raw.modeFitRaw > 0) {
    next.mode_fit_bonus = adjustOne(
      currentWeights.mode_fit_bonus, DEFAULT_WEIGHTS.mode_fit_bonus,
      BOUNDS.mode_fit_bonus, 1, effectiveDirection, effectiveLR
    );
  }

  // ── Star player : signal individuel comme K/D → direction admin seule.
  if (raw.starPlayer) {
    next.star_player_bonus = adjustOne(
      currentWeights.star_player_bonus, DEFAULT_WEIGHTS.star_player_bonus,
      BOUNDS.star_player_bonus, 1, direction, lr
    );
  }

  // 8. Résumé des changements
  const changes = (Object.keys(next) as (keyof RatingWeights)[])
    .filter((k) => Math.abs(next[k] - currentWeights[k]) > 0.0001)
    .map((k) => ({
      key:    k,
      before: Math.round(currentWeights[k] * 10000) / 10000,
      after:  Math.round(next[k] * 10000) / 10000,
    }));

  // 9. Sauvegarder les nouveaux poids
  const { error: upsertErr } = await supabase
    .from("performance_rating_weights")
    .upsert({ id: 1, ...next, updated_at: new Date().toISOString() });

  if (upsertErr) throw new Error(upsertErr.message);

  // 10. Logger le feedback dans l'historique
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
    ok:            true,
    weightsBefore: currentWeights,
    weightsAfter:  next,
    changes,
    feedbackId:    feedbackRow.id,
  };
}
