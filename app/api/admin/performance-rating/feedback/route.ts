import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "../../../../../src/lib/supabase/server";
import { withSchema } from "../../../../../src/lib/supabase/schema";
import {
  DEFAULT_WEIGHTS,
  adjustWeightsDirectional,
  type Direction,
  type RatingWeights,
  type RawSignals,
} from "../../../../lib/rating-weights";

const ADMIN_COOKIE = "admin_session";

function isAdmin() {
  return cookies().get(ADMIN_COOKIE)?.value === "1";
}

type StoredBreakdown = {
  brawlerPriority: 0 | 1 | 2;
  compAvgPriority: number;
  compPriorityBonus: number;
  pairSynergy: number;
  trioSynergy: number;
  counterEffect: number;
  modeFitBonus: number;
  starPlayer: boolean;
  starPlayerBonus: number;
  kd: number;
};

function loadWeights(row: Record<string, number> | null): RatingWeights {
  return row
    ? {
        kd_coef: row.kd_coef,
        diff_mult_tier2: row.diff_mult_tier2,
        diff_mult_tier1: row.diff_mult_tier1,
        diff_mult_tier0: row.diff_mult_tier0,
        comp_bonus_coef: row.comp_bonus_coef,
        pair_synergy_coef: row.pair_synergy_coef,
        trio_synergy_coef: row.trio_synergy_coef,
        counter_coef: row.counter_coef,
        mode_fit_bonus: row.mode_fit_bonus,
        star_player_bonus: row.star_player_bonus,
        dmg_heal_fit_coef: row.dmg_heal_fit_coef ?? DEFAULT_WEIGHTS.dmg_heal_fit_coef,
      }
    : DEFAULT_WEIGHTS;
}

export async function POST(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      computationId?: string;
      direction?: Direction;
    };
    const computationId = String(body.computationId ?? "").trim();
    const direction = body.direction === "up" || body.direction === "down" ? body.direction : null;

    if (!computationId || direction === null) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const supabase = withSchema(createServerClient());

    const { data: computation, error: fetchError } = await supabase
      .from("performance_rating_computations")
      .select("id, breakdown, weights_snapshot")
      .eq("id", computationId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!computation) {
      return NextResponse.json({ error: "Computation not found." }, { status: 404 });
    }

    const breakdown = computation.breakdown as StoredBreakdown;

    const { data: weightsRow, error: weightsError } = await supabase
      .from("performance_rating_weights")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (weightsError) {
      return NextResponse.json({ error: weightsError.message }, { status: 500 });
    }

    const currentWeights = loadWeights(weightsRow);

    const raw: RawSignals = {
      kdDelta: breakdown.kd - 1,
      brawlerPriority: breakdown.brawlerPriority,
      compRaw: breakdown.compAvgPriority - 1,
      pairSynergyRaw: breakdown.pairSynergy,
      trioSynergyRaw: breakdown.trioSynergy,
      counterEffect: breakdown.counterEffect,
      modeFitRaw: breakdown.modeFitBonus,
      starPlayer: breakdown.starPlayer,
    };
    const nextWeights = adjustWeightsDirectional(currentWeights, direction, raw);

    const { error: upsertError } = await supabase
      .from("performance_rating_weights")
      .upsert({ id: 1, ...nextWeights, updated_at: new Date().toISOString() });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    const changes = (Object.keys(nextWeights) as (keyof RatingWeights)[])
      .filter((key) => nextWeights[key] !== currentWeights[key])
      .map((key) => ({
        key,
        before: Math.round(currentWeights[key] * 1000) / 1000,
        after: Math.round(nextWeights[key] * 1000) / 1000,
      }));

    return NextResponse.json({ ok: true, weights: nextWeights, changes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save feedback." },
      { status: 500 }
    );
  }
}
