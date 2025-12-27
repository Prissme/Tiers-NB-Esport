"use client";

import { useState } from "react";
import { meta } from "../lib/lfn-data";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/rulebook", label: "Rulebook" },
  { href: "/schedule", label: "Schedule" },
  { href: "/teams", label: "Teams" },
  { href: "/standings", label: "Standings" },
  { href: meta.discordInviteUrl, label: "Join", external: true },
];

export default function TopNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-midnight/80 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl font-semibold">
            LFN
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-frost">
              League Frontier
            </p>
            <p className="text-lg font-semibold text-white">Network</p>
          </div>
        </div>
        <div className="hidden items-center gap-6 text-sm font-medium text-frost md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noreferrer" : undefined}
              className="transition hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-white/30 md:hidden"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </nav>
      {open ? (
        <div className="border-t border-white/10 bg-midnight/95 md:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-4 text-sm font-medium text-frost">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noreferrer" : undefined}
                className="rounded-xl border border-white/10 px-4 py-2 text-white"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
