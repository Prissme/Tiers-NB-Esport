'use client';

import { motion } from 'framer-motion';

export interface UnlockableTier {
  label: string;
  amount: number;
  icon: string;
  description: string;
}

interface UnlockableTiersProps {
  tiers: UnlockableTier[];
  currentAmount: number;
}

export default function UnlockableTiers({ tiers, currentAmount }: UnlockableTiersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tiers.map((tier, index) => {
        const unlocked = currentAmount >= tier.amount;
        return (
          <motion.div
            key={tier.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className={`rounded-2xl border px-5 py-4 transition ${
              unlocked
                ? 'border-fuchsia-400/60 bg-fuchsia-500/10 shadow-[0_0_24px_rgba(16,185,129,0.2)]'
                : 'border-slate-700/50 bg-slate-950/60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold text-fuchsia-100">
                  <span className="text-xl">{tier.icon}</span>
                  <span>{tier.label}</span>
                </div>
                <p className="mt-1 text-xs text-fuchsia-200/60">{tier.description}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  unlocked ? 'bg-fuchsia-400/20 text-fuchsia-200' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {tier.amount.toLocaleString('fr-FR')}€
              </span>
            </div>
            <div className="mt-4 text-xs text-fuchsia-200/70">
              {unlocked ? 'Débloqué ✅' : 'Verrouillé'}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
