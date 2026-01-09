import type { MatchStatus } from "../../src/data";

const statusStyles: Record<MatchStatus, string> = {
  scheduled: "bg-sky-400/15 text-sky-200 border-sky-400/30",
  live: "bg-rose-500/20 text-rose-100 border-rose-400/40 animate-pulse",
  finished: "bg-slate-500/20 text-slate-200 border-white/10",
};

const statusLabels: Record<MatchStatus, string> = {
  scheduled: "À venir",
  live: "LIVE",
  finished: "Terminé",
};

export default function StatusBadge({ status }: { status: MatchStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ${
        statusStyles[status]
      }`}
    >
      {statusLabels[status]}
    </span>
  );
}
