import "./globals.css";
import type { Metadata } from "next";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { lfnData } from "./lib/lfnData";

export const metadata: Metadata = {
  title: "LFN — Ligue Francophone Null’s Brawl",
  description:
    "La ligue compétitive francophone Null’s Brawl. Matchs, classements, stats et saisons en cours.",
  icons: {
    icon: "https://cdn.discordapp.com/attachments/1434252768633290952/1458825268193136870/1000319082-Photoroom.png?ex=69610c67&is=695fbae7&hm=0244369700a834c01aaa029ef2c98fc6c0a715522ea103cffe9a343b0b441c10&",
  },
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
        <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(234,179,8,0.25),_transparent_50%)]">
          <div className="pointer-events-none absolute -left-20 top-24 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl motion-spin" />
          <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl motion-drift" />
          <div className="pointer-events-none absolute bottom-[-120px] left-1/3 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl motion-spin" />
          <Header />
          <main className="relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
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
