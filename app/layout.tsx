import "./globals.css";
import type { Metadata } from "next";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { lfnData } from "./lib/lfnData";

export const metadata: Metadata = {
  title: "LFN — Ligue Francophone Null’s Brawl",
  description:
    "La ligue compétitive francophone Null’s Brawl. Matchs, classements, stats et saisons en cours.",
  openGraph: {
    title: "LFN — Ligue Francophone Null’s Brawl",
    description:
      "La ligue compétitive francophone Null’s Brawl. Matchs, classements, stats et saisons en cours.",
    type: "website",
    url: "https://tiers-nb.koyeb.app/",
    images: [
     {
       url: "https://media.discordapp.net/attachments/1434252768633290952/1455665343132336128/content.png?format=webp&quality=lossless&width=1200&height=630",
       width: 1200,
       height: 630,
       alt: "LFN — Ligue Francophone Null’s Brawl",
    },
   ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LFN — Ligue Francophone Null’s Brawl",
    description:
      "La ligue compétitive francophone Null’s Brawl. Matchs, classements et saisons en cours.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const discordInviteUrl = process.env.DISCORD_INVITE_URL;

  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_45%)]">
          <Header />
          <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
            {children}
          </main>
          <Footer
            seasonName={lfnData.name}
            administrationLabel={lfnData.organization.administrationLabel}
            discordInviteUrl={discordInviteUrl}
          />
        </div>
      </body>
    </html>
  );
}
