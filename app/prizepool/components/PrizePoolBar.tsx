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
      <div className="flex items-center justify-between text-sm text-muted">
        <span>Progression du prizepool</span>
        <span className="font-semibold text-white">
          {current.toLocaleString('fr-FR')}€ / {goal.toLocaleString('fr-FR')}€
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-900/80">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-slate-200 via-slate-100 to-white shadow-[0_0_18px_rgba(148,163,184,0.35)]"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <div className="text-xs text-utility">
        {percentage.toFixed(1)}% de l'objectif atteint
      </div>
    </div>
  );
}
