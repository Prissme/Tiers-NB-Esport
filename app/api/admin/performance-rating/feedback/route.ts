import { NextResponse } from "next/server";
import {
  applyReinforcementLearning,
  type Strength,
} from "../../../../../src/lib/rating-reinforcement";
import type { Direction, FeedbackReason } from "../../../../lib/rating-weights";

const VALID_REASONS: FeedbackReason[] = ["matchup", "role", "kd", "comp"];
import { isAdminAuthenticated } from "../../../../../src/lib/admin/auth";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      computationId?: string;
      direction?: Direction;
      strength?: Strength;
      reasons?: string[];
    };

    const computationId = String(body.computationId ?? "").trim();
    const direction =
      body.direction === "up" || body.direction === "down" ? body.direction : null;
    const strength: Strength =
      body.strength === "weak" || body.strength === "strong" ? body.strength : "normal";
    const reasons: FeedbackReason[] = Array.isArray(body.reasons)
      ? body.reasons.filter((r): r is FeedbackReason => VALID_REASONS.includes(r as FeedbackReason))
      : [];

    if (!computationId || direction === null) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const result = await applyReinforcementLearning(computationId, direction, strength, reasons);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to save feedback.",
      },
      { status: 500 }
    );
  }
}
