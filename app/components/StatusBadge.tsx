import type { MatchStatus } from "../lib/site-types";

const statusStyles: Record<MatchStatus, string> = {
  scheduled: "bg-sky-400/15 text-sky-200",
  live: "bg-rose-500/20 text-rose-100 animate-pulse",
  finished: "bg-slate-500/20 text-slate-200",
};

const statusLabels: Record<MatchStatus, string> = {
  scheduled: "À venir",
  live: "EN DIRECT",
  finished: "Terminé",
};

export default function StatusBadge({ status }: { status: MatchStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ${
        statusStyles[status]
      }`}
    >
      {statusLabels[status]}
    </span>
  );
}
