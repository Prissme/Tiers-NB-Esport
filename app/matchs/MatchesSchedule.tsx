"use client";

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "../components/SectionHeader";

type ScheduledMatch = {
  id: string;
  teams: string;
  timeLabel: string;
  dateTime: string;
};

type MatchDay = {
  label: string;
  matches: ScheduledMatch[];
};

const matchSchedule: MatchDay[] = [
  {
    label: "12/01/26 Lundi",
    matches: [
      {
        id: "2026-01-12-18",
        teams: "B&D vs LTG",
        timeLabel: "18H",
        dateTime: "2026-01-12T18:00:00",
      },
      {
        id: "2026-01-12-19",
        teams: "BT vs JL",
        timeLabel: "19H",
        dateTime: "2026-01-12T19:00:00",
      },
      {
        id: "2026-01-12-20",
        teams: "LZ vs VLH",
        timeLabel: "20H",
        dateTime: "2026-01-12T20:00:00",
      },
      {
        id: "2026-01-12-21",
        teams: "NR vs T2",
        timeLabel: "21H",
        dateTime: "2026-01-12T21:00:00",
      },
    ],
  },
  {
    label: "14/01/26 Mercredi",
    matches: [
      {
        id: "2026-01-14-18",
        teams: "JL vs LTG",
        timeLabel: "18H",
        dateTime: "2026-01-14T18:00:00",
      },
      {
        id: "2026-01-14-19",
        teams: "B&D vs BT",
        timeLabel: "19H",
        dateTime: "2026-01-14T19:00:00",
      },
      {
        id: "2026-01-14-20",
        teams: "NR vs VLH",
        timeLabel: "20H",
        dateTime: "2026-01-14T20:00:00",
      },
      {
        id: "2026-01-14-21",
        teams: "T2 vs LZ",
        timeLabel: "21H",
        dateTime: "2026-01-14T21:00:00",
      },
    ],
  },
  {
    label: "16/01/26 Vendredi",
    matches: [
      {
        id: "2026-01-16-18",
        teams: "BT vs LTG",
        timeLabel: "18H",
        dateTime: "2026-01-16T18:00:00",
      },
      {
        id: "2026-01-16-19",
        teams: "B&D vs JL",
        timeLabel: "19H",
        dateTime: "2026-01-16T19:00:00",
      },
      {
        id: "2026-01-16-20",
        teams: "NR vs LZ",
        timeLabel: "20H",
        dateTime: "2026-01-16T20:00:00",
      },
      {
        id: "2026-01-16-21",
        teams: "T2 vs VLH",
        timeLabel: "21H",
        dateTime: "2026-01-16T21:00:00",
      },
    ],
  },
];

const formatCountdown = (now: Date, dateTime: string) => {
  const target = new Date(dateTime);
  if (Number.isNaN(target.getTime())) {
    return "Date invalide";
  }
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) {
    return "Démarré";
  }
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return `${days}j ${hours}h`;
};

export default function MatchesSchedule() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const schedule = useMemo(() => matchSchedule, []);

  return (
    <section className="section-card space-y-6">
      <SectionHeader
        kicker="Planning"
        title="Matchs programmés"
        description="Compte à rebours en jours et heures."
      />
      <div className="space-y-6">
        {schedule.map((day) => (
          <div key={day.label} className="overflow-hidden rounded-2xl border border-white/10">
            <div className="bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.35em] text-slate-400">
              {day.label}
            </div>
            <div className="divide-y divide-white/10">
              {day.matches.map((match) => (
                <div
                  key={match.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm text-white">{match.teams}</p>
                    <p className="text-xs text-slate-400">Début {match.timeLabel}</p>
                  </div>
                  <span className="rounded-full bg-sky-400/20 px-3 py-1 text-xs font-medium text-sky-200">
                    {formatCountdown(now, match.dateTime)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
