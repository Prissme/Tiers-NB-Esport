import Link from "next/link";
import type { ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "tertiary";

type ButtonProps = {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  external?: boolean;
  disabled?: boolean;
  className?: string;
};

const baseStyles =
  "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.28em] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a12] disabled:pointer-events-none disabled:opacity-60";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-cyan/15 text-white shadow-[0_0_25px_rgba(34,211,238,0.35)] ring-1 ring-cyan/40 hover:translate-y-[-1px] hover:bg-cyan/20 hover:shadow-[0_0_35px_rgba(34,211,238,0.45)]",
  secondary:
    "bg-white/5 text-white ring-1 ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:translate-y-[-1px] hover:bg-white/10 hover:ring-white/30",
  tertiary:
    "bg-transparent text-white/80 ring-1 ring-transparent hover:text-white hover:ring-white/20",
};

const shimmerStyles =
  "before:absolute before:inset-0 before:-translate-x-full before:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.35),transparent)] before:transition-transform before:duration-700 hover:before:translate-x-full";

export default function Button({
  href,
  children,
  variant = "primary",
  external = false,
  disabled = false,
  className,
}: ButtonProps) {
  const classes = [baseStyles, variantStyles[variant], shimmerStyles, className]
    .filter(Boolean)
    .join(" ");

  if (external) {
    return (
      <a
        href={href}
        className={classes}
        target="_blank"
        rel="noreferrer"
        aria-disabled={disabled}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} aria-disabled={disabled}>
      {children}
    </Link>
  );
}
