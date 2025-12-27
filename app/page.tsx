import Button from "./components/Button";
import EmptyState from "./components/EmptyState";
import SectionHeader from "./components/SectionHeader";
import { getLfnData } from "./lib/data-store";
import { formatDate, getStatusLabel } from "./lib/lfn-helpers";

export default async function HomePage() {
  const data = await getLfnData();
  const discordAvailable = Boolean(data.links.discord);

  return (
    <div className="space-y-12">
      <section className="section-card relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative space-y-6">
          <span className="badge">{data.season.name}</span>
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
            La ligue compétitive FR, claire, stricte et prête pour vous.
          </h1>
          <p className="max-w-2xl text-base text-slate-200 md:text-lg">
            La LFN structure vos scrims en compétition officielle. Format simple, règles claires,
            inscriptions rapides, suivi public.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href="/inscription" variant="primary">
              S'inscrire
            </Button>
            <Button
              href={discordAvailable ? data.links.discord : "#"}
              variant="secondary"
              external
              disabled={!discordAvailable}
            >
              {discordAvailable ? "Rejoindre le Discord" : "Discord à annoncer"}
            </Button>
          </div>
          <div className="grid gap-4 pt-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Statut</p>
              <p className="mt-2 text-sm text-white">{getStatusLabel(data.season.status)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Début</p>
              <p className="mt-2 text-sm text-white">{formatDate(data.season.dates.start)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Fin</p>
              <p className="mt-2 text-sm text-white">{formatDate(data.season.dates.end)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.2fr,1fr]">
        <div className="section-card space-y-6">
          <SectionHeader
            title="Participer en 3 étapes"
            description="Simple, sans discussion. Vous suivez le cadre, vous jouez." 
          />
          <ol className="space-y-4 text-sm text-slate-200">
            <li className="flex gap-3">
              <span className="text-emerald-300">01</span>
              <div>
                <p className="text-white">Remplissez le format d'inscription.</p>
                <p className="text-slate-400">Voir la page /inscription.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-300">02</span>
              <div>
                <p className="text-white">Rejoignez le Discord officiel.</p>
                <p className="text-slate-400">Toutes les annonces passent par là.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-300">03</span>
              <div>
                <p className="text-white">Confirmez vos disponibilités.</p>
                <p className="text-slate-400">La ponctualité est non négociable.</p>
              </div>
            </li>
          </ol>
        </div>
        <div className="section-card space-y-6">
          <SectionHeader
            title="Pourquoi la LFN est stricte"
            description="Pour protéger les équipes sérieuses et garantir des matchs joués." 
          />
          <ul className="space-y-3 text-sm text-slate-200">
            <li>Rosters verrouillés avant la saison.</li>
            <li>Retards et forfaits sanctionnés.</li>
            <li>Communication obligatoire en amont.</li>
            <li>Respect du règlement pour chaque match.</li>
          </ul>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          title="Dernières annonces"
          description="Suivez l'actualité officielle pour rester à jour." 
        />
        {data.announcements.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {data.announcements.map((announcement) => (
              <article
                key={`${announcement.title}-${announcement.date}`}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  {announcement.date || "à annoncer"}
                </p>
                <h3 className="mt-2 text-base font-semibold text-white">
                  {announcement.title || "Annonce à venir"}
                </h3>
                <p className="mt-2 text-sm text-slate-300">{announcement.content}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Aucune annonce publiée"
            description="Les annonces officielles arrivent bientôt."
            ctaLabel={data.links.discord ? "Rejoindre le Discord" : undefined}
            ctaHref={data.links.discord || undefined}
            secondaryLabel="Voir comment s'inscrire"
            secondaryHref="/inscription"
          />
        )}
      </section>
    </div>
  );
}
