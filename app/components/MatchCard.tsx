import Link from "next/link";
import type { SiteMatch } from "../lib/site-types";
import StatusBadge from "./StatusBadge";
import type { Locale } from "../lib/i18n";

const formatMatchDate = (dateISO: string | null, locale: Locale) => {
  if (!dateISO) return "—";
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) return dateISO;
  const dateLocale = locale === "en" ? "en-US" : "fr-FR";
  return date.toLocaleDateString(dateLocale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
};

const formatMatchTime = (dateISO: string | null, startTime?: string | null) => {
  const rawTime = startTime ?? dateISO;
  if (!rawTime) return "";
  const timePart = rawTime.includes("T") ? rawTime.split("T")[1] : rawTime;
  return timePart?.slice(0, 5) ?? "";
};

type MatchCardProps = {
  match: SiteMatch;
  locale: Locale;
};

const copy = {
  fr: {
    season: "Saison",
    playoffs: "Playoffs",
    score: "Score",
  },
  en: {
    season: "Season",
    playoffs: "Playoffs",
    score: "Score",
  },
};

export default function MatchCard({ match, locale }: MatchCardProps) {
  const content = copy[locale];
  return (
    <Link
      href={`/matchs/${match.id}`}
      className="group flex flex-col gap-4 rounded-[12px] bg-white/[0.04] px-5 py-4 transition hover:bg-white/[0.08] animate-in"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-utility">{match.division ?? "—"}</p>
          <p className="text-lg font-semibold text-white">
            {match.teamA.name} <span className="text-utility">vs</span> {match.teamB.name}
          </p>
        </div>
        <StatusBadge status={match.status} locale={locale} />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <span className="rounded-full bg-white/10 px-3 py-1">
          {formatMatchDate(match.scheduledAt, locale)} ·{" "}
          {formatMatchTime(match.scheduledAt, match.startTime)}
        </span>
        {match.phase ? (
          <span className="rounded-full bg-white/10 px-3 py-1 uppercase tracking-[0.3em]">
            {match.phase === "playoffs" ? content.playoffs : content.season}
          </span>
        ) : null}
        {match.scoreA !== null && match.scoreB !== null ? (
          <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">
            {content.score} {match.scoreA ?? "-"} - {match.scoreB ?? "-"}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
