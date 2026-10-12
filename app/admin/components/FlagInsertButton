"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { COUNTRIES } from "./CountrySearch";

const toFlag = (code: string) =>
  String.fromCodePoint(...Array.from(code.toUpperCase()).map((char) => 127397 + char.charCodeAt(0)));

type FlagInsertButtonProps = {
  /** Champ texte dans lequel insérer le drapeau (à la position du curseur) */
  textareaRef: RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (next: string) => void;
};

/** Bouton « Drapeau » : ouvre une liste de pays et insère l'emoji drapeau dans la description. */
export function FlagInsertButton({ textareaRef, value, onChange }: FlagInsertButtonProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? COUNTRIES.filter(
        (country) =>
          country.name.toLowerCase().includes(normalizedQuery) ||
          country.code.toLowerCase().includes(normalizedQuery)
      )
    : COUNTRIES;

  const insert = (code: string) => {
    const flag = toFlag(code);
    const element = textareaRef.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + flag + value.slice(end));
    setOpen(false);
    setQuery("");
    // Remet le curseur juste après le drapeau
    requestAnimationFrame(() => {
      element?.focus();
      const position = start + flag.length;
      element?.setSelectionRange(position, position);
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="surface-pill px-3 py-1 text-xs font-semibold text-white/80"
      >
        🏳️ Drapeau
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-md border border-white/10 bg-[#0e1620] shadow-xl">
          <div className="border-b border-white/10 p-2">
            <input
              autoFocus
              type="text"
              placeholder="Rechercher un pays…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded border border-white/10 bg-black/30 px-2 py-1 text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-white/30">Aucun résultat</li>
            ) : (
              filtered.map((country) => (
                <li key={country.code}>
                  <button
                    type="button"
                    onClick={() => insert(country.code)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-white/80 hover:bg-white/5"
                  >
                    <span>{toFlag(country.code)}</span>
                    <span>{country.name}</span>
                    <span className="ml-auto text-xs text-white/30">{country.code}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
