import Button from "./Button";

type EmptyStateProps = {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export default function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
  secondaryLabel,
  secondaryHref,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-300">{description}</p>
      {(ctaLabel && ctaHref) || (secondaryLabel && secondaryHref) ? (
        <div className="mt-4 flex flex-wrap justify-center gap-3">
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
  );
}
