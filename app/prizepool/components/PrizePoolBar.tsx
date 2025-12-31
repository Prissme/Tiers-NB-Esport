'use client';

import { motion } from 'framer-motion';

interface PrizePoolBarProps {
  current: number;
  goal: number;
}

export default function PrizePoolBar({ current, goal }: PrizePoolBarProps) {
  const safeGoal = goal > 0 ? goal : 1;
  const percentage = Math.min((current / safeGoal) * 100, 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-emerald-200/80">
        <span>Progression du prizepool</span>
        <span className="font-semibold text-emerald-200">
          {current.toLocaleString('fr-FR')}€ / {goal.toLocaleString('fr-FR')}€
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full border border-emerald-500/30 bg-slate-900/80">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.6)]"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <div className="text-xs text-emerald-200/60">
        {percentage.toFixed(1)}% de l'objectif atteint
      </div>
    </div>
  );
}
