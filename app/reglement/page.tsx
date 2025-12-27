import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";

export default async function ReglementPage() {
  const data = await getLfnData();

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          title="Règlement officiel"
          description="Cadre strict. Toute équipe inscrite accepte ces règles." 
        />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 text-sm text-slate-200">
            <p>Respect total des horaires annoncés.</p>
            <p>Présence obligatoire du capitaine pour chaque match.</p>
            <p>Communication proactive en cas d'imprévu.</p>
            <p>Sanctions progressives en cas de non-respect.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Version complète
            </p>
            <p className="mt-2">
              {data.links.rules
                ? "Le PDF officiel est disponible en ligne."
                : "Le PDF officiel est en préparation."}
            </p>
            {data.links.rules ? (
              <a
                href={data.links.rules}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-sm font-semibold text-emerald-300"
              >
                Consulter le règlement
              </a>
            ) : (
              <p className="mt-3 text-xs text-slate-400">
                Ajoutez un lien dans /admin dès publication.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="section-card space-y-4">
        <SectionHeader
          title="Points non négociables"
          description="La ligue protège le sérieux des participants." 
        />
        <ul className="grid gap-3 text-sm text-slate-200 md:grid-cols-2">
          <li>Rosters verrouillés avant la première journée.</li>
          <li>Forfaits et retards documentés et sanctionnés.</li>
          <li>Comportement respectueux envers les officiels.</li>
          <li>Matchs reportés uniquement sur validation staff.</li>
        </ul>
      </section>
    </div>
  );
}
