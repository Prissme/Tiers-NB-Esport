import Link from "next/link";
import SectionHeader from "./components/SectionHeader";
import { lfnData } from "./lib/lfnData";

export default function HomePage() {
  const { season, stats, lastResult, format, organization } = lfnData;

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
            Compétition structurée • Règlement strict • Résultats suivis
          </p>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
            {organization.communication}
          </p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Statut officiel</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>{season.status}</li>
              <li>{season.phase}</li>
              <li>{season.nextStep}</li>
              <li>Dernière MAJ : {season.lastUpdated}</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Chiffres clés</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>{stats.teamsRegistered} équipes inscrites</li>
              <li>{stats.teamsActive} actives</li>
              <li>{stats.divisions} divisions</li>
              <li>BO{format.bestOf}</li>
              <li>{stats.matchesPerWeek} matchs/semaine</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Dernier résultat
            </p>
            <p className="mt-3 text-lg font-semibold text-white">
              {lastResult.teamA} {lastResult.scoreA}–{lastResult.scoreB} {lastResult.teamB}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {lastResult.date} · {lastResult.time}
            </p>
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Organisation"
          title="Cadre officiel et suivi transparent"
          description="Gestion manuelle, publication des résultats et discipline appliquée."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Gouvernance</p>
            <p className="mt-3 text-white">{organization.administrationLabel}</p>
            <p className="mt-2 text-slate-300">{organization.management}</p>
            <p className="mt-2 text-slate-300">{organization.publication}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Discipline</p>
            <ul className="mt-3 space-y-2">
              {organization.sanctions.map((sanction) => (
                <li key={sanction}>• {sanction}</li>
              ))}
            </ul>
          </div>
        </div>
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
