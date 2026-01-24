"use client";

import { useEffect, useMemo, useState } from "react";

const TARGET_TIMESTAMP = new Date("2026-01-28T19:00:00+01:00").getTime();

type CountdownState = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const getRemaining = (): CountdownState => {
  const now = Date.now();
  const diff = Math.max(TARGET_TIMESTAMP - now, 0);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
};

const formatValue = (value: number) => String(value).padStart(2, "0");

export default function CountdownTimer() {
  const [remaining, setRemaining] = useState<CountdownState>(() => getRemaining());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining(getRemaining());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

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
    <div className="mt-6 space-y-3">
      <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
        Compte à rebours — 28/01/2026 · 19:00 (Belgique)
      </p>
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-[10px] border border-[color:var(--color-border)] bg-[rgba(0,0,0,0.4)] px-4 py-2 text-center"
          >
            <p className="text-sm font-semibold text-[color:var(--color-text)]">
              {formatValue(item.value)}
            </p>
            <p className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-text-muted)]">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
