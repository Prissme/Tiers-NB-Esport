"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const logoInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleLogoFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Le fichier doit être une image.");
      return;
    }

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Impossible de charger l'image."));
        img.src = URL.createObjectURL(file);
      });

      const maxSize = 256;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Impossible de préparer le canvas.");
      }

      ctx.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(image.src);

      const dataUrl = await new Promise<string>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Impossible de convertir l'image."));
              return;
            }

            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("Impossible de lire l'image."));
            reader.readAsDataURL(blob);
          },
          "image/png",
          0.9
        );
      });

      setTeamForm((prev) => ({ ...prev, logo_url: dataUrl }));
      setStatusMessage("Logo importé. Sauvegarde requise.");
      setErrorMessage(null);
    } catch (error) {
      console.error("logo import error", error);
      setErrorMessage("Erreur lors de l'import du logo.");
    }
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
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Teams</p>
          <h3 className="text-xl font-semibold text-white">Identité & roster</h3>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="surface-card--flat space-y-3">
          <label className="text-sm text-white/70">Equipe</label>
          <select
            value={selectedTeamId ?? ""}
            onChange={(event) => setSelectedTeamId(event.target.value)}
            className="surface-input"
          >
            <option value="">Sélectionner</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          {selectedTeam ? (
            <div className="surface-card--flat text-xs text-white/70">
              <p>{selectedTeam.division ?? "Division"}</p>
              <p className="mt-1">{selectedTeam.tag ?? "TAG"}</p>
            </div>
          ) : null}
        </div>

        <div className="surface-card--soft md:col-span-2 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-white/70">
              Nom
              <input
                value={teamForm.name}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, name: event.target.value }))}
                className="surface-input"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Tag
              <input
                value={teamForm.tag}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, tag: event.target.value }))}
                className="surface-input"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Division
              <input
                value={teamForm.division}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, division: event.target.value }))}
                className="surface-input"
              />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              Logo URL
              <input
                value={teamForm.logo_url}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, logo_url: event.target.value }))}
                className="surface-input"
              />
            </label>
            <div className="space-y-2 text-sm text-white/70">
              Logo fichier
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleLogoFile(file);
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="surface-pill px-4 py-2 text-xs text-white/70"
                >
                  Choisir un logo
                </button>
                {teamForm.logo_url ? (
                  <img
                    src={teamForm.logo_url}
                    alt="Prévisualisation du logo"
                    className="h-12 w-12 rounded-full border border-white/10 object-cover"
                  />
                ) : (
                  <span className="text-xs text-white/40">Aucun logo</span>
                )}
              </div>
              <p className="text-xs text-white/40">
                L'image est redimensionnée à 256px max pour rester légère.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveTeam}
              className="surface-pill surface-pill--active px-5 py-2 text-sm font-semibold text-black"
            >
              Sauver
            </button>
          </div>
        </div>
      </div>

      <div className="surface-card--soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold text-white">Membres</h4>
            <p className="text-sm text-white/50">Table editable (titulaire, subs, coach).</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClearMembers}
              className="surface-pill px-4 py-2 text-xs text-white/70"
            >
              Effacer
            </button>
            <button
              onClick={handleSaveMembers}
              className="surface-pill surface-pill--active px-4 py-2 text-xs font-semibold text-black"
            >
              Sauver
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="surface-table text-sm text-white/80">
            <thead className="surface-table__header text-xs uppercase text-white/40">
              <tr>
                <th className="px-3 py-2 text-left">Slot</th>
                <th className="px-3 py-2 text-left">Pseudo</th>
                <th className="px-3 py-2 text-left">Mains</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Elite</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, index) => (
                <tr key={`${member.role}-${member.slot ?? "coach"}`} className="surface-table__row">
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
                      className="surface-input surface-input--compact"
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
                      className="surface-input surface-input--compact"
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
                      className="surface-input surface-input--compact"
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
        <div className="surface-alert surface-alert--success">
          {statusMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="surface-alert surface-alert--error">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
