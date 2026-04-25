"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../../lib/supabaseClient";
import MatchFormDialog from "./MatchForm";
import TeamFormDialog from "./TeamForm";
import PlayerFormDialog from "./PlayerForm";
import SeasonFormDialog from "./SeasonForm";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("matches");
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideFinished, setHideFinished] = useState(true);

  // Dialogs
  const [matchFormOpen, setMatchFormOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [teamFormOpen, setTeamFormOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [playerFormOpen, setPlayerFormOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    const [m, t, p] = await Promise.all([
      supabase.from("lfn_matches").select("*, team_a:team_a_id(name), team_b:team_b_id(name)").order("scheduled_at", { ascending: true }),
      supabase.from("lfn_teams").select("*").order("name"),
      supabase.from("lfn_players").select("*").order("rating", { ascending: false })
    ]);
    if (m.data) setMatches(m.data);
    if (t.data) setTeams(t.data);
    if (p.data) setPlayers(p.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredMatches = useMemo(() => {
    let list = [...matches];
    if (hideFinished) list = list.filter(m => m.status !== "finished");
    return list.sort((a, b) => (a.status === "live" ? -1 : 1));
  }, [matches, hideFinished]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-amber-400 font-black animate-pulse">LFN ADMIN LOADING...</div>;

  return (
    <div className="min-h-screen bg-black text-slate-200 p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-8 flex flex-wrap items-center justify-between gap-6">
        <h1 className="text-3xl font-black text-white italic tracking-tighter">LFN PANEL <span className="text-amber-400">PRO</span></h1>
        <nav className="flex gap-2 bg-white/5 p-1 rounded-full border border-white/10">
          {["matches", "teams", "players"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition ${activeTab === tab ? "bg-amber-400 text-black" : "hover:bg-white/5"}`}>
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* --- SECTION MATCHS (DYNAMIQUE) --- */}
        {activeTab === "matches" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/10">
              <button onClick={() => setHideFinished(!hideFinished)} className={`px-4 py-2 rounded-full text-[10px] font-black ${hideFinished ? "bg-amber-400 text-black" : "bg-slate-800"}`}>
                {hideFinished ? "👁️ VOIR TOUT" : "🚫 MASQUER FINIS"}
              </button>
              <button onClick={() => { setSelectedMatch(null); setMatchFormOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-full text-[10px] font-black">+ NOUVEAU MATCH</button>
            </div>
            <div className="grid gap-2">
              {filteredMatches.map((match) => (
                <div key={match.id} className={`flex items-center justify-between p-4 rounded-xl border ${match.status === "live" ? "bg-red-500/10 border-red-500/50" : "bg-white/5 border-white/5"}`}>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-slate-500">{new Date(match.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <div className="text-sm font-bold flex items-center gap-2">
                      <span className={match.score_a > match.score_b ? "text-amber-400" : ""}>{match.team_a?.name}</span>
                      <span className="bg-slate-800 px-2 rounded text-xs">{match.score_a ?? 0} - {match.score_b ?? 0}</span>
                      <span className={match.score_b > match.score_a ? "text-amber-400" : ""}>{match.team_b?.name}</span>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedMatch(match); setMatchFormOpen(true); }}>✏️</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- SECTION TEAMS (TON STYLE PARFAIT) --- */}
        {activeTab === "teams" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button onClick={() => { setSelectedTeam(null); setTeamFormOpen(true); }} className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center hover:bg-white/5 transition">
              <span className="text-3xl text-amber-400">+</span>
              <span className="text-[10px] font-black uppercase mt-2">Add Team</span>
            </button>
            {teams.map(team => (
              <div key={team.id} className="bg-slate-900/80 border border-white/10 rounded-xl p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-black rounded-full mb-4 flex items-center justify-center text-2xl shadow-xl">🛡️</div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">{team.name}</h3>
                <span className="text-[9px] text-amber-400 font-black mt-2 px-2 py-0.5 bg-amber-400/10 rounded tracking-widest uppercase">{team.division || "Division 1"}</span>
                <button onClick={() => { setSelectedTeam(team); setTeamFormOpen(true); }} className="mt-4 text-[10px] font-black text-slate-500 hover:text-white uppercase transition">Paramètres</button>
              </div>
            ))}
          </div>
        )}

        {/* --- SECTION PLAYERS (CLASSEMENT) --- */}
        {activeTab === "players" && (
          <div className="bg-slate-900/50 rounded-xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xs font-black uppercase tracking-widest text-amber-400">Classement Top Joueurs</h2>
              <button onClick={() => { setSelectedPlayer(null); setPlayerFormOpen(true); }} className="text-[10px] font-black bg-white text-black px-3 py-1 rounded-full">+ AJOUTER</button>
            </div>
            <div className="divide-y divide-white/5">
              {players.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-slate-600 w-4">{index + 1}</span>
                    <span className="text-sm font-bold text-white">{player.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{player.tag}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-amber-400">{player.rating || 0} pts</p>
                      <p className="text-[8px] text-slate-600 uppercase">Score Global</p>
                    </div>
                    <button onClick={() => { setSelectedPlayer(player); setPlayerFormOpen(true); }}>⚙️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* DIALOGS */}
      <MatchFormDialog open={matchFormOpen} onOpenChange={setMatchFormOpen} onSaved={fetchData} teams={teams} initialValues={selectedMatch} />
      <TeamFormDialog open={teamFormOpen} onOpenChange={setTeamFormOpen} onSaved={fetchData} initialValues={selectedTeam} />
      <PlayerFormDialog open={playerFormOpen} onOpenChange={setPlayerFormOpen} onSaved={fetchData} teams={teams} initialValues={selectedPlayer} />
    </div>
  );
}
