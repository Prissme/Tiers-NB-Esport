const teams = [
  { name: "Nebula Vanguard", status: "12-1", rank: "#01" },
  { name: "Arcadia Prime", status: "10-3", rank: "#02" },
  { name: "Sable Syndicate", status: "9-4", rank: "#03" },
  { name: "Cryo Legion", status: "8-5", rank: "#04" },
];

export default function TopTeams() {
  return (
    <section className="glass-panel">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Top Teams</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Classement express</h3>
        </div>
        <span className="badge-pill">Semaine 03</span>
      </div>
      <div className="mt-6 space-y-4">
        {teams.map((team) => (
          <div
            key={team.name}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-[0.3em] text-cyan/80">
                {team.rank}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{team.name}</p>
                <p className="text-xs text-slate-400">Record {team.status}</p>
              </div>
            </div>
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Verified
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
