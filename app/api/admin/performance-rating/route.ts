import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";
import {
  getBrawlerPriority,
  getCounterEffect,
  getModeFitBonus,
  GAME_MODES,
  SUPPORTS,
  MELEES,
  SNIPERS_POKE,
  DIVE_UNITS,
} from "../../../lib/brawler-priority";
import { DEFAULT_WEIGHTS, type RatingWeights } from "../../../lib/rating-weights";

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
  map_mode: string | null;
  map_name: string | null;
};

function pairKey(a: string, b: string) {
  return [a, b].sort().join("_");
}

function trioKey(a: string, b: string, c: string) {
  return [a, b, c].sort().join("_");
}

// Miroir de buildMapKey dans discord-bot/draft.js : les deux runtimes (bot Discord et API
// Next.js) n'importent pas le même module, donc on garde la même logique des deux côtés
// plutôt que de dupliquer un état incohérent.
function buildMapKey(mode: string | null, name: string | null): string {
  const m = (mode || "unknown").trim().toLowerCase();
  const n = (name || "unknown").trim().toLowerCase();
  return `${m}|${n}`;
}

// Mêmes seuils que côté bot : en dessous, on considère qu'il n'y a pas assez de recul sur
// cette map précise et on retombe sur l'agrégat global toutes maps confondues.
const MIN_SAMPLES = { pair: 2, trio: 3 } as const;

