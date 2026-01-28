import Link from "next/link";
import type { ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "tertiary";

type ButtonProps = {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  external?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
};

const baseStyles =
  "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-[8px] px-7 py-[14px] text-xs font-semibold uppercase tracking-[0.12em] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg)] disabled:pointer-events-none disabled:opacity-60";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[color:var(--color-accent)] text-[#20180a] shadow-[0_0_30px_rgba(201,178,106,0.35)] hover:bg-[color:var(--color-accent-deep)]",
  secondary:
    "bg-[rgba(255,255,255,0.04)] text-[color:var(--color-text-faint)] hover:text-[color:var(--color-text)] hover:bg-[rgba(255,255,255,0.1)]",
  tertiary:
    "border-transparent bg-transparent text-[color:var(--color-text-faint)] hover:text-[color:var(--color-text)]",
};

export default function Button({
  href,
  children,
  variant = "primary",
  external = false,
  disabled = false,
  ariaLabel,
  className,
}: ButtonProps) {
  const classes = [baseStyles, variantStyles[variant], className].filter(Boolean).join(" ");

  if (external) {
    return (
      <a
        href={href}
        className={classes}
        target="_blank"
        rel="noreferrer"
        aria-disabled={disabled}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} aria-disabled={disabled} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
