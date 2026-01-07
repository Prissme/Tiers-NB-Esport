import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
};

export default function MetricCard({ label, value, detail, icon }: MetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="absolute -right-6 -top-8 h-20 w-20 rounded-full bg-fuchsia-400/10 blur-2xl" />
      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-2xl font-semibold text-white">{value}</p>
        {icon ? <span className="text-fuchsia-300">{icon}</span> : null}
      </div>
      {detail ? <p className="mt-2 text-sm text-slate-300">{detail}</p> : null}
    </div>
  );
}
