import ReloadingImage from "./ReloadingImage";

const DISCORD_ICON_DATA =
  "https://media.discordapp.net/attachments/1434252768633290952/1466080774112542762/image-Photoroom_10.png?ex=697e149f&is=697cc31f&hm=ac7bbb921eb8b3538106cccf9dadb1bdac9190853a30407559cf7e8eb53a80ff&=&format=webp&quality=lossless&width=236&height=236";

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
      <ReloadingImage
        src={DISCORD_ICON_DATA}
        alt=""
        width={size}
        height={size}
        className="rounded-full"
      />
    </span>
  );
}
