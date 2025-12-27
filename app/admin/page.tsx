import SectionHeader from "../components/SectionHeader";
import { getLfnData } from "../lib/data-store";
import { isAuthenticated, logout } from "./actions";
import AdminLoginForm from "./AdminLoginForm";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authenticated = isAuthenticated();

  return (
    <div className="space-y-10">
      <section className="section-card space-y-6">
        <SectionHeader
          title="Espace admin"
          description="Accès protégé pour mettre à jour les données officielles." 
        />
        {authenticated ? (
          <div className="space-y-6">
            <form action={logout}>
              <button
                type="submit"
                className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
              >
                Se déconnecter
              </button>
            </form>
            <AdminPanel initialData={await getLfnData()} />
          </div>
        ) : (
          <AdminLoginForm />
        )}
      </section>
    </div>
  );
}
