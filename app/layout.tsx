import "./globals.css";
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import Footer from "./components/Footer";
import Header from "./components/Header";

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
    <html lang="fr" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)]">
        <div className="relative min-h-screen overflow-hidden">
          <Header />
          <main className="relative z-10">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
