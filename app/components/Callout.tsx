import type { ReactNode } from "react";

type CalloutProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

export default function Callout({ title, description, actions }: CalloutProps) {
  return (
    <div className="surface-panel relative overflow-hidden">
      <div className="relative space-y-4">
        <h3 className="text-xl font-semibold text-white md:text-2xl title-accent">{title}</h3>
        <p className="text-sm text-slate-300 md:text-base">{description}</p>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
