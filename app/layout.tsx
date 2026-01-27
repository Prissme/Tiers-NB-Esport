import "./globals.css";
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import Footer from "./components/Footer";
import Header from "./components/Header";
import BackgroundFX from "./components/BackgroundFX";
import PageTransition from "./components/PageTransition";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tiers-nb.koyeb.app"),
  title: {
    default: "LFN — Ligue francophone",
    template: "%s · LFN",
  },
  description:
    "LFN — Ligue francophone. Accès sur sélection, saisons encadrées, classement officiel.",
  icons: {
    icon: "https://media.discordapp.net/attachments/1434252768633290952/1465789599056920798/image-Photoroom_9.png?ex=697a6271&is=697910f1&hm=e0990ddef7862a837e2984eecdecde04b6417c436bd5e522b7b09b27a346f18e&=&format=webp&quality=lossless&width=692&height=692",
    apple:
      "https://media.discordapp.net/attachments/1434252768633290952/1465789599056920798/image-Photoroom_9.png?ex=697a6271&is=697910f1&hm=e0990ddef7862a837e2984eecdecde04b6417c436bd5e522b7b09b27a346f18e&=&format=webp&quality=lossless&width=692&height=692",
  },
  openGraph: {
    title: "LFN — Ligue francophone",
    description:
      "LFN — Ligue francophone. Accès sur sélection, saisons encadrées, classement officiel.",
    type: "website",
    url: "https://tiers-nb.koyeb.app/",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "LFN — Ligue francophone",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LFN — Ligue francophone",
    description:
      "LFN — Ligue francophone. Accès sur sélection, saisons encadrées, classement officiel.",
    images: ["/og-image.svg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)]">
        <div className="relative min-h-screen overflow-hidden">
          <BackgroundFX />
          <Header />
          <main className="relative z-10">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
