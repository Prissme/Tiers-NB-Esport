import AchievementGrid, { type Achievement } from '../../components/AchievementGrid';
import PlayerCard, { type PlayerCardPlayer } from '../../components/PlayerCard';
import type { EloDataPoint } from '../../components/StatsGraph';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getLocale } from '../../lib/i18n';

const resolveBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  const host = headers().get('host');
  if (!host) {
    return '';
  }
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
};

type PlayerProfileResponse = {
  player: PlayerCardPlayer & {
    wins: number;
    losses: number;
    gamesPlayed: number | null;
    winStreak: number | null;
    loseStreak: number | null;
    discordId: string | null;
    soloElo: number | null;
    bio: string | null;
  };
  stats: {
    winRateByMode: Array<{ mode: string; winRate: number; wins: number; total: number }>;
    eloHistory: EloDataPoint[];
  };
  achievements: Achievement[];
  recentMatches: Array<{
    id: string | number;
    date: string;
    mode: string;
    map: string;
    result: 'win' | 'loss' | null;
    score: string | null;
  }>;
};

async function fetchPlayerProfile(slug: string): Promise<PlayerProfileResponse> {
  const baseUrl = resolveBaseUrl();
  const response = await fetch(`${baseUrl}/api/player/${slug}`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error('Failed to fetch player profile');
  }

  return response.json();
}

export default async function PlayerProfilePage({ params }: { params: { slug: string } }) {
  const locale = getLocale();
  let profile: PlayerProfileResponse;

  try {
    profile = await fetchPlayerProfile(params.slug);
  } catch (error) {
    console.error(error);
    notFound();
  }

  const { player, achievements } = profile;
  const copy = {
    fr: {
      statsClosed: "Stats publiques fermées",
      statsTitle: "Statistiques",
      statsDescription: "Statistiques publiques après validation.",
      achievementsTitle: "Succès",
      achievementsDescription: "Débloqués en match.",
      historyTitle: "Historique récent",
      historyDescription: "Historique des matchs non public.",
    },
    en: {
      statsClosed: "Public stats closed",
      statsTitle: "Statistics",
      statsDescription: "Public stats after validation.",
      achievementsTitle: "Achievements",
      achievementsDescription: "Unlocked in matches.",
      historyTitle: "Recent history",
      historyDescription: "Match history is private.",
    },
  };
  const content = copy[locale];

  return (
    <main className="min-h-screen bg-slate-950 px-4 pb-20 pt-10 text-slate-100">
      <div className="page-stack page-stack--tight">
        <PlayerCard player={player} locale={locale}>
          <div className="flex flex-wrap gap-4 text-xs text-utility">
            <span className="badge">{content.statsClosed}</span>
          </div>
          {player.bio ? <p className="mt-3 text-sm text-muted">{player.bio}</p> : null}
        </PlayerCard>

        <section className="section-card secondary-section space-y-4">
          <h2 className="text-lg font-semibold text-white">{content.statsTitle}</h2>
          <p className="text-sm text-muted">{content.statsDescription}</p>
        </section>

        <section className="section-card secondary-section space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white">{content.achievementsTitle}</h2>
            <p className="text-sm text-muted">{content.achievementsDescription}</p>
          </div>
          <AchievementGrid achievements={achievements} locale={locale} />
        </section>

        <section className="section-card secondary-section space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{content.historyTitle}</h2>
            <p className="text-sm text-muted">{content.historyDescription}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
