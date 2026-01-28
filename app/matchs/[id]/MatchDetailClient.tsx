"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SectionHeader from "../../components/SectionHeader";
import type { MatchGroup, SiteMatch } from "../../lib/site-types";

type MatchDetailClientProps = {
  matchId: string;
};

const flattenGroups = (groups: MatchGroup[]) => groups.flatMap((group) => group.matches);

const formatDate = (value: string | null) => {
  if (!value) return "À confirmer";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", {
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

export default function MatchDetailClient({ matchId }: MatchDetailClientProps) {
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
          kicker="Match"
          title="Détails indisponibles"
          description="Ce match n'est pas accessible pour le moment."
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
            kicker="Match"
            title={`${match.teamA.name} vs ${match.teamB.name}`}
            description={`${match.division ?? "Division"} · ${formatDate(match.scheduledAt)}${
              timeLabel ? ` · ${timeLabel}` : ""
            }`}
          />
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-200">
            <span className="rounded-full bg-white/10 px-4 py-2 uppercase tracking-[0.3em] text-xs text-utility">
              {match.status}
            </span>
            {match.scoreA !== null && match.scoreB !== null ? (
              <span className="rounded-full bg-white/10 px-4 py-2 text-base font-semibold text-white">
                Score {match.scoreA} - {match.scoreB}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section-card space-y-4">
        <SectionHeader
          kicker="Pièces jointes"
          title="Documents liés au match"
          description="Retrouvez les pièces jointes ajoutées par l'admin."
        />
        {attachments.length === 0 ? (
          <p className="text-sm text-muted">Aucune pièce jointe disponible.</p>
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
                  Pièce jointe {index + 1}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Programme"
          title="Consulter le planning"
          description="Horaires fixes par journée."
        />
        <Link
          href="/matchs"
          className="inline-flex items-center justify-center rounded-full bg-white/10 px-5 py-3 text-xs uppercase tracking-[0.3em] text-slate-200"
        >
          Voir le calendrier
        </Link>
      </section>
    </div>
  );
}
