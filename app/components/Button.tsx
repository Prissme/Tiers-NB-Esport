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
    "bg-fuchsia-400 text-slate-950 hover:bg-fuchsia-300 focus-visible:ring-fuchsia-300",
  secondary:
    "border border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10 focus-visible:ring-white/30",
  ghost:
    "text-white/80 hover:text-white focus-visible:ring-white/30",
};

export default function Button({
  href,
  children,
  variant = "primary",
  external = false,
  disabled = false,
}: ButtonProps) {
  const className = [
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
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
