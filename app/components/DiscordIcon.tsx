import ReloadingImage from "./ReloadingImage";

type DiscordIconProps = {
  className?: string;
  size?: number;
};

export default function DiscordIcon({ className = "", size = 22 }: DiscordIconProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-white/10 p-0.5 shadow-[0_0_12px_rgba(255,255,255,0.35)] ${className}`}
      aria-hidden="true"
      style={{ width: size + 2, height: size + 2 }}
    >
      <ReloadingImage
        src="/Discord.webp"
        alt=""
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        loading="lazy"
      />
    </span>
  );
}
