const teams = [
  { name: "Aegis Union", status: "12-1", rank: "01", verified: true },
  { name: "Valon District", status: "10-3", rank: "02", verified: true },
  { name: "Noctis Council", status: "9-4", rank: "03", verified: false },
  { name: "Vesper Field", status: "8-5", rank: "04", verified: false },
];

export default function TopTeams() {
  return (
    <section className="ranking-panel">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--color-text-muted)]">
            Classement
          </p>
          <h3 className="section-title mt-2 text-lg">Registre officiel</h3>
          <p className="mt-2 text-xs uppercase tracking-[0.32em] text-[color:var(--color-text-muted)]">
            Le classement exclut plus qu&apos;il ne récompense.
          </p>
        </div>
        <span className="tag-verified">Semaine 03</span>
      </div>
      <div className="mt-6 overflow-hidden">
        <table className="ranking-table">
          <thead>
            <tr>
              <th>Rang</th>
              <th>Équipe</th>
              <th>Record</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.name} className="ranking-row">
                <td className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-accent)]">
                  #{team.rank}
                </td>
                <td className="text-sm">{team.name}</td>
                <td className="text-sm text-[color:var(--color-text-muted)]">{team.status}</td>
                <td>
                  {team.verified ? (
                    <span className="tag-verified">VERIFIED</span>
                  ) : (
                    <span className="tag-review">EN REVUE</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