// Un brawler "dégâts" (mêlée / poke-sniper / dive) est valorisé s'il fait plus de dégâts
// que de soin ; un brawler support est valorisé s'il fait l'inverse. Si les deux champs
// sont vides, le bonus est neutre (0).
function getDmgHealFitBonus(brawler: string, degats: number | null, soin: number | null): number {
  if (degats === null && soin === null) return 0;
  const d = degats ?? 0;
  const s = soin ?? 0;
  if (d === s) return 0;

  const isSupport = SUPPORTS.has(brawler);
  const isDps = MELEES.has(brawler) || SNIPERS_POKE.has(brawler) || DIVE_UNITS.has(brawler);

  if (isSupport) return s > d ? 1 : -0.5;
  if (isDps) return d > s ? 1 : -0.5;
  return 0;
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
      mapMode?: string;
      mapName?: string;
      starPlayer?: boolean;
      degats?: number | string | null;
      soin?: number | string | null;
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
    // Map précise (optionnelle) : si absente, tout retombe sur l'agrégat global toutes maps
    // confondues (comportement identique à l'ancien système, donc rétro-compatible).
    const mapMode = body.mapMode ? String(body.mapMode).trim() : null;
    const mapName = body.mapName ? String(body.mapName).trim() : null;
    const mapKey = mapMode || mapName ? buildMapKey(mapMode, mapName) : null;
    const starPlayer = body.starPlayer === true;
    const degats =
      body.degats === undefined || body.degats === null || body.degats === ""
        ? null
        : Number(body.degats);
    const soin =
      body.soin === undefined || body.soin === null || body.soin === "" ? null : Number(body.soin);

    if (!Number.isFinite(kills) || kills < 0 || !Number.isFinite(deaths) || deaths < 0 || !brawler) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }
    if (degats !== null && (!Number.isFinite(degats) || degats < 0)) {
      return NextResponse.json({ error: "Dégâts invalides." }, { status: 400 });
    }
    if (soin !== null && (!Number.isFinite(soin) || soin < 0)) {
      return NextResponse.json({ error: "Soin invalide." }, { status: 400 });
    }

    // KD dérivé de Kills/Morts : convention 0 mort => KD = Kills (on évite la division par 0).
    const kd = deaths > 0 ? kills / deaths : kills;

    const priority = getBrawlerPriority(brawler);
    if (priority === null) {
      return NextResponse.json({ error: `Brawler inconnu du bot de draft: ${brawler}` }, { status: 400 });
    }

    // --- Poids actuels (ajustés en temps réel par le feedback directionnel) ---
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
          dmg_heal_fit_coef: weightsRow.dmg_heal_fit_coef ?? DEFAULT_WEIGHTS.dmg_heal_fit_coef,
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
      .select("brawler_1, brawler_2, brawler_3, upvotes, downvotes, mid_votes, map_mode, map_name");

    if (error && error.code !== "42P01") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as EvalRow[];

    type Agg = { up: number; total: number };
    const globalPairAgg = new Map<string, Agg>();
    const globalTrioAgg = new Map<string, Agg>();
    const pairAggByMap = new Map<string, Map<string, Agg>>();
    const trioAggByMap = new Map<string, Map<string, Agg>>();

    const bump = (map: Map<string, Agg>, key: string, up: number, total: number) => {
      const current = map.get(key) ?? { up: 0, total: 0 };
      current.up += up;
      current.total += total;
      map.set(key, current);
    };

    for (const row of rows) {
      const up = row.upvotes ?? 0;
      const down = row.downvotes ?? 0;
      const mid = row.mid_votes ?? 0;
      const total = up + down + mid;
      if (total === 0) continue;

      const rowMapKey = buildMapKey(row.map_mode, row.map_name);
      if (!pairAggByMap.has(rowMapKey)) pairAggByMap.set(rowMapKey, new Map());
      if (!trioAggByMap.has(rowMapKey)) trioAggByMap.set(rowMapKey, new Map());
      const mapPairAgg = pairAggByMap.get(rowMapKey)!;
      const mapTrioAgg = trioAggByMap.get(rowMapKey)!;

      const brawlers = [row.brawler_1, row.brawler_2, row.brawler_3].filter(Boolean) as string[];
      if (brawlers.length === 3) {
        const key = trioKey(brawlers[0], brawlers[1], brawlers[2]);
        bump(globalTrioAgg, key, up, total);
        bump(mapTrioAgg, key, up, total);
      }
      for (let i = 0; i < brawlers.length; i += 1) {
        for (let j = i + 1; j < brawlers.length; j += 1) {
          const key = pairKey(brawlers[i], brawlers[j]);
          bump(globalPairAgg, key, up, total);
          bump(mapPairAgg, key, up, total);
        }
      }
    }

    // Cherche d'abord sur la map précise (si assez d'échantillons), sinon retombe sur
    // l'agrégat global toutes maps confondues. Sans mapKey (payload sans map), va direct
    // au global — comportement identique à l'ancien système.
    function lookupSynergy(
      kind: "pair" | "trio",
      key: string
    ): { agg: Agg; source: "map" | "global" } | null {
      const byMap = kind === "pair" ? pairAggByMap : trioAggByMap;
      const globalAgg = kind === "pair" ? globalPairAgg : globalTrioAgg;
      const minSamples = MIN_SAMPLES[kind];

      if (mapKey) {
        const mapAgg = byMap.get(mapKey)?.get(key);
        if (mapAgg && mapAgg.total >= minSamples) return { agg: mapAgg, source: "map" };
      }
      const agg = globalAgg.get(key);
      if (agg && agg.total >= minSamples) return { agg, source: "global" };
      return null;
    }

    let pairSynergy = 0;
    const pairDetails: { pair: string; ratio: number; effect: number; source: "map" | "global" }[] = [];
    for (let i = 0; i < comp.length; i += 1) {
      for (let j = i + 1; j < comp.length; j += 1) {
        const key = pairKey(comp[i], comp[j]);
        const found = lookupSynergy("pair", key);
        if (found) {
          const ratio = found.agg.up / found.agg.total;
          let effect = 0;
          if (ratio >= 0.65) effect = 1.5;
          else if (ratio <= 0.35) effect = -1.5;
          if (effect !== 0) {
            pairSynergy += effect;
            pairDetails.push({ pair: `${comp[i]} + ${comp[j]}`, ratio, effect, source: found.source });
          }
        }
      }
    }

    let trioSynergy = 0;
    let trioDetail: { trio: string; ratio: number; effect: number; source: "map" | "global" } | null = null;
    if (comp.length === 3) {
      const key = trioKey(comp[0], comp[1], comp[2]);
      const found = lookupSynergy("trio", key);
      if (found) {
        const ratio = found.agg.up / found.agg.total;
        let effect = 0;
        if (ratio >= 0.7) effect = 2.0;
        else if (ratio <= 0.35) effect = -2.5;
        if (effect !== 0) {
          trioSynergy = effect;
          trioDetail = { trio: comp.join(" + "), ratio, effect, source: found.source };
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

    // Dégâts / Soin (valeurs libres, champs liés côté formulaire) : bonus si le profil colle
    // au rôle du brawler (dégâts pour un profil dégâts, soin pour un support), léger malus sinon.
    const dmgHealFitRaw = getDmgHealFitBonus(brawler, degats, soin);
    const dmgHealFitBonus = dmgHealFitRaw * weights.dmg_heal_fit_coef;

    let note =
      5 +
      (kd - 1) * weights.kd_coef * diffMultiplier +
      compPriorityBonus +
      synergyBonus +
      counterBonus +
      modeFitBonus +
      starPlayerBonus +
      dmgHealFitBonus;
    note = Math.max(0, Math.min(10, note));
    note = Math.round(note * 10) / 10;

    const breakdown = {
      kills,
      deaths,
      kd: Math.round(kd * 100) / 100,
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
      mapMode,
      mapName,
      modeFitBonus: Math.round(modeFitBonus * 100) / 100,
      starPlayer,
      starPlayerBonus: Math.round(starPlayerBonus * 100) / 100,
      degats,
      soin,
      dmgHealFitBonus: Math.round(dmgHealFitBonus * 100) / 100,
    };

    // Enregistre ce calcul (entrées + sortie + poids utilisés) pour pouvoir le noter ensuite.
    const { data: inserted, error: insertError } = await supabase
      .from("performance_rating_computations")
      .insert({
        kd: Math.round(kd * 100) / 100,
        brawler,
        brawler_priority: priority,
        comp,
        opponent_comp: opponentComp,
        game_mode: gameMode,
        map_mode: mapMode,
        map_name: mapName,
        star_player: starPlayer,
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
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to compute rating." },
      { status: 500 }
    );
  }
}
