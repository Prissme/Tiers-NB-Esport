import Button from "../components/Button";
import SectionHeader from "../components/SectionHeader";
import ActiveRostersClient from "./ActiveRostersClient";
import { createAdminClient } from "../../src/lib/supabase/admin";
import { withSchema } from "../../src/lib/supabase/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const teamTiles = [
  { label: "D1", detail: "Élite" },
  { label: "D2", detail: "Challengers" },
  { label: "Rosters", detail: "Visibles" },
];

const defaultStandings = [
  "B&D",
  "LTG",
  "BT",
  "JL",
  "LZ",
  "VLH",
  "NR",
  "T2",
];

type ActiveRosterRow = {
  tag: string | null;
  division: string | null;
  members_count: number | null;
  members: unknown;
  name?: string | null;
  logo_url?: string | null;
  logoUrl?: string | null;
};

const loadActiveRosters = async (): Promise<{
  rosters: ActiveRosterRow[];
  errorMessage: string | null;
}> => {
  const supabase = withSchema(createAdminClient());
  const { data, error } = await supabase
    .from("lfn_active_rosters")
    .select("*")
    .order("tag", { ascending: true });

  if (error) {
    console.error("lfn_active_rosters error", error);
  }

  return {
    rosters: Array.isArray(data) ? (data as ActiveRosterRow[]) : [],
    errorMessage: error?.message ?? null,
  };
};

export default async function EquipesPage() {
  const { rosters, errorMessage } = await loadActiveRosters();
  const standingsTeams =
    rosters.length > 0
      ? rosters.map((team) => team.name ?? team.tag ?? "Équipe")
      : defaultStandings;

  return (
    <div className="space-y-12">
      <section className="motion-field p-8">
        <div className="motion-orb -left-12 top-8 h-52 w-52 motion-drift" />
        <div className="motion-orb motion-orb--blue right-0 top-4 h-56 w-56 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Équipes"
            title="Rosters lisibles"
            description="Cartes courtes, infos rapides."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {teamTiles.map((tile) => (
              <div key={tile.label} className="motion-card motion-shimmer">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{tile.label}</p>
                <p className="mt-3 text-sm text-white">{tile.detail}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/inscription" variant="primary">
              Inscrire
            </Button>
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader kicker="Équipes" title="Rosters actifs" description="Données en direct." />
        {errorMessage ? (
          <p className="text-sm text-rose-400">Erreur: {errorMessage}</p>
        ) : null}
        {rosters.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun roster actif (aucun membre enregistré).</p>
        ) : (
          <ActiveRostersClient rosters={rosters} />
        )}
      </section>

      <section className="section-card space-y-6">
        <SectionHeader kicker="Classement" title="Classement des équipes" description="Stats à venir." />
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-[2fr_repeat(4,minmax(0,1fr))] gap-3 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.3em] text-slate-400">
            <span>Équipe</span>
            <span className="text-center">MJ</span>
            <span className="text-center">V</span>
            <span className="text-center">D</span>
            <span className="text-center">Pts</span>
          </div>
          <div className="divide-y divide-white/10">
            {standingsTeams.map((team) => (
              <div
                key={team}
                className="grid grid-cols-[2fr_repeat(4,minmax(0,1fr))] items-center gap-3 px-4 py-3 text-sm text-slate-200"
              >
                <span className="text-white">{team}</span>
                <span className="text-center">0</span>
                <span className="text-center">0</span>
                <span className="text-center">0</span>
                <span className="text-center">0</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">Les points seront mis à jour après les matchs officiels.</p>
      </section>

    </div>
  );
}
