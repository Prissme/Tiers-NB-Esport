import "./globals.css";
import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import BackgroundFX from "./components/BackgroundFX";
import Footer from "./components/Footer";
import Header from "./components/Header";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tiers-nb.koyeb.app"),
  title: {
    default: "LFN — The Elite League",
    template: "%s · LFN",
  },
  description:
    "LFN — The Elite League. Accès compétitif premium, saisons et classements.",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
  openGraph: {
    title: "LFN — The Elite League",
    description:
      "LFN — The Elite League. Accès compétitif premium, saisons et classements.",
    type: "website",
    url: "https://tiers-nb.koyeb.app/",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "LFN — The Elite League",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LFN — The Elite League",
    description:
      "LFN — The Elite League. Accès compétitif premium, saisons et classements.",
    images: ["/og-image.svg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${manrope.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-[#070a12] text-slate-100">
        <div className="relative min-h-screen overflow-hidden">
          <BackgroundFX />
          <Header />
          <main className="relative z-10">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
