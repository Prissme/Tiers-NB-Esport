import type { Metadata } from "next";
import SectionHeader from "../components/SectionHeader";
import { getLocale, type Locale } from "../lib/i18n";
import { createServerClient } from "../../src/lib/supabase/server";
import { withSchema } from "../../src/lib/supabase/schema";
import {
  mapTournamentRow,
  TOURNAMENT_COLUMNS,
  type Tournament,
  type TournamentRow,
} from "../../src/lib/tournaments";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tournois",
};

const DISCORD_INVITE = "https://discord.gg/q6sFPWCKD7";

const copy = {
  fr: {
    kicker: "Tournois",
    title: "Les events LFN",
    description: "Les prochains tournois, ceux en cours et les résultats des derniers.",
    upcomingTitle: "À venir & en cours",
    finishedTitle: "Terminés",
    empty: "Aucun tournoi pour le moment. Reviens bientôt !",
    emptyUpcoming: "Pas de tournoi annoncé pour l'instant.",
    teams: "Équipes",
    cashprize: "Cashprize",
    duration: "Durée",
    tierPoints: "Points de tier",
    tierPointsOn: "Activés",
    register: "S'inscrire",
    full: "Complet",
    dateTbd: "Date à définir",
    winners: "Gagnants",
    status: { upcoming: "À venir", live: "En cours", finished: "Terminé" },
  },
  en: {
    kicker: "Tournaments",
    title: "LFN events",
    description: "Upcoming tournaments, live ones and the results of the latest.",
    upcomingTitle: "Upcoming & live",
    finishedTitle: "Finished",
    empty: "No tournaments yet. Check back soon!",
    emptyUpcoming: "No tournament announced for now.",
    teams: "Teams",
    cashprize: "Cashprize",
    duration: "Duration",
    tierPoints: "Tier points",
    tierPointsOn: "Enabled",
    register: "Sign up",
    full: "Full",
    dateTbd: "Date TBD",
    winners: "Winners",
    status: { upcoming: "Upcoming", live: "Live", finished: "Finished" },
  },
};

const formatDate = (iso: string | null, locale: Locale, fallback: string) => {
  if (!iso) return fallback;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
};

const formatDuration = (hours: number | null) => {
  if (!hours) return null;
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return minutes ? `~${whole}h${String(minutes).padStart(2, "0")}` : `~${whole}h`;
};

const formatMoney = (amount: number, locale: Locale) =>
  new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);

const placeStyle = [
  "text-amber-300 border-amber-300/40 bg-amber-300/10",
  "text-slate-200 border-slate-200/30 bg-slate-200/10",
  "text-amber-600 border-amber-600/40 bg-amber-600/10",
];

const statusStyle: Record<Tournament["status"], string> = {
  upcoming: "border-white/25 bg-black/60 text-white",
  live: "border-emerald-400/50 bg-emerald-500/20 text-emerald-200",
  finished: "border-white/15 bg-black/60 text-white/60",
};

async function loadTournaments(): Promise<Tournament[]> {
  try {
    const supabase = withSchema(createServerClient());
    const { data, error } = await supabase.from("lfn_site_tournaments").select(TOURNAMENT_COLUMNS);
    if (error) {
      console.error("tournaments load error", error.message);
      return [];
    }
    return ((data ?? []) as unknown as TournamentRow[]).map(mapTournamentRow);
  } catch (error) {
    console.error("tournaments load error", error);
    return [];
  }
}

