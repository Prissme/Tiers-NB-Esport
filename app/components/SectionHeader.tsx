type SectionHeaderProps = {
  title: string;
  description?: string;
  kicker?: string;
  align?: "left" | "center";
  highlight?: string;
  tone?: "dominant" | "support";
};

export default function SectionHeader({
  title,
  description,
  kicker,
  align = "left",
  highlight,
  tone = "support",
}: SectionHeaderProps) {
  const alignClasses = align === "center" ? "text-center items-center" : "text-left";
  const kickerClass =
    tone === "dominant" ? "section-kicker section-kicker--dominant" : "section-kicker";
  const titleClass =
    tone === "dominant"
      ? "section-title section-title--dominant dominant-title"
      : "section-title";
  const highlightClass = tone === "dominant" ? "signal-accent" : "title-accent";

  return (
    <div className={`flex flex-col gap-3 ${alignClasses}`}>
      {kicker ? (
        <p className={kickerClass}>{kicker}</p>
      ) : null}
      <h2 className={titleClass}>
        {title}
        {highlight ? <span className={highlightClass}> {highlight}</span> : null}
      </h2>
      {description ? (
        <p className="section-description">{description}</p>
      ) : null}
    </div>
  );
}
