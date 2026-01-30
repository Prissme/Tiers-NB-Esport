import "./globals.css";
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import Footer from "./components/Footer";
import Header from "./components/Header";
import BackgroundFX from "./components/BackgroundFX";
import PageTransition from "./components/PageTransition";
import { getLocale } from "./lib/i18n";

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
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
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
  const locale = getLocale();
  return (
    <html lang={locale} className={`${inter.variable} ${cormorant.variable}`}>
      <body className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)]">
        <div className="relative min-h-screen overflow-hidden">
          <BackgroundFX />
          <Header locale={locale} />
          <main className="relative z-10">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer locale={locale} />
        </div>
      </body>
    </html>
  );
}
