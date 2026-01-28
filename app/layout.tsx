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
    icon: "https://media.discordapp.net/attachments/1434252768633290952/1466080774112542762/image-Photoroom_10.png?ex=697b719f&is=697a201f&hm=c44af05e9f6a24a3462c0f0f85d19f7141bc84f5a2a1a8a03bd3a3b838c055f3&=&format=webp&quality=lossless&width=236&height=236",
    apple:
      "https://media.discordapp.net/attachments/1434252768633290952/1466080774112542762/image-Photoroom_10.png?ex=697b719f&is=697a201f&hm=c44af05e9f6a24a3462c0f0f85d19f7141bc84f5a2a1a8a03bd3a3b838c055f3&=&format=webp&quality=lossless&width=236&height=236",
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
