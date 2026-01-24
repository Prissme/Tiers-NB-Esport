import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import SectionHeader from "../components/SectionHeader";
import AdminPanel from "./AdminPanel";
import { logout } from "./actions";

const ADMIN_COOKIE = "admin_session";

export default function AdminPage() {
  const isAdmin = cookies().get(ADMIN_COOKIE)?.value === "1";

  if (!isAdmin) {
    redirect("/admin/login");
  }

  return (
    <div className="space-y-10">
      <section className="motion-field p-8">
        <div className="motion-orb -left-16 top-10 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-2 top-4 h-52 w-52 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Admin"
            title="Console de gestion"
            description="Gestion des équipes et des matchs."
          />
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </section>

      <section className="section-card">
        <AdminPanel />
      </section>
    </div>
  );
}
