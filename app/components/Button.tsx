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
  "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-md border px-6 py-3 text-xs font-semibold uppercase tracking-[0.32em] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg)] disabled:pointer-events-none disabled:opacity-60";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "border-[color:var(--color-border)] bg-[rgba(12,16,18,0.72)] text-[color:var(--color-text)] shadow-[inset_0_1px_0_rgba(200,177,137,0.12)] hover:border-[color:var(--color-border-strong)] hover:bg-[rgba(18,23,26,0.78)]",
  secondary:
    "border-[color:var(--color-border-soft)] bg-transparent text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:border-[color:var(--color-border-strong)]",
  tertiary:
    "border-transparent bg-transparent text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]",
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
