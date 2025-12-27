import "./globals.css";

export const metadata = {
  title: "LFN League",
  description: "LFN esports league hub for schedule, standings, and teams.",
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/rulebook", label: "Rulebook" },
  { href: "/schedule", label: "Schedule" },
  { href: "/standings", label: "Standings" },
  { href: "/teams", label: "Teams" },
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="relative min-h-screen bg-gradient-to-b from-midnight via-steel to-midnight">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_55%)]" />
          <div className="relative">
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
                <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-frost md:gap-6">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="transition hover:text-white"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </nav>
            </header>
            <main className="mx-auto w-full max-w-6xl px-5 py-10">
              {children}
            </main>
            <footer className="border-t border-white/10">
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-frost md:flex-row md:items-center md:justify-between">
                <span>© 2025 LFN League. All rights reserved.</span>
                <span>Broadcast: Fridays 8:00 PM ET</span>
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
