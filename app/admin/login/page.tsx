import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SectionHeader from "../../components/SectionHeader";
import AdminLoginForm from "../AdminLoginForm";

const ADMIN_COOKIE = "admin_session";

export default function AdminLoginPage() {
  const isAdmin = cookies().get(ADMIN_COOKIE)?.value === "1";

  if (isAdmin) {
    redirect("/admin");
  }

  return (
    <div className="space-y-10">
      <section className="motion-field p-8">
        <div className="motion-orb -left-12 top-10 h-48 w-48 motion-drift" />
        <div className="motion-orb motion-orb--blue right-2 top-4 h-52 w-52 motion-spin" />
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Admin"
            title="Connexion"
            description="Accès réservé aux administrateurs."
          />
          <div className="max-w-md">
            <AdminLoginForm />
          </div>
        </div>
      </section>
    </div>
  );
}
