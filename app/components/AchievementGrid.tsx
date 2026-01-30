"use client";

import { motion } from 'framer-motion';
import type { Locale } from "../lib/i18n";
import ReloadingImage from "./ReloadingImage";

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
  locale: Locale;
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

const copy = {
  fr: {
    unlocked: "achievements débloqués",
    categoryFallback: "general",
  },
  en: {
    unlocked: "achievements unlocked",
    categoryFallback: "general",
  },
};

export default function AchievementGrid({ achievements, locale }: AchievementGridProps) {
  const content = copy[locale];
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked_at).length;
  const progress = achievements.length ? Math.round((unlockedCount / achievements.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          {unlockedCount} / {achievements.length} {content.unlocked}
        </span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-slate-300 to-violet-500 transition-all"
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
              className={`relative overflow-hidden rounded-[12px] p-4 text-sm transition-colors ${
                unlocked
                  ? 'bg-white/10 text-slate-200'
                  : 'bg-slate-900/70 text-utility'
              }`}
            >
              {unlocked && recent ? <ConfettiBurst /> : null}
              <div className="relative z-10 flex items-start gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-[10px] ${
                    unlocked ? 'bg-white/10 text-white' : 'bg-slate-800 text-muted'
                  }`}
                >
                  {achievement.icon_url ? (
                    <ReloadingImage src={achievement.icon_url} alt="" className="h-8 w-8" />
                  ) : (
                    <span className="text-xl">🏆</span>
                  )}
                </div>
                <div>
                  <p className={`font-semibold ${unlocked ? 'text-white' : 'text-muted'}`}>
                    {achievement.name}
                  </p>
                  <p className="mt-1 text-xs text-muted">{achievement.description}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-utility">
                    {achievement.category || content.categoryFallback}
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
