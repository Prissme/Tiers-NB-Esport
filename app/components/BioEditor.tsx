"use client";

import { useState } from "react";
import { MessageIcon, PencilIcon } from "./icons";

type Props = {
  initialBio: string;
  isOwner: boolean;
  maxLength: number;
  labels: {
    title: string;
    empty: string;
    emptyOwner: string;
    edit: string;
    save: string;
    cancel: string;
    placeholder: string;
    error: string;
  };
};

export default function BioEditor({ initialBio, isOwner, maxLength, labels }: Props) {
  const [bio, setBio] = useState(initialBio);
  const [draft, setDraft] = useState(initialBio);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  // Rien à montrer aux visiteurs si le joueur n'a pas de bio
  if (!isOwner && !bio) return null;

  const save = async () => {
    setSaving(true);
    setError(false);
    try {
      const res = await fetch("/api/profile/bio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: draft }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { bio: string };
      setBio(data.bio);
      setDraft(data.bio);
      setEditing(false);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const btn =
    "rounded-[8px] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition disabled:opacity-60";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--color-text-faint)]">
          <MessageIcon className="h-4 w-4" />
          {labels.title}
        </h2>
        {isOwner && !editing ? (
          <button
            type="button"
            onClick={() => {
              setDraft(bio);
              setEditing(true);
            }}
            className="flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-[color:var(--color-text-faint)] transition hover:text-[color:var(--color-text)]"
          >
            <PencilIcon className="h-3.5 w-3.5" />
            {labels.edit}
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, maxLength))}
            maxLength={maxLength}
            rows={4}
            placeholder={labels.placeholder}
            className="w-full resize-y rounded-[10px] border border-[color:var(--color-border-soft)] bg-[rgba(255,255,255,0.03)] p-3 text-sm text-[color:var(--color-text)] outline-none focus:border-[color:var(--color-border)]"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-[color:var(--color-text-faint)]">
              {draft.length}/{maxLength}
            </span>
            <div className="flex items-center gap-2">
              {error ? <span className="text-xs text-red-400">{labels.error}</span> : null}
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError(false);
                }}
                disabled={saving}
                className={`${btn} bg-[rgba(255,255,255,0.04)] text-[color:var(--color-text-faint)] hover:text-[color:var(--color-text)]`}
              >
                {labels.cancel}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className={`${btn} bg-[color:var(--color-accent)] text-[#20180a] hover:bg-[color:var(--color-accent-deep)]`}
              >
                {labels.save}
              </button>
            </div>
          </div>
        </div>
      ) : bio ? (
        <p className="whitespace-pre-line break-words text-sm text-[color:var(--color-text-muted)]">{bio}</p>
      ) : (
        <p className="text-sm italic text-[color:var(--color-text-faint)]">{labels.emptyOwner}</p>
      )}
    </div>
  );
}
