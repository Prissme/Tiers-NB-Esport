import Link from "next/link";
import Button from "./components/Button";
import SectionHeader from "./components/SectionHeader";
import { getLfnData } from "./lib/data-store";
import { getStandingsByDivision, teamNameById } from "./lib/lfn-helpers";

export default async function HomePage() {
  const data = await getLfnData();
  const standingsMap = getStandingsByDivision(data.standings);
  const teamNames = teamNameById(data);
  const day2Matches = data.matches.filter((match) => match.date === "Day 2");
  const day2Count = day2Matches.length;
  const latestAnnouncement = [...data.announcements].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  })[0];

  const formatRecord = (wins: number, losses: number) => `${wins}–${losses}`;
  const getTeamName = (teamId: string) => teamNames.get(teamId) || "Équipe à annoncer";
  const getWinrate = (row: { setsWon: number; setsLost: number }) => {
    const total = row.setsWon + row.setsLost;
    return total > 0 ? row.setsWon / total : 0;
  };

  const d1Rows = standingsMap.D1?.rows ?? [];
  const d1Leader = [...d1Rows].sort((a, b) => b.setsWon - a.setsWon)[0];
  const d1UnderPressure = [...d1Rows].sort((a, b) => a.setsWon - b.setsWon)[0];
  const d1KeyMatch = data.matches.find(
    (match) => match.division === "D1" && match.date === "Day 2"
  );

  const d2Rows = standingsMap.D2?.rows ?? [];
  const d2Sorted = [...d2Rows].sort((a, b) => getWinrate(b) - getWinrate(a));
  const d2Leader = d2Sorted[0];
  const d2Outsider = d2Sorted[1];
  const d2UnderPressure = d2Sorted[d2Sorted.length - 1];

  return (
    <div className="space-y-12">
      <section className="section-card relative overflow-hidden">
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="relative space-y-6">
          <span className="badge">LFN</span>
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
            LFN — Ligue Francophone Null’s Brawl
          </h1>
          <p className="max-w-2xl text-base text-slate-200 md:text-lg">
            La ligue compétitive pour les joueurs tryhard. Suivez la saison comme une série :
            matchs, classements et storylines en temps réel.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href="/matchs" variant="primary">
              Voir les matchs
            </Button>
            <Button href="/classement" variant="secondary">
              Classements
            </Button>
            <Button href="/participer" variant="secondary">
              Comment participer
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        <div className="section-card space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/80">
            État de la ligue
          </p>
          <h2 className="text-2xl font-semibold text-white md:text-3xl">
            Saison 2 en cours — Day 2
          </h2>
          <p className="text-sm text-slate-200 md:text-base">
            {day2Count || 0} matchs aujourd’hui
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-white/10 px-3 py-1">Division 1</span>
            <span className="rounded-full border border-white/10 px-3 py-1">Division 2</span>
            <span className="rounded-full border border-white/10 px-3 py-1">BO5</span>
          </div>
        </div>

        <div className="section-card space-y-6">
          <SectionHeader
            kicker="Storylines"
            title="Ce qui fait vibrer la semaine"
            description="Basé sur les données officielles de la ligue."
          />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Division 1</p>
              <ul className="space-y-2 text-sm text-slate-200">
                <li>
                  • {d1Leader ? `${getTeamName(d1Leader.teamId)} en tête (${d1Leader.setsWon} pts)` : "Leader à annoncer"}
                </li>
                <li>
                  • {d1UnderPressure ? `${getTeamName(d1UnderPressure.teamId)} sous pression` : "Équipe sous pression à annoncer"}
                </li>
                <li>
                  • {d1KeyMatch ? `Match clé : ${d1KeyMatch.teamA} vs ${d1KeyMatch.teamB}` : "Match clé à annoncer"}
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Division 2</p>
              <ul className="space-y-2 text-sm text-slate-200">
                <li>
                  • {d2Leader ? `${getTeamName(d2Leader.teamId)} dominant (${formatRecord(d2Leader.wins, d2Leader.losses)})` : "Leader à annoncer"}
                </li>
                <li>
                  • {d2Outsider ? `${getTeamName(d2Outsider.teamId)} outsider solide` : "Outsider à annoncer"}
                </li>
                <li>
                  • {d2UnderPressure ? `${getTeamName(d2UnderPressure.teamId)} en difficulté` : "Équipe en difficulté à annoncer"}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Matchs du jour"
          title="Day 2 en direct"
          description="Les rencontres à venir sont listées ci-dessous."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {day2Matches.map((match) => (
            <div
              key={match.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-white">
                  {match.teamA} vs {match.teamB}
                </span>
                <span className="text-xs text-slate-400">{match.time}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-white/10 px-2 py-1">
                  {match.division}
                </span>
                <span>À venir</span>
              </div>
            </div>
          ))}
        </div>
        <Button href="/matchs" variant="secondary">
          Voir tous les matchs
        </Button>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Vie & actualité"
          title="Dernière mise à jour"
          description="Le dernier changement officiel communiqué par l&apos;orga."
        />
        {latestAnnouncement ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              {latestAnnouncement.date}
            </p>
            <p className="mt-3 text-white">{latestAnnouncement.title}</p>
            <p className="mt-2 text-slate-300">{latestAnnouncement.content}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-300">Aucune mise à jour publiée pour le moment.</p>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Sponsors</p>
        <p className="mt-3 text-white">LFN est ouverte à des partenariats.</p>
        <p className="mt-2">Discussions simples et transparence totale.</p>
        <Link href="/partenariats" className="mt-3 inline-flex text-emerald-300 hover:text-emerald-200">
          En savoir plus →
        </Link>
      </section>
    </div>
  );
}
