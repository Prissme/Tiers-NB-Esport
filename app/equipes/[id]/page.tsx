import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PreSeasonBanner from "../../components/PreSeasonBanner";
import SectionHeader from "../../components/SectionHeader";
import { getBaseUrl } from "../../lib/get-base-url";
import type { SiteTeam } from "../../lib/site-types";
import { teams as fallbackTeams } from "../../../src/data";
import { getLocale } from "../../lib/i18n";

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
  const locale = getLocale();
  const copy = {
    fr: {
      kicker: "Équipe",
      divisionLabel: "Division",
      rosterKicker: "Roster",
      rosterTitle: "Effectif",
      rosterDescription: "Liste officielle.",
      rosterFallback: "Roster en attente de confirmation.",
      scheduleKicker: "Programme",
      scheduleTitle: "Calendrier fixe",
      scheduleDescription: "Résultats non publics.",
      scheduleNote: "Consultez le programme officiel pour les horaires.",
      scheduleCta: "Voir le calendrier",
    },
    en: {
      kicker: "Team",
      divisionLabel: "Division",
      rosterKicker: "Roster",
      rosterTitle: "Lineup",
      rosterDescription: "Official list.",
      rosterFallback: "Roster awaiting confirmation.",
      scheduleKicker: "Schedule",
      scheduleTitle: "Fixed calendar",
      scheduleDescription: "Results are private.",
      scheduleNote: "Check the official schedule for times.",
      scheduleCta: "See the calendar",
    },
  };
  const content = copy[locale];
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
            kicker={content.kicker}
            title={team.name}
            description={`${content.divisionLabel} ${team.division ?? "—"}`}
            tone="dominant"
          />
        </div>
      </section>

      <div className="silent-gap" aria-hidden="true" />
      <section className="section-card secondary-section space-y-6">
        <SectionHeader
          kicker={content.rosterKicker}
          title={content.rosterTitle}
          description={content.rosterDescription}
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
          <PreSeasonBanner message={content.rosterFallback} locale={locale} />
        )}
      </section>

      <div className="silent-gap" aria-hidden="true" />
      <section className="section-card secondary-section space-y-6">
        <SectionHeader
          kicker={content.scheduleKicker}
          title={content.scheduleTitle}
          description={content.scheduleDescription}
          tone="support"
        />
        <p className="text-sm text-muted">
          {content.scheduleNote}
        </p>
        <Link
          href="/matchs"
          className="inline-flex items-center justify-center rounded-full bg-white/10 px-5 py-3 text-xs uppercase tracking-[0.3em] signal-accent"
        >
          {content.scheduleCta}
        </Link>
      </section>
    </div>
  );
}
