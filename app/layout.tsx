import "./globals.css";
import type { Metadata, Viewport } from "next";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { getSiteUser } from "../src/lib/auth/site-user";
import BackgroundFX from "./components/BackgroundFX";
import PageTransition from "./components/PageTransition";
import { getLocale } from "./lib/i18n";
import Script from "next/script"; // Importation pour Analytics

export const metadata: Metadata = {
  metadataBase: new URL("https://www.lfn-esports.fr"),
  title: {
    default: "LFN — Ligue francophone",
    template: "%s · LFN",
  },
  description:
    "LFN — Ligue francophone. Accès sur sélection, saisons encadrées, classement officiel.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/LogoLFN.webp", type: "image/webp" }
    ],
    shortcut: "/favicon.svg",
    apple: "/LogoLFN.webp",
  },
  // Embed Discord : juste la barre dorée (themeColor) + titre + sous-titre, aucune image
  openGraph: {
    title: "LFN : Null's Brawl Tournaments",
    description: "Powered By Prissme TV",
    type: "website",
    url: "https://www.lfn-esports.fr/",
  },
  twitter: {
    card: "summary",
    title: "LFN : Null's Brawl Tournaments",
    description: "Powered By Prissme TV",
  },
};

export const viewport: Viewport = {
  themeColor: "#E39F30",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getLocale();
  const siteUser = await getSiteUser();
  return (
    <html lang={locale}>
      <head>
        {/* Polices chargées côté navigateur (évite le fetch Google Fonts pendant le build) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@100..900&display=swap"
        />
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-7QKWJL07DZ"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-7QKWJL07DZ');
          `}
        </Script>
      </head>
      <body className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)]">
        <div className="relative min-h-screen overflow-hidden">
          <div className="site-background-layer" aria-hidden="true" />
          <BackgroundFX />
          <Header locale={locale} user={siteUser} />
          <main className="relative z-10">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer locale={locale} />
        </div>
      </body>
    </html>
  );
}
