import Link from "next/link";
import type { SiteTeam } from "../lib/site-types";
import type { Locale } from "../lib/i18n";
import ReloadingImage from "./ReloadingImage";

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const copy = {
  fr: {
    logoAlt: (name: string) => `Logo ${name}`,
  },
  en: {
    logoAlt: (name: string) => `${name} logo`,
  },
};

export default function TeamCard({ team, locale }: { team: SiteTeam; locale: Locale }) {
  const content = copy[locale];
  return (
    <Link
      href={`/equipes/${team.id}`}
      className="group flex items-center gap-4 rounded-[12px] bg-white/[0.04] px-5 py-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08] animate-in"
    >
      {team.logoUrl ? (
        <ReloadingImage
          src={team.logoUrl}
          alt={content.logoAlt(team.name)}
          className="h-12 w-12 rounded-[10px] object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-white/10 text-xs font-semibold uppercase tracking-[0.2em] text-utility">
          {getInitials(team.name)}
        </div>
      )}
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-utility">
          {team.division ?? "—"}
        </p>
        <p className="text-sm font-semibold text-white">{team.name}</p>
      </div>
    </Link>
  );
}
