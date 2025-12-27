import "./globals.css";
import TopNav from "./components/TopNav";
import { meta } from "./lib/lfn-data";

export const metadata = {
  title: "LFN League",
  description: "LFN esports league hub for schedule, standings, and teams.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="relative min-h-screen bg-gradient-to-b from-midnight via-steel to-midnight">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_55%)]" />
          <div className="relative">
            <TopNav />
            <main className="mx-auto w-full max-w-6xl px-5 py-10">
              {children}
            </main>
            <footer className="border-t border-white/10">
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-frost md:flex-row md:items-center md:justify-between">
                <span>
                  © {meta.year} LFN League. All rights reserved.
                </span>
                <span>Season: {meta.seasonName}</span>
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
