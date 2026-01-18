import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PreSeasonBanner from "../../components/PreSeasonBanner";
import SectionHeader from "../../components/SectionHeader";
import { getBaseUrl } from "../../lib/get-base-url";
import type { SiteTeam } from "../../lib/site-types";
import { teams as fallbackTeams } from "../../../src/data";

const fetchTeams = async (): Promise<SiteTeam[]> => {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/site/teams`, { next: { revalidate: 30 } });
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as { teams?: SiteTeam[] };
    return payload.teams ?? [];
  } catch (error) {
    console.error("fetch team detail error", error);
    return [];
  }
};

const mapFallbackTeams = (): SiteTeam[] =>
  fallbackTeams.map((team) => ({
    id: team.id,
    name: team.name,
    tag: null,
    division: team.division,
    logoUrl: team.logoUrl,
    roster: team.roster.map((member) => ({
      role: member.role,
      slot: member.slot ?? null,
      name: member.name,
      mains: member.mains ?? null,
      description: member.role ?? null,
    })),
  }));

const getTeamFromList = (teams: SiteTeam[], id: string) =>
  teams.find((entry) => entry.id === id);

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const teams = await fetchTeams();
  const team = getTeamFromList(teams, params.id) ?? getTeamFromList(mapFallbackTeams(), params.id);
  return {
    title: team ? team.name : "Équipe",
    description: "Détails d'équipe et roster de la LFN.",
  };
}

export default async function TeamDetailPage({ params }: { params: { id: string } }) {
  const teams = await fetchTeams();
  const team = getTeamFromList(teams, params.id) ?? getTeamFromList(mapFallbackTeams(), params.id);

  if (!team) {
    notFound();
  }

  return (
    <div className="space-y-10">
      <section className="motion-field p-8">
        <div className="motion-orb -left-16 top-10 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-0 top-6 h-44 w-44 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Équipe"
            title={team.name}
            description={`Division ${team.division ?? "—"}`}
          />
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader kicker="Roster" title="Effectif" description="Liste officielle." />
        {team.roster && team.roster.length > 0 ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {team.roster.map((player, index) => (
              <li
                key={`${player.name}-${index}`}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-amber-300/30 hover:bg-white/10"
              >
                <p className="text-sm font-semibold text-white">{player.name}</p>
                {player.role ? <p className="text-xs text-slate-400">{player.role}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <PreSeasonBanner message="Roster à confirmer avant le début de la saison." />
        )}
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Programme"
          title="Calendrier fixe"
          description="Les résultats ne sont pas affichés publiquement."
        />
        <p className="text-sm text-slate-400">
          Consultez le programme officiel pour les horaires fixes des matchs.
        </p>
        <Link
          href="/matchs"
          className="inline-flex items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/10 px-5 py-3 text-xs uppercase tracking-[0.3em] text-amber-200"
        >
          Voir le programme
        </Link>
      </section>
    </div>
  );
}
