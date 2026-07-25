import { redirect } from "next/navigation";
import PerformanceRatingForm from "./PerformanceRatingForm";
import BatchPasteForm from "./BatchPasteForm";
import { isAdminAuthenticated } from "../../../src/lib/admin/auth";

export default async function PerformanceRatingPage() {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    redirect("/admin/login");
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Note de performance — import Gemini (6 joueurs)</h1>
        <p className="text-sm text-neutral-400">
          Colle le JSON obtenu en soumettant le screenshot de fin de partie à Gemini. Ça remplit
          automatiquement les 6 joueurs et calcule leur note en un clic.
        </p>
        <div className="mt-4">
          <BatchPasteForm />
        </div>
      </div>

      <div className="border-t border-neutral-800 pt-8">
        <h2 className="text-xl font-semibold">Note de performance — joueur unique</h2>
        <p className="text-sm text-neutral-400">
          Calcule une note sur 10 à partir du K/D, du brawler joué et de la composition, en se basant
          sur les priorités réelles du bot de draft et les synergies communautaires enregistrées en base.
        </p>
        <div className="mt-4">
          <PerformanceRatingForm />
        </div>
      </div>
    </div>
  );
}
