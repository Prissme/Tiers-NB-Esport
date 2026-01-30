const DISCORD_ICON_DATA = "/images/icons/discord.svg";

type DiscordIconProps = {
  className?: string;
  size?: number;
};

export default function DiscordIcon({ className = "", size = 22 }: DiscordIconProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-white/10 p-0.5 shadow-[0_0_12px_rgba(255,255,255,0.35)] ${className}`}
      aria-hidden="true"
    >
      <img
        src={DISCORD_ICON_DATA}
        alt=""
        width={size}
        height={size}
        className="rounded-full"
      />
    </span>
  );
}
