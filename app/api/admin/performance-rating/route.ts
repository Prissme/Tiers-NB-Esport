import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";
import { DIFFICULTY_MULTIPLIER, getBrawlerPriority } from "../../../lib/brawler-priority";

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
      kd?: number;
      brawler?: string;
      comp?: string[];
    };

    const kd = Number(body.kd);
    const brawler = String(body.brawler ?? "").trim();
    const comp = Array.isArray(body.comp)
      ? body.comp.map((b) => String(b ?? "").trim()).filter(Boolean).slice(0, 3)
      : [];

    if (!Number.isFinite(kd) || kd < 0 || !brawler) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const priority = getBrawlerPriority(brawler);
    if (priority === null) {
      return NextResponse.json({ error: `Brawler inconnu du bot de draft: ${brawler}` }, { status: 400 });
    }

    const diffMultiplier = DIFFICULTY_MULTIPLIER[priority];

    // --- Synergies communautaires réelles depuis Supabase (draft_community_evals) ---
    const supabase = withSchema(createServerClient());
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
    const compPriorityBonus = (compAvgPriority - 1) * 0.5;

    const synergyBonus = pairSynergy * 0.5 + trioSynergy * 0.5;

    let note = 5 + (kd - 1) * 2.2 * diffMultiplier + compPriorityBonus + synergyBonus;
    note = Math.max(0, Math.min(10, note));

    return NextResponse.json({
      note: Math.round(note * 10) / 10,
      breakdown: {
        kd,
        brawler,
        brawlerPriority: priority,
        diffMultiplier,
        compAvgPriority: Math.round(compAvgPriority * 100) / 100,
        compPriorityBonus: Math.round(compPriorityBonus * 100) / 100,
        pairSynergy: Math.round(pairSynergy * 100) / 100,
        trioSynergy: Math.round(trioSynergy * 100) / 100,
        pairDetails,
        trioDetail,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to compute rating." },
      { status: 500 }
    );
  }
}
