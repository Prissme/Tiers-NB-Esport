import Button from "../components/Button";
import SectionHeader from "../components/SectionHeader";

const DISCORD_INVITE = "https://discord.gg/q6sFPWCKD7";

export default function InscriptionPage() {
  return (
    <div className="space-y-12">
      <section className="surface-dominant">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Inscription"
            title="Avant de rejoindre le Discord"
            description="Tu vas être redirigé vers notre serveur pour finaliser ton inscription et accéder aux infos officielles."
          />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="motion-card motion-shimmer">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">1. Accès</p>
              <p className="mt-3 text-sm text-white">Rejoins le serveur LFN.</p>
            </div>
            <div className="motion-card motion-shimmer">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">2. Lecture</p>
              <p className="mt-3 text-sm text-white">Prends connaissance des règles.</p>
            </div>
            <div className="motion-card motion-shimmer">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">3. Validation</p>
              <p className="mt-3 text-sm text-white">Confirme ton roster.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href={DISCORD_INVITE} variant="primary" external>
              Continuer vers Discord
            </Button>
            <Button href="/" variant="secondary">
              Retourner à l&apos;accueil
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
