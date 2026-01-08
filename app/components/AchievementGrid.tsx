'use client';

import { motion } from 'framer-motion';

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon_url?: string | null;
  category?: string | null;
  unlocked_at?: string | null;
};

type AchievementGridProps = {
  achievements: Achievement[];
};

const isRecentlyUnlocked = (unlockedAt?: string | null) => {
  if (!unlockedAt) {
    return false;
  }
  const date = new Date(unlockedAt);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const now = Date.now();
  const diff = now - date.getTime();
  return diff < 1000 * 60 * 60 * 24 * 7;
};

const ConfettiBurst = () => {
  const pieces = Array.from({ length: 10 });

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {pieces.map((_, index) => (
        <span
          key={index}
          className="confetti-piece"
          style={{
            animationDelay: `${index * 60}ms`,
            left: `${10 + index * 8}%`,
            top: `${20 + (index % 3) * 10}%`
          }}
        />
      ))}
    </div>
  );
};

export default function AchievementGrid({ achievements }: AchievementGridProps) {
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked_at).length;
  const progress = achievements.length ? Math.round((unlockedCount / achievements.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>{unlockedCount} / {achievements.length} achievements débloqués</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-violet-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {achievements.map((achievement) => {
          const unlocked = Boolean(achievement.unlocked_at);
          const recent = isRecentlyUnlocked(achievement.unlocked_at);

          return (
            <motion.div
              key={achievement.id}
              whileHover={{ y: -4 }}
              className={`relative overflow-hidden rounded-2xl border p-4 text-sm transition-colors ${
                unlocked
                  ? 'border-amber-400/40 bg-amber-400/10'
                  : 'border-white/5 bg-slate-900/70 text-slate-400'
              }`}
            >
              {unlocked && recent ? <ConfettiBurst /> : null}
              <div className="relative z-10 flex items-start gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
                    unlocked ? 'border-amber-400/60 bg-amber-400/20' : 'border-slate-700 bg-slate-800'
                  }`}
                >
                  {achievement.icon_url ? (
                    <img src={achievement.icon_url} alt="" className="h-8 w-8" />
                  ) : (
                    <span className="text-xl">🏆</span>
                  )}
                </div>
                <div>
                  <p className={`font-semibold ${unlocked ? 'text-amber-100' : 'text-slate-300'}`}>
                    {achievement.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{achievement.description}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    {achievement.category || 'general'}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
