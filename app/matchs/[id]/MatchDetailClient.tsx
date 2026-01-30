"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SectionHeader from "../../components/SectionHeader";
import type { MatchGroup, SiteMatch } from "../../lib/site-types";
import type { Locale } from "../../lib/i18n";

type MatchDetailClientProps = {
  matchId: string;
  locale: Locale;
};

const flattenGroups = (groups: MatchGroup[]) => groups.flatMap((group) => group.matches);

const formatDate = (value: string | null, locale: Locale) => {
  if (!value) return locale === "en" ? "To be confirmed" : "À confirmer";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dateLocale = locale === "en" ? "en-US" : "fr-FR";
  return date.toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatTime = (value: string | null) => {
  if (!value) return "";
  if (value.includes("T")) {
    return value.split("T")[1]?.slice(0, 5) ?? "";
  }
  return value.slice(0, 5);
};

const statusLabels: Record<Locale, Record<string, string>> = {
  fr: {
    scheduled: "À venir",
    live: "En direct",
    finished: "Terminé",
  },
  en: {
    scheduled: "Upcoming",
    live: "Live",
    finished: "Finished",
  },
};

const copy = {
  fr: {
    kicker: "Match",
    unavailableTitle: "Détails indisponibles",
    unavailableDescription: "Ce match n'est pas accessible pour le moment.",
    attachmentsKicker: "Pièces jointes",
    attachmentsTitle: "Documents liés au match",
    attachmentsDescription: "Retrouvez les pièces jointes ajoutées par l'admin.",
    noAttachments: "Aucune pièce jointe disponible.",
    attachmentLabel: "Pièce jointe",
    scheduleKicker: "Programme",
    scheduleTitle: "Consulter le planning",
    scheduleDescription: "Horaires fixes par journée.",
    scheduleCta: "Voir le calendrier",
    scoreLabel: "Score",
    divisionFallback: "Division",
  },
  en: {
    kicker: "Match",
    unavailableTitle: "Details unavailable",
    unavailableDescription: "This match is not accessible right now.",
    attachmentsKicker: "Attachments",
    attachmentsTitle: "Match documents",
    attachmentsDescription: "Find the attachments added by the admin.",
    noAttachments: "No attachments available.",
    attachmentLabel: "Attachment",
    scheduleKicker: "Schedule",
    scheduleTitle: "View the schedule",
    scheduleDescription: "Fixed times by matchday.",
    scheduleCta: "See the calendar",
    scoreLabel: "Score",
    divisionFallback: "Division",
  },
};

export default function MatchDetailClient({ matchId, locale }: MatchDetailClientProps) {
  const content = copy[locale];
  const [match, setMatch] = useState<SiteMatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch("/api/site/matches", { cache: "no-store" });
        const payload = (await response.json()) as { groups?: MatchGroup[] };
        const flattened = flattenGroups(payload.groups ?? []);
        const found = flattened.find((item) => item.id === matchId) ?? null;
        if (mounted) {
          setMatch(found);
        }
      } catch (error) {
        console.error("match detail load error", error);
        if (mounted) {
          setMatch(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [matchId]);

  const attachments = useMemo(() => match?.attachments ?? [], [match]);

  if (loading) {
    return (
      <section className="surface-dominant space-y-4">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-6 w-48" />
        <div className="motion-card h-24" />
      </section>
    );
  }

  if (!match) {
    return (
      <section className="surface-dominant space-y-4">
        <SectionHeader
          kicker={content.kicker}
          title={content.unavailableTitle}
          description={content.unavailableDescription}
        />
      </section>
    );
  }

  const timeLabel = formatTime(match.startTime ?? match.scheduledAt);

  return (
    <div className="space-y-10">
      <section className="surface-dominant">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker={content.kicker}
            title={`${match.teamA.name} vs ${match.teamB.name}`}
            description={`${match.division ?? content.divisionFallback} · ${formatDate(
              match.scheduledAt,
              locale
            )}${timeLabel ? ` · ${timeLabel}` : ""}`}
          />
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-200">
            <span className="rounded-full bg-white/10 px-4 py-2 uppercase tracking-[0.3em] text-xs text-utility">
              {statusLabels[locale][match.status] ?? match.status}
            </span>
            {match.scoreA !== null && match.scoreB !== null ? (
              <span className="rounded-full bg-white/10 px-4 py-2 text-base font-semibold text-white">
                {content.scoreLabel} {match.scoreA} - {match.scoreB}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section-card space-y-4">
        <SectionHeader
          kicker={content.attachmentsKicker}
          title={content.attachmentsTitle}
          description={content.attachmentsDescription}
        />
        {attachments.length === 0 ? (
          <p className="text-sm text-muted">{content.noAttachments}</p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-200">
            {attachments.map((item, index) => (
              <li key={`${item}-${index}`}>
                <a
                  href={item}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white transition hover:bg-white/20"
                >
                  {content.attachmentLabel} {index + 1}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker={content.scheduleKicker}
          title={content.scheduleTitle}
          description={content.scheduleDescription}
        />
        <Link
          href="/matchs"
          className="inline-flex items-center justify-center rounded-full bg-white/10 px-5 py-3 text-xs uppercase tracking-[0.3em] text-slate-200"
        >
          {content.scheduleCta}
        </Link>
      </section>
    </div>
  );
}
