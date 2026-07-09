import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PerformanceRatingForm from "./PerformanceRatingForm";

const ADMIN_COOKIE = "admin_session";

export default function PerformanceRatingPage() {
  const isAdmin = cookies().get(ADMIN_COOKIE)?.value === "1";
  if (!isAdmin) {
    redirect("/admin/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Note de performance</h1>
        <p className="text-sm text-neutral-400">
          Calcule une note sur 10 à partir du K/D, du brawler joué et de la composition, en se basant
          sur les priorités réelles du bot de draft et les synergies communautaires enregistrées en base.
        </p>
      </div>
      <PerformanceRatingForm />
    </div>
  );
}
