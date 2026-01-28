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
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Équipe"
            title={team.name}
            description={`Division ${team.division ?? "—"}`}
            tone="dominant"
          />
        </div>
      </section>

      <div className="silent-gap" aria-hidden="true" />
      <section className="section-card secondary-section space-y-6">
        <SectionHeader
          kicker="Roster"
          title="Effectif"
          description="Liste officielle."
          tone="support"
        />
        {team.roster && team.roster.length > 0 ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {team.roster.map((player, index) => (
              <li
                key={`${player.name}-${index}`}
                className="rounded-[10px] bg-white/5 px-4 py-3 transition hover:bg-white/10"
              >
                <p className="text-sm font-semibold text-white">{player.name}</p>
                {player.role ? <p className="text-xs text-utility">{player.role}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <PreSeasonBanner message="Roster en attente de confirmation." />
        )}
      </section>

      <div className="silent-gap" aria-hidden="true" />
      <section className="section-card secondary-section space-y-6">
        <SectionHeader
          kicker="Programme"
          title="Calendrier fixe"
          description="Résultats non publics."
          tone="support"
        />
        <p className="text-sm text-muted">
          Consultez le programme officiel pour les horaires.
        </p>
        <Link
          href="/matchs"
          className="inline-flex items-center justify-center rounded-full bg-white/10 px-5 py-3 text-xs uppercase tracking-[0.3em] signal-accent"
        >
          Voir le calendrier
        </Link>
      </section>
    </div>
  );
}
