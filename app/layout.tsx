import "./globals.css";
import type { Metadata } from "next";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { getLfnData } from "./lib/data-store";

export const metadata: Metadata = {
  title: "LFN League Hub",
  description: "Le hub officiel pour participer à la LFN.",
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
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
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
