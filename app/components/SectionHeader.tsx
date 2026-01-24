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
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
          {kicker}
        </p>
      ) : null}
      <h2 className="font-sekuya text-3xl font-bold text-white md:text-4xl">
        {title}
        {highlight ? <span className="text-amber-300"> {highlight}</span> : null}
      </h2>
      {description ? (
        <p className="max-w-2xl text-sm text-slate-400 md:text-base">{description}</p>
      ) : null}
    </div>
  );
}
