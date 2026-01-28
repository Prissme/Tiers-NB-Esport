import Button from "./Button";

type EmptyStateProps = {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  badge?: string;
};

export default function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
  secondaryLabel,
  secondaryHref,
  badge,
}: EmptyStateProps) {
  return (
    <div className="surface-panel relative overflow-hidden bg-gradient-to-br from-white/5 via-white/5 to-transparent text-left">
      <div className="relative space-y-3">
        {badge ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-utility">
            {badge}
          </span>
        ) : null}
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-muted">{description}</p>
        {(ctaLabel && ctaHref) || (secondaryLabel && secondaryHref) ? (
          <div className="flex flex-wrap gap-3 pt-2">
            {ctaLabel && ctaHref ? (
              <Button href={ctaHref} variant="primary">
                {ctaLabel}
              </Button>
            ) : null}
            {secondaryLabel && secondaryHref ? (
              <Button href={secondaryHref} variant="secondary">
                {secondaryLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
