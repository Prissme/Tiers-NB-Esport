"use client";

import { useEffect, useMemo, useState } from "react";

const pad = (value: number) => value.toString().padStart(2, "0");

const getRemaining = (target: Date) => {
  const now = new Date();
  const diff = Math.max(target.getTime() - now.getTime(), 0);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, isLive: diff <= 0 };
};

type CountdownProps = {
  targetDate: string;
};

export default function Countdown({ targetDate }: CountdownProps) {
  const target = useMemo(() => new Date(targetDate), [targetDate]);
  const [remaining, setRemaining] = useState(() => getRemaining(target));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining(getRemaining(target));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [target]);

  if (remaining.isLive) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
        La LFN a commencé
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
      <span className="text-[10px] uppercase tracking-[0.35em] text-emerald-300/80">
        Début LFN
      </span>
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <span>{remaining.days}j</span>
        <span>{pad(remaining.hours)}h</span>
        <span>{pad(remaining.minutes)}m</span>
        <span>{pad(remaining.seconds)}s</span>
      </div>
    </div>
  );
}
