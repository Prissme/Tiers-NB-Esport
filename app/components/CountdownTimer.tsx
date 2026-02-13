"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "../lib/i18n";

const TARGETS = [
  {
    label: {
      fr: "LFN SAISON 5",
      en: "LFN SEASON 5",
    },
    timestamp: new Date("2026-02-14T20:00:00+01:00").getTime(),
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
  locale,
}: {
  title: string;
  dateLabel?: string;
  target: number;
  locale: Locale;
}) => {
  const remaining = useCountdown(target);
  const labels =
    locale === "en"
      ? ["Days", "Hours", "Minutes", "Seconds"]
      : ["Jours", "Heures", "Minutes", "Secondes"];
  const items = useMemo(
    () => [
      { label: labels[0], value: remaining.days },
      { label: labels[1], value: remaining.hours },
      { label: labels[2], value: remaining.minutes },
      { label: labels[3], value: remaining.seconds },
    ],
    [labels, remaining]
  );

  return (
    <div className="space-y-2">
      <p className="countdown-event-title text-xs uppercase text-utility">{title}</p>
      {dateLabel ? (
        <p className="text-[11px] uppercase tracking-[0.35em] text-slate-300">{dateLabel}</p>
      ) : null}
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

export default function CountdownTimer({ locale }: { locale: Locale }) {
  return (
    <div className="mt-6 space-y-6">
      {TARGETS.map((target) => (
        <CountdownBlock
          key={target.label[locale]}
          title={target.label[locale]}
          dateLabel={locale === "fr" ? "14 février • 20h" : "February 14 • 8:00 PM"}
          target={target.timestamp}
          locale={locale}
        />
      ))}
    </div>
  );
}
