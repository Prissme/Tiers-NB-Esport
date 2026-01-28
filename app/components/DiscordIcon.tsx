const DISCORD_ICON_DATA =
  "https://media.discordapp.net/attachments/1434252768633290952/1466080774112542762/image-Photoroom_10.png?ex=697b719f&is=697a201f&hm=c44af05e9f6a24a3462c0f0f85d19f7141bc84f5a2a1a8a03bd3a3b838c055f3&=&format=webp&quality=lossless&width=236&height=236";

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
