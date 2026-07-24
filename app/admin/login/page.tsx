import { redirect } from "next/navigation";
import SectionHeader from "../../components/SectionHeader";
import AdminLoginForm from "../AdminLoginForm";
import { isAdminAuthenticated } from "../../../src/lib/admin/auth";

export default async function AdminLoginPage() {
  const isAdmin = await isAdminAuthenticated();

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
