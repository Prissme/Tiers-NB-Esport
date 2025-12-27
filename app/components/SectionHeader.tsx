type SectionHeaderProps = {
  title: string;
  description?: string;
  kicker?: string;
};

export default function SectionHeader({ title, description, kicker }: SectionHeaderProps) {
  return (
    <div className="space-y-2">
      {kicker ? (
        <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/80">
          {kicker}
        </p>
      ) : null}
      <h2 className="text-2xl font-semibold text-white md:text-3xl">{title}</h2>
      {description ? (
        <p className="text-sm text-slate-300 md:text-base">{description}</p>
      ) : null}
    </div>
  );
}
