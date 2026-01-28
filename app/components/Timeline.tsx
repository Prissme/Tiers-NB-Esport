import type { ReactNode } from "react";

type TimelineItem = {
  title: string;
  description: string;
  badge?: string;
  icon?: ReactNode;
};

type TimelineProps = {
  items: TimelineItem[];
};

export default function Timeline({ items }: TimelineProps) {
  return (
    <ol className="space-y-5">
      {items.map((item, index) => (
        <li key={item.title} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-slate-200">
              {item.icon ?? <span className="text-sm font-semibold">{index + 1}</span>}
            </div>
            {index < items.length - 1 ? (
              <span className="mt-2 h-12 w-px bg-white/10" />
            ) : null}
          </div>
          <div className="surface-flat">
            {item.badge ? (
              <p className="text-xs uppercase tracking-[0.35em] title-accent">
                {item.badge}
              </p>
            ) : null}
            <p className="mt-2 text-white">{item.title}</p>
            <p className="mt-2 text-sm text-slate-300">{item.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
