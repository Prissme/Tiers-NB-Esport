import Link from "next/link";

const footerLinks = [
  { label: "Matchs", href: "/matchs" },
  { label: "Classements", href: "/classement" },
  { label: "Participer", href: "/participer" },
  { label: "Règlement", href: "/reglement" },
  { label: "Partenariats", href: "/partenariats" },
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
  const showDiscordLink = isValidDiscordInvite(discordInviteUrl);

  return (
    <footer className="border-t border-white/10 bg-slate-950/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-slate-300 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-white">LFN</p>
            <p className="text-xs text-slate-400">{seasonName}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">Officiel</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <span>{administrationLabel}</span>
            {showDiscordLink ? (
              <a
                href={discordInviteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-300 hover:text-emerald-200"
              >
                Discord officiel
              </a>
            ) : (
              <span className="text-slate-500">Lien Discord à configurer</span>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} LFN. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
