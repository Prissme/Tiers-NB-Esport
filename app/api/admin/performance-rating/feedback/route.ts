import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "../../../../../src/lib/supabase/server";
import { withSchema } from "../../../../../src/lib/supabase/schema";
import { DEFAULT_WEIGHTS, adjustWeights, type ContributionFlags, type RatingWeights } from "../../../../lib/rating-weights";

const ADMIN_COOKIE = "admin_session";

function isAdmin() {
  return cookies().get(ADMIN_COOKIE)?.value === "1";
}

export async function POST(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { computationId?: string; stars?: number };
    const computationId = String(body.computationId ?? "").trim();
    const stars = Number(body.stars);

    if (!computationId || !Number.isInteger(stars) || stars < 0 || stars > 5) {
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

    const { error: updateError } = await supabase
      .from("performance_rating_computations")
      .update({ stars, rated_at: new Date().toISOString() })
      .eq("id", computationId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // --- Ajustement en temps réel des poids, uniquement sur les facteurs qui ont
    // réellement pesé dans CE calcul précis ---
    const breakdown = computation.breakdown as {
      brawlerPriority: 0 | 1 | 2;
      compPriorityBonus: number;
      pairSynergy: number;
      trioSynergy: number;
      counterEffect: number;
      modeFitBonus: number;
      kd: number;
    };

    const flags: ContributionFlags = {
      kdUsed: breakdown.kd !== 1,
      brawlerPriority: breakdown.brawlerPriority,
      compBonusUsed: breakdown.compPriorityBonus !== 0,
      pairSynergyUsed: breakdown.pairSynergy !== 0,
      trioSynergyUsed: breakdown.trioSynergy !== 0,
      counterUsed: breakdown.counterEffect !== 0,
      modeFitUsed: breakdown.modeFitBonus !== 0,
    };

    const { data: weightsRow, error: weightsError } = await supabase
      .from("performance_rating_weights")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (weightsError) {
      return NextResponse.json({ error: weightsError.message }, { status: 500 });
    }

    const currentWeights: RatingWeights = weightsRow
      ? {
          kd_coef: weightsRow.kd_coef,
          diff_mult_tier2: weightsRow.diff_mult_tier2,
          diff_mult_tier1: weightsRow.diff_mult_tier1,
          diff_mult_tier0: weightsRow.diff_mult_tier0,
          comp_bonus_coef: weightsRow.comp_bonus_coef,
          pair_synergy_coef: weightsRow.pair_synergy_coef,
          trio_synergy_coef: weightsRow.trio_synergy_coef,
          counter_coef: weightsRow.counter_coef,
          mode_fit_bonus: weightsRow.mode_fit_bonus,
        }
      : DEFAULT_WEIGHTS;

    const nextWeights = adjustWeights(currentWeights, stars, flags);

    const { error: upsertError } = await supabase
      .from("performance_rating_weights")
      .upsert({ id: 1, ...nextWeights, updated_at: new Date().toISOString() });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, weights: nextWeights });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save feedback." },
      { status: 500 }
    );
  }
}
