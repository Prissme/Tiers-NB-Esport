"use client";

import { useEffect, useMemo, useState } from "react";

const TARGETS = [
  {
    label: "SAISON 4 BIENTÔT",
    dateLabel: "Mercredi 28 janvier · 19H",
    timestamp: new Date("2026-01-28T19:00:00+01:00").getTime(),
  },
  {
    label: "ÉVÉNEMENT À VENIR",
    dateLabel: "Samedi 31 janvier · 19H",
    timestamp: new Date("2026-01-31T19:00:00+01:00").getTime(),
  },
] as const;

type CountdownState = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const getRemaining = (target: number): CountdownState => {
  const now = Date.now();
  const diff = Math.max(target - now, 0);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
};

const formatValue = (value: number) => String(value).padStart(2, "0");

const useCountdown = (target: number) => {
  const [remaining, setRemaining] = useState<CountdownState>(() => getRemaining(target));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining(getRemaining(target));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [target]);

  return remaining;
};

const CountdownBlock = ({
  title,
  dateLabel,
  target,
}: {
  title: string;
  dateLabel: string;
  target: number;
}) => {
  const remaining = useCountdown(target);
  const items = useMemo(
    () => [
      { label: "Jours", value: remaining.days },
      { label: "Heures", value: remaining.hours },
      { label: "Minutes", value: remaining.minutes },
      { label: "Secondes", value: remaining.seconds },
    ],
    [remaining]
  );

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.4em] text-utility">{title}</p>
      <p className="text-[11px] uppercase tracking-[0.35em] text-slate-300">{dateLabel}</p>
      <div className="flex flex-wrap justify-center gap-6">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <p className="countdown-value font-sekuya text-3xl text-[color:var(--color-text)] sm:text-4xl">
              <span key={`${item.label}-${item.value}`} className="countdown-value__tick">
                {formatValue(item.value)}
              </span>
            </p>
            <p className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-text-faint)]">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function CountdownTimer() {
  return (
    <div className="mt-6 space-y-6">
      {TARGETS.map((target) => (
        <CountdownBlock
          key={target.label}
          title={target.label}
          dateLabel={target.dateLabel}
          target={target.timestamp}
        />
      ))}
    </div>
  );
}
