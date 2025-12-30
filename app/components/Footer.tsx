import Link from "next/link";
import type { LfnLinks } from "../lib/types";

const footerLinks = [
  { label: "Matchs", href: "/matchs" },
  { label: "Classements", href: "/classement" },
  { label: "Participer", href: "/participer" },
  { label: "Règlement", href: "/reglement" },
  { label: "Partenariats", href: "/partenariats" },
];

type FooterProps = {
  links: LfnLinks;
  seasonName: string;
};

export default function Footer({ links, seasonName }: FooterProps) {
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
            {links.discord ? (
              <a
                href={links.discord}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white"
              >
                Discord
              </a>
            ) : (
              <span className="text-slate-500">Discord</span>
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
