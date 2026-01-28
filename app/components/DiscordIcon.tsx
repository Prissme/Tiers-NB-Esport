const DISCORD_ICON_DATA =
  "https://media.discordapp.net/attachments/1434252768633290952/1466093575224819904/image-Photoroom_12.png?ex=697b7d8b&is=697a2c0b&hm=3f3526437b32284f06c2f7d7dbf88515ebcb54692246eca72b8540ab26f35038&=&format=webp&quality=lossless&width=331&height=325";

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
