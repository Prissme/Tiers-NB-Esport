import { NextResponse } from "next/server";
import { createServerClient } from "../../../../../src/lib/supabase/server";
import { withSchema } from "../../../../../src/lib/supabase/schema";

const mapSeason = (row: Record<string, unknown>) => ({
  id: String(row.id ?? ""),
  name: row.name ? String(row.name) : "LFN",
  startsAt: row.starts_at ? String(row.starts_at) : null,
  endsAt: row.ends_at ? String(row.ends_at) : null,
  status: row.status ? String(row.status) : "upcoming",
});

export async function GET() {
  try {
    const supabase = withSchema(createServerClient());
    const { data, error } = await supabase
      .from("lfn_seasons")
      .select("*")
      .order("starts_at", { ascending: true });

    if (error) {
      console.warn("/api/site/season/current error", error);
      return NextResponse.json({ error: "Unable to load season." }, { status: 500 });
    }

    const seasons = (data ?? []).map((row) => mapSeason(row as Record<string, unknown>));
    const active = seasons.find((season) => season.status === "active");
    const upcoming = seasons.filter((season) => season.status === "upcoming");
    const season = active ?? upcoming[0] ?? seasons[0] ?? null;

    return NextResponse.json({ season, source: "supabase" });
  } catch (error) {
    console.error("/api/site/season/current error", error);
    return NextResponse.json({ error: "Unable to load season." }, { status: 500 });
  }
}
