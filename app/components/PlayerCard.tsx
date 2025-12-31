import type { ReactNode } from 'react';

export type PlayerCardPlayer = {
  id: string;
  name: string;
  mmr: number;
  tier: string;
  avatarUrl?: string | null;
  discordId?: string | null;
};

type PlayerCardProps = {
  player: PlayerCardPlayer;
  children?: ReactNode;
};

const tierStyles: Record<string, string> = {
  S: 'from-amber-300/40 via-pink-400/40 to-violet-500/40 text-amber-200',
  A: 'from-violet-400/40 via-fuchsia-400/40 to-indigo-400/40 text-violet-200',
  B: 'from-cyan-400/30 via-sky-400/30 to-blue-400/30 text-cyan-100',
  C: 'from-emerald-400/30 via-teal-400/30 to-green-400/30 text-emerald-100',
  D: 'from-slate-500/30 via-slate-600/30 to-slate-700/30 text-slate-200',
  E: 'from-slate-700/40 via-slate-800/40 to-slate-900/40 text-slate-300'
};

const holographicSheen =
  'before:absolute before:inset-0 before:rounded-3xl before:bg-[conic-gradient(from_120deg_at_50%_50%,rgba(255,255,255,0.14),rgba(255,255,255,0),rgba(255,255,255,0.24),rgba(255,255,255,0))] before:opacity-70 before:blur-2xl before:transition before:duration-500 before:content-[""] hover:before:opacity-90';

export default function PlayerCard({ player, children }: PlayerCardProps) {
  const tierClass = tierStyles[player.tier] ?? tierStyles.E;
  const avatar = player.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${player.id}`;

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-black/80 px-6 py-6 shadow-[0_25px_60px_-30px_rgba(125,211,252,0.5)] backdrop-blur ${holographicSheen}`}
    >
      <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-fuchsia-400/20 blur-3xl" />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
        <div className="relative">
          <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-cyan-400/40 to-fuchsia-400/40 blur" />
          <img
            src={avatar}
            alt={`Avatar de ${player.name}`}
            className="relative h-28 w-28 rounded-full border border-white/20 object-cover shadow-lg"
          />
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-white">{player.name}</h1>
            <span
              className={`rounded-full bg-gradient-to-r ${tierClass} px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]`}
            >
              Tier {player.tier}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            ELO actuel · <span className="text-2xl font-bold text-cyan-200">{player.mmr}</span>
          </p>
          {children ? <div className="mt-4 text-sm text-slate-300">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
