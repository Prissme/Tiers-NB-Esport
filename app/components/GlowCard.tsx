import type { ReactNode } from "react";

type GlowCardProps = {
  children: ReactNode;
  className?: string;
};

export default function GlowCard({ children, className }: GlowCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_25px_90px_-60px_rgba(15,23,42,0.9)] ${
        className ?? ""
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-12 top-4 h-40 w-40 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="absolute -bottom-16 right-2 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
