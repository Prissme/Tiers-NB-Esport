import type { ReactNode } from "react";

type GlowCardProps = {
  children: ReactNode;
  className?: string;
};

export default function GlowCard({ children, className }: GlowCardProps) {
  return (
    <div
      className={`surface-panel relative overflow-hidden shadow-[0_25px_90px_-60px_rgba(15,23,42,0.9)] ${
        className ?? ""
      }`}
    >
      <div className="relative">{children}</div>
    </div>
  );
}
