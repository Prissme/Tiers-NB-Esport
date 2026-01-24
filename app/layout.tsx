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
    "LFN — The Elite League. Accès sur sélection, saisons longues, classement officiel.",
  icons: {
    icon: "https://media.discordapp.net/attachments/1434252768633290952/1464582944872992859/image-Photoroom_3.png?ex=6975fea8&is=6974ad28&hm=66eb253822f4e65bad50bbf733b22df75df4c5c4ae87c757b9506c420ac71dc7&=&format=webp&quality=lossless&width=692&height=692",
    apple:
      "https://media.discordapp.net/attachments/1434252768633290952/1464582944872992859/image-Photoroom_3.png?ex=6975fea8&is=6974ad28&hm=66eb253822f4e65bad50bbf733b22df75df4c5c4ae87c757b9506c420ac71dc7&=&format=webp&quality=lossless&width=692&height=692",
  },
  openGraph: {
    title: "LFN — The Elite League",
    description:
      "LFN — The Elite League. Accès sur sélection, saisons longues, classement officiel.",
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
      "LFN — The Elite League. Accès sur sélection, saisons longues, classement officiel.",
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
