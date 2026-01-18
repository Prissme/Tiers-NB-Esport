import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "../../../../src/lib/supabase/server";
import { withSchema } from "../../../../src/lib/supabase/schema";
import { MATCHES_TABLE } from "../../../../src/lib/supabase/config";

const querySchema = z.object({
  season: z.string().uuid().optional(),
  phase: z.string().optional(),
  division: z.string().optional(),
});

const normalizeDivision = (value: unknown) => {
  const raw = String(value ?? "").trim();
  const upper = raw.toUpperCase();
  if (["D1", "DIV1", "DIVISION 1", "DIVISION_1"].includes(upper)) return "D1";
  if (["D2", "DIV2", "DIVISION 2", "DIVISION_2"].includes(upper)) return "D2";
  return raw || null;
};

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const buildDateLabel = (scheduledAt?: string | null, fallback?: string | null) => {
  if (scheduledAt) {
    const date = new Date(scheduledAt);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    }
  }
  return fallback ?? "À confirmer";
};

const buildTimeLabel = (scheduledAt?: string | null, startTime?: string | null) => {
  if (scheduledAt) {
    const date = new Date(scheduledAt);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }
  return startTime ?? null;
};

const mapTeam = (row: Record<string, unknown> | null, fallbackId: string) => ({
  id: row?.id ? String(row.id) : fallbackId,
  name: row?.name ? String(row.name) : fallbackId,
  tag: row?.tag ? String(row.tag) : null,
  division: row?.division ? String(row.division) : null,
  logoUrl: row?.logo_url ? String(row.logo_url) : null,
});

const mapMatchRow = (row: Record<string, unknown>) => {
  const teamARow = row.team_a as Record<string, unknown> | null;
  const teamBRow = row.team_b as Record<string, unknown> | null;
  const teamAId = row.team_a_id ? String(row.team_a_id) : "";
  const teamBId = row.team_b_id ? String(row.team_b_id) : "";
  return {
    id: String(row.id ?? ""),
    division: row.division ? String(row.division) : null,
    status: row.status ? String(row.status) : "scheduled",
    scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null,
    dayLabel: row.day ? String(row.day) : null,
    startTime: row.start_time ? String(row.start_time) : null,
    phase: row.phase ? String(row.phase) : "regular",
    round: row.round ? String(row.round) : null,
    matchGroup: row.match_group ? String(row.match_group) : null,
    bestOf: toNumber(row.best_of),
    scoreA: toNumber(row.score_a),
    scoreB: toNumber(row.score_b),
    teamA: mapTeam(teamARow, teamAId),
    teamB: mapTeam(teamBRow, teamBId),
  };
};

const groupMatches = (matches: ReturnType<typeof mapMatchRow>[]) => {
  const grouped: Record<string, { key: string; label: string; timeLabel: string | null; matchGroup: string | null; scheduledAt: string | null; matches: ReturnType<typeof mapMatchRow>[] }> = {};

  matches.forEach((match) => {
    const dateLabel = buildDateLabel(match.scheduledAt, match.dayLabel);
    const timeLabel = match.matchGroup ?? buildTimeLabel(match.scheduledAt, match.startTime);
    const key = `${dateLabel}__${timeLabel ?? ""}`;
    if (!grouped[key]) {
      grouped[key] = {
        key,
        label: dateLabel,
        timeLabel: typeof timeLabel === "string" ? timeLabel : null,
        matchGroup: match.matchGroup ?? null,
        scheduledAt: match.scheduledAt,
        matches: [],
      };
    }
    grouped[key].matches.push(match);
  });

  return Object.values(grouped).sort((a, b) => {
    const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
    const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
    return aTime - bTime;
  });
};

const buildQuery = (supabase: ReturnType<typeof withSchema>, params: z.infer<typeof querySchema>) => {
  let query = supabase
    .from(MATCHES_TABLE)
    .select(
      `id, division, status, scheduled_at, day, start_time, phase, round, match_group, best_of, score_a, score_b, team_a_id, team_b_id,
       team_a:lfn_teams!team_a_id(id, name, tag, logo_url, division),
       team_b:lfn_teams!team_b_id(id, name, tag, logo_url, division)`
    )
    .order("scheduled_at", { ascending: true });

  if (params.season) {
    query = query.eq("season_id", params.season);
  }
  if (params.phase) {
    query = query.eq("phase", params.phase);
  }
  if (params.division) {
    query = query.eq("division", normalizeDivision(params.division));
  }

  return query;
};

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query." }, { status: 400 });
  }

  try {
    const supabase = withSchema(createServerClient());
    let { data, error } = await buildQuery(supabase, parsed.data);

    if (error) {
      console.warn("/api/site/matches error", error);
      return NextResponse.json({ error: "Unable to load matches." }, { status: 500 });
    }

    if (!data || data.length === 0) {
      const fallback = await supabase
        .from(MATCHES_TABLE)
        .select(
          `id, division, status, scheduled_at, day, start_time, phase, round, match_group, best_of, score_a, score_b, team_a_id, team_b_id,
           team_a:lfn_teams!team_a_id(id, name, tag, logo_url, division),
           team_b:lfn_teams!team_b_id(id, name, tag, logo_url, division)`
        )
        .order("scheduled_at", { ascending: true });

      if (fallback.error) {
        console.warn("/api/site/matches fallback error", fallback.error);
        return NextResponse.json({ error: "Unable to load matches." }, { status: 500 });
      }

      data = fallback.data ?? [];
    }

    const matches = (data ?? []).map((row) => mapMatchRow(row as Record<string, unknown>));
    const groups = groupMatches(matches).map((group) => ({
      label: group.label,
      dateLabel: group.label,
      timeLabel: group.timeLabel,
      matchGroup: group.matchGroup,
      scheduledAt: group.scheduledAt,
      matches: group.matches,
    }));

    return NextResponse.json({ groups, source: "supabase" });
  } catch (error) {
    console.error("/api/site/matches error", error);
    return NextResponse.json({ error: "Unable to load matches." }, { status: 500 });
  }
}
