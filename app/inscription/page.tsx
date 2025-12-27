import Button from "../components/Button";
import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";

const registrationTemplate = `Nom de l'équipe :
Tag :
Division demandée (D1/D2) :
Capitaine (pseudo + Discord) :
Joueurs (5) :
Disponibilités principales :
Lien vers logo (optionnel) :`;

export default async function InscriptionPage() {
  const data = await getLfnData();

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          title="Inscription"
          description="Tout se fait en une seule fois. Format strict, pas d'aller-retour." 
        />
        <div className="grid gap-6 md:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4 text-sm text-slate-200">
            <p>1. Copiez le format officiel ci-contre.</p>
            <p>2. Remplissez toutes les lignes, sans oubli.</p>
            <p>3. Envoyez-le sur Discord (salon inscriptions).</p>
            <p className="text-slate-400">
              Toute demande incomplète est ignorée. Aucun rappel.
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
                {data.links.discord ? "Rejoindre le Discord" : "Discord à annoncer"}
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Format exact à copier
            </p>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/80 p-4 text-xs text-slate-200">
              {registrationTemplate}
            </pre>
          </div>
        </div>
      </section>

      <section className="section-card space-y-4">
        <SectionHeader
          title="Ce que vous devez préparer"
          description="Arrivez prêts, la LFN n'est pas une ligue d'essai." 
        />
        <ul className="grid gap-3 text-sm text-slate-200 md:grid-cols-2">
          <li>5 joueurs confirmés et stables.</li>
          <li>Disponibilités claires pour chaque semaine.</li>
          <li>Responsable unique pour la communication.</li>
          <li>Respect du cadre compétitif et des sanctions.</li>
        </ul>
      </section>
    </div>
  );
}
