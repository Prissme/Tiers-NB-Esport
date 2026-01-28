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

export default function PlayerCard({ player, children }: PlayerCardProps) {
  const avatar = player.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${player.id}`;

  return (
    <section
      className="surface-dominant dominant-section relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-black/80 px-6 py-6 shadow-[0_25px_60px_-30px_rgba(15,23,42,0.6)] backdrop-blur"
    >
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
        <div className="relative">
          <img
            src={avatar}
            alt={`Avatar de ${player.name}`}
            className="relative h-28 w-28 rounded-full object-cover shadow-lg"
          />
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-white">{player.name}</h1>
            <span
              className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-utility"
            >
              Niveau {player.tier}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted">
            ELO actuel · <span className="text-2xl font-bold text-cyan-200">{player.mmr}</span>
          </p>
          {children ? <div className="mt-4 text-sm text-muted">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
