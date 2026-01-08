import type { ReactNode } from "react";

type FeatureCardProps = {
  title: string;
  description: string;
  icon?: ReactNode;
};

export default function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-amber-400/10 blur-2xl" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{title}</p>
          <p className="mt-3 text-sm text-white">{description}</p>
        </div>
        {icon ? <span className="text-amber-300">{icon}</span> : null}
      </div>
    </div>
  );
}
