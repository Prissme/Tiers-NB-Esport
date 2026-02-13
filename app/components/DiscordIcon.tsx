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
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="rounded-full"
      >
        <rect width="24" height="24" rx="12" fill="#5865F2" />
        <path
          d="M16.94 8.35a12.4 12.4 0 0 0-3.12-.96l-.15.3a11.57 11.57 0 0 1 2.77 1.03c-2.34-.98-4.86-.98-7.17 0a11.57 11.57 0 0 1 2.77-1.03l-.15-.3c-1.08.19-2.13.5-3.12.96-1.97 2.98-2.5 5.9-2.24 8.78 1.31.98 2.58 1.57 3.82 1.95l.82-1.34c-.45-.16-.88-.36-1.27-.58.11-.08.21-.16.31-.25 2.46 1.15 5.12 1.15 7.54 0 .1.09.2.17.31.25-.39.23-.82.42-1.27.58l.82 1.34c1.24-.38 2.52-.97 3.82-1.95.31-3.34-.53-6.23-2.24-8.78Zm-7.26 7.04c-.74 0-1.34-.68-1.34-1.51 0-.84.59-1.52 1.34-1.52.75 0 1.35.68 1.34 1.52 0 .83-.59 1.51-1.34 1.51Zm4.64 0c-.74 0-1.34-.68-1.34-1.51 0-.84.59-1.52 1.34-1.52.75 0 1.35.68 1.34 1.52 0 .83-.59 1.51-1.34 1.51Z"
          fill="white"
        />
      </svg>
    </span>
  );
}
