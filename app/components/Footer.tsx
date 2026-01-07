import Link from "next/link";

const footerLinks = [
  { label: "Matchs", href: "/matchs" },
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
  const showDiscordLink = isValidDiscordInvite(discordInviteUrl);

  return (
    <footer className="border-t border-white/10 bg-slate-950/80">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 text-sm text-slate-300 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.1fr,1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold">
                LFN
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-fuchsia-300/80">
                  {seasonName}
                </p>
                <p className="text-xs text-slate-400">{administrationLabel}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400">
              LFN est la ligue francophone compétitive Null&apos;s Brawl. Nous organisons un circuit
              clair, documenté et transparent pour toutes les équipes.
            </p>
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
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Officiel</p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-white">{administrationLabel}</p>
                <p className="text-slate-400">
                  Publications manuelles, résumés des matchs et accompagnement des équipes.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {showDiscordLink ? (
                  <a
                    href={discordInviteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-fuchsia-300/40 bg-fuchsia-400/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-fuchsia-200"
                  >
                    Discord officiel
                  </a>
                ) : (
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Lien Discord à configurer
                  </span>
                )}
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  contact@lfn.gg
                </span>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Suivi live</p>
              <p className="mt-3 text-sm text-slate-300">
                Résumés des matchs, highlights et annonces officielles : tout est centralisé pour les
                équipes et les partenaires.
              </p>
            </div>
          </div>
        </div>
        <p className="mt-10 text-xs text-slate-500">
          © {new Date().getFullYear()} LFN. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
