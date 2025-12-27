import "./globals.css";
import type { Metadata } from "next";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { getLfnData } from "./lib/data-store";

export const metadata: Metadata = {
  title: "LFN — Saison 2",
  description: "Hub officiel LFN : inscriptions, règlement, calendrier et résultats.",
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
