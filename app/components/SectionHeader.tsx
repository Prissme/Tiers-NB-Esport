type SectionHeaderProps = {
  title: string;
  description?: string;
  kicker?: string;
  align?: "left" | "center";
  highlight?: string;
};

export default function SectionHeader({
  title,
  description,
  kicker,
  align = "left",
  highlight,
}: SectionHeaderProps) {
  const alignClasses = align === "center" ? "text-center items-center" : "text-left";

  return (
    <div className={`flex flex-col gap-3 ${alignClasses}`}>
      {kicker ? (
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-300/80">
          {kicker}
        </p>
      ) : null}
      <h2 className="text-3xl font-semibold text-white md:text-4xl">
        {title}
        {highlight ? <span className="text-emerald-300"> {highlight}</span> : null}
      </h2>
      {description ? (
        <p className="max-w-2xl text-sm text-slate-300 md:text-base">{description}</p>
      ) : null}
    </div>
  );
}