function TournamentCard({ tournament, locale }: { tournament: Tournament; locale: Locale }) {
  const content = copy[locale];
  const isFull = tournament.teamsMax > 0 && tournament.teamsRegistered >= tournament.teamsMax;
  const fill =
    tournament.teamsMax > 0
      ? Math.min(100, Math.round((tournament.teamsRegistered / tournament.teamsMax) * 100))
      : 0;
  const duration = formatDuration(tournament.durationHours);
  const stats: Array<{ label: string; value: string }> = [];
  if (tournament.cashprize > 0) {
    stats.push({ label: content.cashprize, value: formatMoney(tournament.cashprize, locale) });
  }
  if (duration) {
    stats.push({ label: content.duration, value: duration });
  }
  if (tournament.tierPoints) {
    stats.push({ label: content.tierPoints, value: content.tierPointsOn });
  }

  return (
    <article className="overflow-hidden rounded-[16px] border border-white/10 bg-black/45 backdrop-blur-sm">
      <div className="relative aspect-[16/6] w-full bg-gradient-to-br from-[#2a2110] via-[#12151d] to-[#0b0d14]">
        {tournament.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tournament.bannerUrl}
            alt={tournament.name}
            className={`h-full w-full object-cover ${tournament.status === "finished" ? "opacity-70" : ""}`}
            loading="lazy"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span
          className={`absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] ${statusStyle[tournament.status]}`}
        >
          {tournament.status === "live" ? (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
          ) : null}
          {content.status[tournament.status]}
        </span>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white sm:text-2xl">{tournament.name}</h3>
            <p className="mt-1 text-sm capitalize text-[#f2d184]">
              {formatDate(tournament.startsAt, locale, content.dateTbd)}
            </p>
          </div>
          {tournament.status === "upcoming" ? (
            isFull ? (
              <span className="rounded-full border border-white/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                {content.full}
              </span>
            ) : (
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noreferrer"
                className="header-cta inline-flex items-center justify-center text-xs font-semibold uppercase tracking-[0.12em]"
              >
                {content.register}
              </a>
            )
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-[1.2fr_2fr] sm:items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">{content.teams}</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {tournament.teamsRegistered}
              <span className="text-white/50"> / {tournament.teamsMax || "—"}</span>
            </p>
            {tournament.teamsMax > 0 ? (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#f2d184] to-[#c9b26a]"
                  style={{ width: `${fill}%` }}
                />
              </div>
            ) : null}
          </div>
          {stats.length > 0 ? (
            <dl className="flex flex-wrap gap-x-8 gap-y-3 sm:justify-end">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-[10px] uppercase tracking-[0.3em] text-white/50">{stat.label}</dt>
                  <dd className="mt-1 text-lg font-semibold text-white">{stat.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {tournament.status === "finished" && tournament.winners.length > 0 ? (
          <div className="border-t border-white/10 pt-4">
            <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/50">{content.winners}</p>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {tournament.winners.map((winner, index) => (
                <li
                  key={`${winner.name}-${index}`}
                  className="flex items-center gap-3 rounded-[10px] border border-white/10 bg-white/[0.04] px-3 py-2"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                      placeStyle[index] ?? "border-white/15 text-white/60"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{winner.name}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://flagcdn.com/w40/${winner.country.toLowerCase()}.png`}
                    alt={winner.country}
                    className="h-4 w-6 shrink-0 rounded-sm object-cover"
                    loading="lazy"
                  />
                  <span className="text-xs text-white/60">{winner.country}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default async function TournamentsPage() {
  const locale = getLocale();
  const content = copy[locale];
  const tournaments = await loadTournaments();

  const time = (tournament: Tournament) => (tournament.startsAt ? new Date(tournament.startsAt).getTime() : null);

  // En cours d'abord, puis les prochains par date croissante (sans date à la fin)
  const active = tournaments
    .filter((tournament) => tournament.status !== "finished")
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "live" ? -1 : 1;
      return (time(a) ?? Infinity) - (time(b) ?? Infinity);
    });
  // Terminés : les plus récents d'abord
  const finished = tournaments
    .filter((tournament) => tournament.status === "finished")
    .sort((a, b) => (time(b) ?? -Infinity) - (time(a) ?? -Infinity));

  return (
    <div className="page-stack">
      <section className="dominant-section space-y-10">
        <div className="relative z-10 space-y-10">
          <SectionHeader
            kicker={content.kicker}
            title={content.title}
            description={content.description}
            tone="dominant"
          />

          {tournaments.length === 0 ? (
            <p className="text-sm text-white/60">{content.empty}</p>
          ) : (
            <>
              <div className="space-y-5">
                <h3 className="text-xs uppercase tracking-[0.35em] text-utility">{content.upcomingTitle}</h3>
                {active.length > 0 ? (
                  active.map((tournament) => (
                    <TournamentCard key={tournament.id} tournament={tournament} locale={locale} />
                  ))
                ) : (
                  <p className="text-sm text-white/60">{content.emptyUpcoming}</p>
                )}
              </div>

              {finished.length > 0 ? (
                <div className="space-y-5">
                  <h3 className="text-xs uppercase tracking-[0.35em] text-utility">{content.finishedTitle}</h3>
                  {finished.map((tournament) => (
                    <TournamentCard key={tournament.id} tournament={tournament} locale={locale} />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
