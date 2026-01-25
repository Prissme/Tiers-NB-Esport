"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const rosterSlots = [
  { role: "starter", slot: 1, label: "Titulaire 1" },
  { role: "starter", slot: 2, label: "Titulaire 2" },
  { role: "starter", slot: 3, label: "Titulaire 3" },
  { role: "sub", slot: 1, label: "Sub 1" },
  { role: "sub", slot: 2, label: "Sub 2" },
  { role: "sub", slot: 3, label: "Sub 3" },
  { role: "coach", slot: null, label: "Coach" },
];

type Team = {
  id: string;
  name: string;
  tag: string | null;
  division: string | null;
  logo_url: string | null;
  bio?: string | null;
  mains?: string | null;
};

type TeamMember = {
  id?: string;
  team_id: string;
  role: string;
  slot: number | null;
  pseudo: string;
  mains: string | null;
  description: string | null;
  elite: boolean | null;
};

const buildRosterTemplate = (teamId: string) =>
  rosterSlots.map((slot) => ({
    team_id: teamId,
    role: slot.role,
    slot: slot.slot,
    pseudo: "",
    mains: "",
    description: "",
    elite: false,
  }));

export default function TeamsPanel() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: "",
    tag: "",
    division: "",
    logo_url: "",
    bio: "",
    mains: "",
  });
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [teams, selectedTeamId]
  );

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from("lfn_teams")
      .select("id,name,tag,division,logo_url")
      .order("name", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setTeams((data ?? []) as Team[]);
    if (!selectedTeamId && data?.[0]) {
      setSelectedTeamId(data[0].id);
    }
  };

  const fetchMembers = async (teamId: string) => {
    const { data, error } = await supabase
      .from("lfn_team_members")
      .select("id,team_id,role,slot,pseudo,mains,description,elite")
      .eq("team_id", teamId)
      .order("role", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const template = buildRosterTemplate(teamId);
    const merged = template.map((slot) => {
      const existing = (data ?? []).find(
        (member) => member.role === slot.role && (member.slot ?? null) === (slot.slot ?? null)
      );
      return {
        ...slot,
        ...existing,
        pseudo: existing?.pseudo ?? "",
        mains: existing?.mains ?? "",
        description: existing?.description ?? "",
        elite: existing?.elite ?? false,
      };
    });

    setMembers(merged);
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (!selectedTeamId) {
      return;
    }
    const team = teams.find((item) => item.id === selectedTeamId);
    if (team) {
      setTeamForm({
        name: team.name ?? "",
        tag: team.tag ?? "",
        division: team.division ?? "",
        logo_url: team.logo_url ?? "",
        bio: team.bio ?? "",
        mains: team.mains ?? "",
      });
    }
    fetchMembers(selectedTeamId);
  }, [selectedTeamId, teams]);

  const handleSaveTeam = async () => {
    if (!selectedTeamId) {
      return;
    }
    setStatusMessage(null);
    setErrorMessage(null);

    const { error } = await supabase
      .from("lfn_teams")
      .update({
        name: teamForm.name,
        tag: teamForm.tag || null,
        division: teamForm.division || null,
        logo_url: teamForm.logo_url || null,
      })
      .eq("id", selectedTeamId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStatusMessage("Equipe mise à jour.");
    fetchTeams();
  };

  const handleSaveMembers = async () => {
    if (!selectedTeamId) {
      return;
    }
    setStatusMessage(null);
    setErrorMessage(null);

    const payload = members.map((member) => ({
      id: member.id,
      team_id: selectedTeamId,
      role: member.role,
      slot: member.slot,
      pseudo: member.pseudo,
      mains: member.mains || null,
      description: member.description || null,
      elite: member.elite ?? false,
    }));

    const { error } = await supabase.from("lfn_team_members").upsert(payload);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStatusMessage("Membres sauvegardés.");
    fetchMembers(selectedTeamId);
  };

  const handleClearMembers = async () => {
    if (!selectedTeamId) {
      return;
    }
    setStatusMessage(null);
    setErrorMessage(null);

    const { error } = await supabase.from("lfn_team_members").delete().eq("team_id", selectedTeamId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMembers(buildRosterTemplate(selectedTeamId));
    setStatusMessage("Membres effacés.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">Teams</p>
          <h3 className="text-xl font-semibold text-white">Identité & roster</h3>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
          <label className="text-sm text-white/70">Equipe</label>
          <select
            value={selectedTeamId ?? ""}
            onChange={(event) => setSelectedTeamId(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
          >
            <option value="">Sélectionner</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          {selectedTeam ? (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3 text-xs text-white/70">
              <p>{selectedTeam.division ?? "Division"}</p>
              <p className="mt-1">{selectedTeam.tag ?? "TAG"}</p>
            </div>
          ) : null}
        </div>

        <div className="md:col-span-2 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-white/70">
              Nom
              <input
                value={teamForm.name}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Tag
              <input
                value={teamForm.tag}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, tag: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Division
              <input
                value={teamForm.division}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, division: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Logo URL
              <input
                value={teamForm.logo_url}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, logo_url: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveTeam}
              className="rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-black hover:bg-amber-300"
            >
              Sauver
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold text-white">Membres</h4>
            <p className="text-sm text-white/50">Table editable (titulaire, subs, coach).</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClearMembers}
              className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/70"
            >
              Effacer
            </button>
            <button
              onClick={handleSaveMembers}
              className="rounded-full bg-amber-400 px-4 py-2 text-xs font-semibold text-black"
            >
              Sauver
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm text-white/80">
            <thead className="text-xs uppercase text-white/40">
              <tr className="border-b border-white/10">
                <th className="px-3 py-2 text-left">Slot</th>
                <th className="px-3 py-2 text-left">Pseudo</th>
                <th className="px-3 py-2 text-left">Mains</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Elite</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, index) => (
                <tr key={`${member.role}-${member.slot ?? "coach"}`} className="border-b border-white/5">
                  <td className="px-3 py-2 text-white/70">
                    {rosterSlots[index]?.label ?? member.role}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={member.pseudo}
                      onChange={(event) =>
                        setMembers((prev) => {
                          const updated = [...prev];
                          updated[index] = { ...updated[index], pseudo: event.target.value };
                          return updated;
                        })
                      }
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm text-white"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={member.mains ?? ""}
                      onChange={(event) =>
                        setMembers((prev) => {
                          const updated = [...prev];
                          updated[index] = { ...updated[index], mains: event.target.value };
                          return updated;
                        })
                      }
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm text-white"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={member.description ?? ""}
                      onChange={(event) =>
                        setMembers((prev) => {
                          const updated = [...prev];
                          updated[index] = { ...updated[index], description: event.target.value };
                          return updated;
                        })
                      }
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm text-white"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={member.elite ?? false}
                      onChange={(event) =>
                        setMembers((prev) => {
                          const updated = [...prev];
                          updated[index] = { ...updated[index], elite: event.target.checked };
                          return updated;
                        })
                      }
                      className="h-4 w-4 rounded border-white/20 bg-black/30"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {statusMessage ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
          {statusMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
