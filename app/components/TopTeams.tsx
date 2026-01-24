const teams = [
  { rank: "#01", name: "Nebula Vanguard", record: "BILAN 20-1" },
  { rank: "#01", name: "Arcadia Prime", record: "BILAN 20-1" },
  { rank: "#02", name: "Sabre Syndicate", record: "BILAN 20-1" },
  { rank: "#04", name: "Cryo Legion", record: "BILAN 20-1" },
];

export default function TopTeams() {
  return (
    <article className="section-card">
      <div className="flex items-center justify-between gap-4">
        <h2 className="section-title text-base">TOP ÉQUIPES</h2>
        <span className="top-teams-filter">BILAN 01</span>
      </div>
      <ul className="mt-5 space-y-3">
        {teams.map((team) => (
          <li key={`${team.rank}-${team.name}`} className="top-team-row">
            <div className="flex items-center gap-3">
              <span className="top-team-rank">{team.rank}</span>
              <div>
                <p className="text-sm uppercase tracking-[0.16em] text-[color:var(--color-text)]">
                  {team.name}
                </p>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-text-muted)]">
                  {team.record}
                </p>
              </div>
            </div>
            <span className="top-team-badge">BILAN</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
