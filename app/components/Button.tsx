import Link from "next/link";
import type { ReactNode } from "react";

type ButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  external?: boolean;
  disabled?: boolean;
};

const styles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-emerald-400/90 text-slate-900 hover:bg-emerald-300 focus-visible:ring-emerald-300",
  secondary:
    "bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white/30",
  ghost:
    "border border-white/15 text-white hover:border-white/30 hover:bg-white/5 focus-visible:ring-white/30",
};

export default function Button({
  href,
  children,
  variant = "primary",
  external = false,
  disabled = false,
}: ButtonProps) {
  const className = [
    "inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
    styles[variant],
    disabled ? "pointer-events-none opacity-60" : "",
  ].join(" ");

  if (external) {
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noreferrer"
        aria-disabled={disabled}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} aria-disabled={disabled}>
      {children}
    </Link>
  );
}
