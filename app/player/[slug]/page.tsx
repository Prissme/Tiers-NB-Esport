import AchievementGrid, { type Achievement } from '../../components/AchievementGrid';
import PlayerCard, { type PlayerCardPlayer } from '../../components/PlayerCard';
import type { EloDataPoint } from '../../components/StatsGraph';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

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
  let profile: PlayerProfileResponse;

  try {
    profile = await fetchPlayerProfile(params.slug);
  } catch (error) {
    console.error(error);
    notFound();
  }

  const { player, achievements } = profile;

  return (
    <main className="min-h-screen bg-slate-950 px-4 pb-20 pt-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <PlayerCard player={player}>
          <div className="flex flex-wrap gap-4 text-xs text-slate-300">
            <span className="badge">Stats publiques fermées</span>
          </div>
          {player.bio ? <p className="mt-3 text-sm text-slate-400">{player.bio}</p> : null}
        </PlayerCard>

        <section className="section-card space-y-4">
          <h2 className="text-lg font-semibold text-white">Statistiques</h2>
          <p className="text-sm text-slate-400">
            Statistiques publiques après validation.
          </p>
        </section>

        <section className="section-card space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Succès</h2>
            <p className="text-sm text-slate-400">Débloqués en match.</p>
          </div>
          <AchievementGrid achievements={achievements} />
        </section>

        <section className="section-card space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Historique récent</h2>
            <p className="text-sm text-slate-400">
              Historique des matchs non public.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
