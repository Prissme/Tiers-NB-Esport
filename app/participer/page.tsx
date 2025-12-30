import Button from "../components/Button";
import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";
import { formatDeadlineWithZone } from "../lib/lfn-helpers";

export default async function ParticiperPage() {
  const data = await getLfnData();
  const deadlineLabel = formatDeadlineWithZone(data.season.deadline, data.season.timezone);
  const discordAvailable = Boolean(data.links.discord);

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Participer"
          title="Comment rejoindre la ligue"
          description="Trois étapes claires pour entrer dans la saison suivante."
        />
        <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <ol className="space-y-6 text-sm text-slate-200">
            <li className="flex gap-4">
              <span className="text-emerald-300">01</span>
              <div>
                <p className="text-white">Rejoindre le Discord officiel.</p>
                <p className="text-slate-400">
                  Les annonces, inscriptions et horaires passent par Discord.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="text-emerald-300">02</span>
              <div>
                <p className="text-white">Composer un roster stable.</p>
                <p className="text-slate-400">
                  {data.rules.roster.starters} titulaires + {data.rules.roster.subsRequired} remplaçants.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="text-emerald-300">03</span>
              <div>
                <p className="text-white">Envoyer l&apos;inscription.</p>
                <p className="text-slate-400">Deadline actuelle : {deadlineLabel}.</p>
              </div>
            </li>
          </ol>
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Checklist rapide</p>
            <ul className="space-y-3">
              <li>Roster complet validé.</li>
              <li>Disponibilités alignées sur les horaires Bruxelles.</li>
              <li>Lecture rapide du règlement.</li>
            </ul>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button href="/inscription" variant="primary">
                Accéder au formulaire
              </Button>
              <Button
                href={discordAvailable ? data.links.discord : "#"}
                variant="secondary"
                external
                disabled={!discordAvailable}
              >
                Rejoindre le Discord
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Rappels"
          title="Ce qu&apos;il faut retenir"
          description="Tout est pensé pour un rythme rapide et clair."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Horaires fixes",
              detail: "Matchs planifiés sur des fenêtres courtes et régulières.",
            },
            {
              title: "Équité",
              detail: "Même règles pour tout le monde, pas de flou.",
            },
            {
              title: "Suivi simple",
              detail: "Calendrier, scores et standings centralisés ici.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.title}</p>
              <p className="mt-2 text-sm text-white">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
