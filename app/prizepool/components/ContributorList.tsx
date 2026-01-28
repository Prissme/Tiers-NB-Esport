'use client';

import { motion } from 'framer-motion';

export interface ContributorItem {
  id: string;
  name: string;
  amount: number;
  anonymous: boolean;
}

interface ContributorListProps {
  items: ContributorItem[];
}

export default function ContributorList({ items }: ContributorListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-[10px] bg-slate-950/60 p-6 text-center text-sm text-muted">
        Soyez le premier à contribuer à la cagnotte.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
          className="flex items-center justify-between rounded-[10px] bg-slate-950/60 px-4 py-3"
        >
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-200">
              {item.anonymous ? 'Contributeur anonyme' : item.name}
            </span>
            <span className="text-xs text-utility">Contribution récente</span>
          </div>
          <span className="text-sm font-semibold text-white">+{item.amount.toLocaleString('fr-FR')}€</span>
        </motion.div>
      ))}
    </div>
  );
}
