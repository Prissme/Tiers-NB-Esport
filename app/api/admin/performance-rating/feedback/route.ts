import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "../../../../../src/lib/supabase/server";
import { withSchema } from "../../../../../src/lib/supabase/schema";
import {
  DEFAULT_WEIGHTS,
  adjustWeights,
  adjustWeightsDirectional,
  type ContributionFlags,
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
  netKD: number;
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
      stars?: number;
      direction?: Direction;
    };
    const computationId = String(body.computationId ?? "").trim();
    const stars = body.stars === undefined ? null : Number(body.stars);
    const direction = body.direction === "up" || body.direction === "down" ? body.direction : null;

    if (!computationId || (stars === null && direction === null)) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }
    if (stars !== null && (!Number.isInteger(stars) || stars < 0 || stars > 5)) {
      return NextResponse.json({ error: "Invalid stars." }, { status: 400 });
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

    if (stars !== null) {
      const { error: updateError } = await supabase
        .from("performance_rating_computations")
        .update({ stars, rated_at: new Date().toISOString() })
        .eq("id", computationId);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
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

    let nextWeights: RatingWeights;
    if (direction) {
      const raw: RawSignals = {
        kdDelta: breakdown.netKD,
        brawlerPriority: breakdown.brawlerPriority,
        compRaw: breakdown.compAvgPriority - 1,
        pairSynergyRaw: breakdown.pairSynergy,
        trioSynergyRaw: breakdown.trioSynergy,
        counterEffect: breakdown.counterEffect,
        modeFitRaw: breakdown.modeFitBonus,
        starPlayer: breakdown.starPlayer,
      };
      nextWeights = adjustWeightsDirectional(currentWeights, direction, raw);
    } else {
      const flags: ContributionFlags = {
        kdUsed: breakdown.netKD !== 0,
        brawlerPriority: breakdown.brawlerPriority,
        compBonusUsed: breakdown.compPriorityBonus !== 0,
        pairSynergyUsed: breakdown.pairSynergy !== 0,
        trioSynergyUsed: breakdown.trioSynergy !== 0,
        counterUsed: breakdown.counterEffect !== 0,
        modeFitUsed: breakdown.modeFitBonus !== 0,
        starPlayerUsed: (breakdown.starPlayerBonus ?? 0) !== 0,
      };
      nextWeights = adjustWeights(currentWeights, stars as number, flags);
    }

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
