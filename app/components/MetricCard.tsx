import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
};

export default function MetricCard({ label, value, detail, icon }: MetricCardProps) {
  return (
    <div className="surface-panel relative overflow-hidden">
      <p className="text-xs uppercase tracking-[0.35em] text-utility">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-2xl font-semibold text-white">{value}</p>
        {icon ? <span className="text-slate-200">{icon}</span> : null}
      </div>
      {detail ? <p className="mt-2 text-sm text-muted">{detail}</p> : null}
    </div>
  );
}
