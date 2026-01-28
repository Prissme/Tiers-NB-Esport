import Button from "../components/Button";
import DiscordIcon from "../components/DiscordIcon";
import SectionHeader from "../components/SectionHeader";

const DISCORD_INVITE = "https://discord.gg/q6sFPWCKD7";

export default function InscriptionPage() {
  return (
    <div className="page-stack">
      <section className="surface-dominant dominant-section">
        <div className="relative z-10 space-y-6">
          <SectionHeader
            kicker="Inscription"
            title={
              <span className="flex items-center justify-center gap-2">
                Avant de rejoindre <DiscordIcon />
              </span>
            }
            description="Tu vas être redirigé vers notre serveur pour finaliser ton inscription et accéder aux infos officielles."
            tone="dominant"
          />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="motion-card motion-shimmer">
              <p className="text-xs uppercase tracking-[0.35em] text-utility">1. Accès</p>
              <p className="mt-3 text-sm text-white">Rejoins le serveur officiel.</p>
            </div>
            <div className="motion-card motion-shimmer">
              <p className="text-xs uppercase tracking-[0.35em] text-utility">2. Lecture</p>
              <p className="mt-3 text-sm text-white">Prends connaissance des règles.</p>
            </div>
            <div className="motion-card motion-shimmer">
              <p className="text-xs uppercase tracking-[0.35em] text-utility">3. Validation</p>
              <p className="mt-3 text-sm text-white">Confirme ton roster.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href={DISCORD_INVITE} variant="primary" external>
              <span className="flex items-center gap-2">
                Continuer <DiscordIcon />
              </span>
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
