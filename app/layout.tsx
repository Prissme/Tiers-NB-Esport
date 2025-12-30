import "./globals.css";
import type { Metadata } from "next";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { getLfnData } from "./lib/data-store";

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
        url: "<img src="https://media.discordapp.net/attachments/1434252768633290952/1455665343132336128/content.png?ex=69558d7e&amp;is=69543bfe&amp;hm=7acc1044006e3f2c5da48d6428c3ea1e37a575a98d54ca56a2b7de6bcd5012a0&amp;=&amp;format=webp&amp;quality=lossless&amp;width=771&amp;height=514" alt="Image"/>",
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getLfnData();

  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_45%)]">
          <Header links={data.links} />
          <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
            {children}
          </main>
          <Footer links={data.links} seasonName={data.season.name} />
        </div>
      </body>
    </html>
  );
}
