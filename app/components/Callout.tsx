import type { ReactNode } from "react";

type CalloutProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

export default function Callout({ title, description, actions }: CalloutProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 p-6">
      <div className="absolute -left-8 -top-16 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="absolute -bottom-24 right-4 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="relative space-y-4">
        <h3 className="text-xl font-semibold text-white md:text-2xl">{title}</h3>
        <p className="text-sm text-slate-300 md:text-base">{description}</p>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
