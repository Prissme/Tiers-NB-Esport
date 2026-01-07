import AchievementGrid, { type Achievement } from '../../components/AchievementGrid';
import PlayerCard, { type PlayerCardPlayer } from '../../components/PlayerCard';
import StatsGraph, { type EloDataPoint } from '../../components/StatsGraph';
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

  const { player, stats, achievements, recentMatches } = profile;
  const totalGames = player.gamesPlayed ?? player.wins + player.losses;
  const overallWinRate = totalGames ? Math.round((player.wins / totalGames) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-950 px-4 pb-20 pt-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <PlayerCard player={player}>
          <div className="flex flex-wrap gap-4 text-xs text-slate-300">
            <span className="badge">{totalGames} matchs</span>
            <span className="badge">{overallWinRate}% winrate</span>
            {player.winStreak ? <span className="badge">Streak +{player.winStreak}</span> : null}
            {player.soloElo ? <span className="badge">Solo ELO {player.soloElo}</span> : null}
          </div>
          {player.bio ? <p className="mt-3 text-sm text-slate-400">{player.bio}</p> : null}
        </PlayerCard>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="section-card space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Évolution ELO (30 derniers jours)</h2>
              <p className="text-sm text-slate-400">Suivi quotidien des performances.</p>
            </div>
            <StatsGraph data={stats.eloHistory} />
          </div>

          <div className="section-card space-y-4">
            <h2 className="text-lg font-semibold text-white">Winrate par mode</h2>
            {stats.winRateByMode.length ? (
              <ul className="space-y-3 text-sm text-slate-300">
                {stats.winRateByMode.map((entry) => (
                  <li key={entry.mode} className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100">{entry.mode}</span>
                      <span className="text-cyan-300">{entry.winRate}%</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {entry.wins} victoires / {entry.total} matchs
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">Pas encore de statistiques par mode.</p>
            )}
          </div>
        </section>

        <section className="section-card space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Achievements</h2>
            <p className="text-sm text-slate-400">Débloquez-les en continuant à jouer.</p>
          </div>
          <AchievementGrid achievements={achievements} />
        </section>

        <section className="section-card space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Historique récent</h2>
            <p className="text-sm text-slate-400">Les 10 derniers matchs enregistrés.</p>
          </div>
          {recentMatches.length ? (
            <ul className="divide-y divide-white/5">
              {recentMatches.map((match) => (
                <li key={match.id} className="flex flex-wrap items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="text-slate-100">{match.mode}</p>
                    <p className="text-xs text-slate-400">{match.map}</p>
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(match.date).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="flex items-center gap-3">
                    {match.score ? <span className="text-xs text-slate-500">{match.score}</span> : null}
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                        match.result === 'win'
                          ? 'bg-fuchsia-400/20 text-fuchsia-200'
                          : match.result === 'loss'
                            ? 'bg-rose-400/20 text-rose-200'
                            : 'bg-slate-700/50 text-slate-300'
                      }`}
                    >
                      {match.result ?? 'indisponible'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Aucun match récent trouvé.</p>
          )}
        </section>
      </div>
    </main>
  );
}
