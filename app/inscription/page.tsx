import Button from "../components/Button";
import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";
import { formatDeadline, getStatusLabel } from "../lib/lfn-helpers";

export default async function InscriptionPage() {
  const data = await getLfnData();
  const deadlineLabel = formatDeadline(data.season.deadline, data.season.timezone);

  const registrationTemplate = `Nom de l'équipe :
Tag :
Division demandée (D1/D2) :
Roster titulaires (3) :
Subs obligatoires (3) :
Coach (optionnel) :`;

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          kicker="Inscriptions"
          title="S'inscrire"
          description="Zéro détour. Un message, un roster complet." 
        />
        <div className="grid gap-6 md:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4 text-sm text-slate-200">
            <p>
              Statut : <span className="text-white">{getStatusLabel(data.season.status)}</span>
            </p>
            <p>
              Deadline : <span className="text-white">{deadlineLabel} (Bruxelles)</span>
            </p>
            <p>
              Roster requis : {data.rules.roster.starters} joueurs + {data.rules.roster.subsRequired} subs. Coach optionnel.
            </p>
            <p className="text-slate-400">
              Préparez votre message avec le template officiel. Les consignes d'envoi sont
              centralisées sur Discord.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button href="/reglement" variant="secondary">
                Lire le règlement
              </Button>
              <Button
                href={data.links.discord || "#"}
                variant="primary"
                external
                disabled={!data.links.discord}
              >
                Rejoindre le Discord
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Template officiel à copier
            </p>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/80 p-4 text-xs text-slate-200">
              {registrationTemplate}
            </pre>
          </div>
        </div>
      </section>

      <section className="section-card space-y-4">
        <SectionHeader
          kicker="Rappels"
          title="Points clés"
          description="Règles essentielles avant envoi." 
        />
        <ul className="grid gap-3 text-sm text-slate-200 md:grid-cols-2">
          <li>Rosters complets obligatoires dès l'inscription.</li>
          <li>Les retards entraînent des sanctions automatiques.</li>
          <li>Départage des égalités au winrate.</li>
          <li>Stats saisies par l'orga pour l'instant.</li>
        </ul>
      </section>
    </div>
  );
}
