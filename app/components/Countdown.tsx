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
  className?: string;
};

export default function Countdown({ targetDate, className }: CountdownProps) {
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
      <div
        className={`flex items-center gap-2 rounded-3xl border border-amber-400/40 bg-amber-400/10 px-5 py-3 text-sm font-semibold text-amber-200 shadow-[0_0_40px_rgba(234,179,8,0.35)] ${className ?? ""}`}
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />
        La LFN a commencé
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-3xl border border-white/15 bg-white/5 px-5 py-4 text-sm text-slate-200 shadow-[0_0_45px_rgba(234,179,8,0.25)] ${className ?? ""}`}
    >
      <span className="text-[11px] uppercase tracking-[0.45em] text-amber-300/80">
        Début LFN
      </span>
      <div className="flex items-center gap-2 text-base font-semibold text-white sm:text-lg text-glow">
        <span>{remaining.days}j</span>
        <span>{pad(remaining.hours)}h</span>
        <span>{pad(remaining.minutes)}m</span>
        <span>{pad(remaining.seconds)}s</span>
      </div>
    </div>
  );
}
