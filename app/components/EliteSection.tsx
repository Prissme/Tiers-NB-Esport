import Button from "./Button";

export default function EliteSection() {
  return (
    <section id="elite" className="mt-12">
      <div className="motion-field flex flex-col gap-6 text-center sm:text-left md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--color-text-muted)]">
            Accès sur sélection
          </p>
          <h2 className="text-2xl font-semibold tracking-[0.08em] text-[color:var(--color-text)] sm:text-3xl">
            ELITE — Accès sur sélection
          </h2>
          <p className="text-sm text-[color:var(--color-text-muted)] sm:text-base">
            Accès encadré aux infos et au suivi de la ligue.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Button
            href="https://forms.gle/pmo6Z2mRLptYMR1J7"
            variant="secondary"
            external
            ariaLabel="Demander l'accès (nouvel onglet)"
          >
            Demander l&apos;accès
          </Button>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
            Validation manuelle • places limitées
          </p>
        </div>
      </div>
    </section>
  );
}
