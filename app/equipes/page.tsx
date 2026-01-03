import Button from "../components/Button";
import SectionHeader from "../components/SectionHeader";
import { createAdminClient } from "../../src/lib/supabase/admin";
import { withSchema } from "../../src/lib/supabase/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const teamTiles = [
  { label: "D1", detail: "Élite" },
  { label: "D2", detail: "Challengers" },
  { label: "Rosters", detail: "Visibles" },
];

const teamTags = ["Roster", "Logo", "Stats", "Clip"];

type ActiveRosterRow = {
  tag: string | null;
  division: string | null;
  members_count: number | null;
  members: unknown;
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
            <Button href="/classement" variant="secondary">
              Classement
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
          <div className="grid gap-6 lg:grid-cols-2">
            {rosters.map((team, index) => {
              const members = Array.isArray(team.members) ? team.members : [];
              const memberLabels = members.map((member, memberIndex) => {
                if (typeof member === "string") {
                  return member;
                }
                if (member && typeof member === "object") {
                  const name =
                    "name" in member
                      ? String((member as { name?: unknown }).name ?? "")
                      : "";
                  return name || JSON.stringify(member);
                }
                return String(member);
              });

              return (
                <article
                  key={`${team.tag ?? "team"}-${index}`}
                  className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_25px_80px_-60px_rgba(15,23,42,0.8)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                        {team.division ?? "Division"}
                      </p>
                      <h3 className="text-lg font-semibold text-white">
                        {team.tag ?? "Tag"}
                      </h3>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-200">
                      {team.members_count ?? members.length} membres
                    </div>
                  </div>

                  {memberLabels.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {memberLabels.map((memberLabel, memberIndex) => (
                        <span
                          key={`${memberLabel}-${memberIndex}`}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                        >
                          {memberLabel}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-slate-400">
                      Aucun membre listé pour ce roster.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="section-card space-y-6">
        <SectionHeader kicker="Repères" title="Tags essentiels" description="Rien de lourd." />
        <div className="flex flex-wrap gap-3">
          {teamTags.map((tag) => (
            <span key={tag} className="motion-pill">
              {tag}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Identité</p>
            <p className="mt-3 text-sm text-white">Visuel clair.</p>
          </div>
          <div className="motion-card">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Rôle</p>
            <p className="mt-3 text-sm text-white">Place rapide.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
