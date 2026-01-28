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
      <section className="surface-dominant">
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
