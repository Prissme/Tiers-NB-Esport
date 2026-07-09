import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";
import {
  getBrawlerPriority,
  getCounterEffect,
  getModeFitBonus,
  GAME_MODES,
} from "../../../lib/brawler-priority";
import {
  DEFAULT_WEIGHTS,
  adjustWeightsDirectional,
  matchResultToDirection,
  type MatchResult,
  type RatingWeights,
  type RawSignals,
} from "../../../lib/rating-weights";

const ADMIN_COOKIE = "admin_session";

function isAdmin() {
  return cookies().get(ADMIN_COOKIE)?.value === "1";
}

type EvalRow = {
  brawler_1: string | null;
  brawler_2: string | null;
  brawler_3: string | null;
  upvotes: number | null;
  downvotes: number | null;
  mid_votes: number | null;
};

function pairKey(a: string, b: string) {
  return [a, b].sort().join("_");
}

function trioKey(a: string, b: string, c: string) {
  return [a, b, c].sort().join("_");
}

export async function POST(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      kills?: number;
      deaths?: number;
      brawler?: string;
      comp?: string[];
      opponentComp?: string[];
      gameMode?: string;
      starPlayer?: boolean;
      matchResult?: MatchResult;
    };

    const kills = Number(body.kills);
    const deaths = Number(body.deaths);
    const brawler = String(body.brawler ?? "").trim();
    const comp = Array.isArray(body.comp)
      ? body.comp.map((b) => String(b ?? "").trim()).filter(Boolean).slice(0, 3)
      : [];
    const opponentComp = Array.isArray(body.opponentComp)
      ? body.opponentComp.map((b) => String(b ?? "").trim()).filter(Boolean).slice(0, 3)
      : [];
    const gameMode = GAME_MODES.includes(body.gameMode as (typeof GAME_MODES)[number])
      ? (body.gameMode as string)
      : null;
    const starPlayer = body.starPlayer === true;
    const matchResult =
      body.matchResult === "victory" || body.matchResult === "defeat" ? body.matchResult : null;

    if (!Number.isFinite(kills) || kills < 0 || !Number.isFinite(deaths) || deaths < 0 || !brawler) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }
    if (!matchResult) {
      return NextResponse.json({ error: "matchResult (victory/defeat) is required." }, { status: 400 });
    }

    const priority = getBrawlerPriority(brawler);
    if (priority === null) {
      return NextResponse.json({ error: `Brawler inconnu du bot de draft: ${brawler}` }, { status: 400 });
    }

    // --- Poids actuels (ajustés en temps réel par les retours étoiles) ---
    const supabase = withSchema(createServerClient());
    const { data: weightsRow, error: weightsError } = await supabase
      .from("performance_rating_weights")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (weightsError && weightsError.code !== "42P01") {
      return NextResponse.json({ error: weightsError.message }, { status: 500 });
    }

    const weights: RatingWeights = weightsRow
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
          star_player_bonus: weightsRow.star_player_bonus,
        }
      : DEFAULT_WEIGHTS;

    const diffMultiplierByTier = {
      2: weights.diff_mult_tier2,
      1: weights.diff_mult_tier1,
      0: weights.diff_mult_tier0,
    } as const;
    const diffMultiplier = diffMultiplierByTier[priority];

    // --- Synergies communautaires réelles depuis Supabase (draft_community_evals) ---
    const { data, error } = await supabase
      .from("draft_community_evals")
      .select("brawler_1, brawler_2, brawler_3, upvotes, downvotes, mid_votes");

    if (error && error.code !== "42P01") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as EvalRow[];
    const pairAgg = new Map<string, { up: number; total: number }>();
    const trioAgg = new Map<string, { up: number; total: number }>();

    for (const row of rows) {
      const up = row.upvotes ?? 0;
      const down = row.downvotes ?? 0;
      const mid = row.mid_votes ?? 0;
      const total = up + down + mid;
      if (total === 0) continue;

      const brawlers = [row.brawler_1, row.brawler_2, row.brawler_3].filter(Boolean) as string[];
      if (brawlers.length === 3) {
        const key = trioKey(brawlers[0], brawlers[1], brawlers[2]);
        const current = trioAgg.get(key) ?? { up: 0, total: 0 };
        current.up += up;
        current.total += total;
        trioAgg.set(key, current);
      }
      for (let i = 0; i < brawlers.length; i += 1) {
        for (let j = i + 1; j < brawlers.length; j += 1) {
          const key = pairKey(brawlers[i], brawlers[j]);
          const current = pairAgg.get(key) ?? { up: 0, total: 0 };
          current.up += up;
          current.total += total;
          pairAgg.set(key, current);
        }
      }
    }

    let pairSynergy = 0;
    const pairDetails: { pair: string; ratio: number; effect: number }[] = [];
    for (let i = 0; i < comp.length; i += 1) {
      for (let j = i + 1; j < comp.length; j += 1) {
        const key = pairKey(comp[i], comp[j]);
        const agg = pairAgg.get(key);
        if (agg && agg.total >= 2) {
          const ratio = agg.up / agg.total;
          let effect = 0;
          if (ratio >= 0.65) effect = 1.5;
          else if (ratio <= 0.35) effect = -1.5;
          if (effect !== 0) {
            pairSynergy += effect;
            pairDetails.push({ pair: `${comp[i]} + ${comp[j]}`, ratio, effect });
          }
        }
      }
    }

    let trioSynergy = 0;
    let trioDetail: { trio: string; ratio: number; effect: number } | null = null;
    if (comp.length === 3) {
      const key = trioKey(comp[0], comp[1], comp[2]);
      const agg = trioAgg.get(key);
      if (agg && agg.total >= 3) {
        const ratio = agg.up / agg.total;
        let effect = 0;
        if (ratio >= 0.7) effect = 2.0;
        else if (ratio <= 0.35) effect = -2.5;
        if (effect !== 0) {
          trioSynergy = effect;
          trioDetail = { trio: comp.join(" + "), ratio, effect };
        }
      }
    }

    const compPriorities = comp
      .map((b) => getBrawlerPriority(b))
      .filter((p): p is 0 | 1 | 2 => p !== null);
    const compAvgPriority = compPriorities.length
      ? compPriorities.reduce((a, b) => a + b, 0) / compPriorities.length
      : 1;
    const compPriorityBonus = (compAvgPriority - 1) * weights.comp_bonus_coef;

    const synergyBonus = pairSynergy * weights.pair_synergy_coef + trioSynergy * weights.trio_synergy_coef;

    // Contre mécaniquement la comp adverse (ou en est victime), d'après COUNTER_BY_USER_PICK.
    const counterEffect = getCounterEffect(brawler, opponentComp); // -1, 0, ou 1
    const counterBonus = counterEffect * weights.counter_coef;

    // Bonus léger si le rôle du brawler colle au mode de jeu choisi.
    const modeFitRaw = getModeFitBonus(brawler, gameMode); // 0 ou 0.3 (référence de forme, pas de valeur)
    const modeFitBonus = modeFitRaw > 0 ? weights.mode_fit_bonus : 0;

    // "Joueur Star" : impact décisif sur l'objectif (ex: hard focus coffre en Braquage)
    // qui n'est pas capturé par le K/D brut. Bonus fixe indépendant du reste.
    const starPlayerBonus = starPlayer ? weights.star_player_bonus : 0;

    // Différentiel net kills - morts. Contrairement au ratio K/D, ça distingue bien
    // 0 kill / 2 morts (-2, correct) de 0 kill / 11 morts (-11, catastrophique) :
    // un ratio brut aurait donné 0 dans les deux cas.
    const netKD = kills - deaths;

    let note =
      5 +
      netKD * weights.kd_coef * diffMultiplier +
      compPriorityBonus +
      synergyBonus +
      counterBonus +
      modeFitBonus +
      starPlayerBonus;
    note = Math.max(0, Math.min(10, note));
    note = Math.round(note * 10) / 10;

    const breakdown = {
      kills,
      deaths,
      netKD,
      brawler,
      brawlerPriority: priority,
      diffMultiplier,
      compAvgPriority: Math.round(compAvgPriority * 100) / 100,
      compPriorityBonus: Math.round(compPriorityBonus * 100) / 100,
      pairSynergy: Math.round(pairSynergy * 100) / 100,
      trioSynergy: Math.round(trioSynergy * 100) / 100,
      pairDetails,
      trioDetail,
      opponentComp,
      counterEffect,
      counterBonus: Math.round(counterBonus * 100) / 100,
      gameMode,
      modeFitBonus: Math.round(modeFitBonus * 100) / 100,
      starPlayer,
      starPlayerBonus: Math.round(starPlayerBonus * 100) / 100,
    };

    // --- Le résultat réel du match sert de vérité terrain pour l'algo ---
    // Note haute + victoire (ou note basse + défaite) = la note était cohérente,
    // on renforce les facteurs qui l'ont produite. Note haute + défaite (ou note
    // basse + victoire) = la note était à côté de la plaque, on les atténue.
    const inferredDirection = matchResultToDirection(note, matchResult);
    let nextWeights = weights;
    let weightChanges: { key: keyof RatingWeights; before: number; after: number }[] = [];

    if (inferredDirection) {
      const raw: RawSignals = {
        kdDelta: netKD,
        brawlerPriority: priority,
        compRaw: compAvgPriority - 1,
        pairSynergyRaw: pairSynergy,
        trioSynergyRaw: trioSynergy,
        counterEffect,
        modeFitRaw,
        starPlayer,
      };
      nextWeights = adjustWeightsDirectional(weights, inferredDirection, raw);

      const { error: upsertError } = await supabase
        .from("performance_rating_weights")
        .upsert({ id: 1, ...nextWeights, updated_at: new Date().toISOString() });

      if (upsertError && upsertError.code !== "42P01") {
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }

      weightChanges = (Object.keys(nextWeights) as (keyof RatingWeights)[])
        .filter((key) => nextWeights[key] !== weights[key])
        .map((key) => ({
          key,
          before: Math.round(weights[key] * 1000) / 1000,
          after: Math.round(nextWeights[key] * 1000) / 1000,
        }));
    }

    // Enregistre ce calcul (entrées + sortie + résultat + poids utilisés).
    const { data: inserted, error: insertError } = await supabase
      .from("performance_rating_computations")
      .insert({
        kills,
        deaths,
        brawler,
        brawler_priority: priority,
        comp,
        opponent_comp: opponentComp,
        game_mode: gameMode,
        star_player: starPlayer,
        match_result: matchResult,
        note,
        breakdown,
        weights_snapshot: weights,
      })
      .select("id")
      .single();

    if (insertError && insertError.code !== "42P01") {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      note,
      computationId: inserted?.id ?? null,
      breakdown,
      weightChanges,
      neutralMatchResult: !inferredDirection,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to compute rating." },
      { status: 500 }
    );
  }
}
