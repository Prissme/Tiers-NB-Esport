import Link from "next/link";

const footerLinks = [
  { label: "Matchs", href: "/matchs" },
  { label: "Classements", href: "/classement" },
  { label: "Règlement", href: "/reglement" },
];

type FooterProps = {
  seasonName: string;
  administrationLabel: string;
  discordInviteUrl?: string;
};

const isValidDiscordInvite = (url?: string) => {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return !trimmed.includes("discord.gg");
};

export default function Footer({
  seasonName,
  administrationLabel,
  discordInviteUrl,
}: FooterProps) {
  return (
    <footer className="border-t border-white/10 bg-slate-950/80">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 text-sm text-slate-300 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-3 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold">
              LFN
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">
                {seasonName}
              </p>
              <p className="text-xs text-slate-400">{administrationLabel}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://ko-fi.com/prissme"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/20 hover:text-white"
            >
              Ko-fi
            </a>
            {isValidDiscordInvite(discordInviteUrl) ? (
              <a
                href={discordInviteUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-200"
              >
                Discord
              </a>
            ) : null}
          </div>
        </div>
        <p className="mt-8 text-xs text-slate-500">
          © {new Date().getFullYear()} LFN. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
