import type { Metadata, Viewport } from "next";
import { Inter, Unbounded } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";

const display = Unbounded({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  display: "swap",
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ToonDex · Collectionne tes séries et tes films",
    template: "%s · ToonDex",
  },
  description:
    "Un paquet de 5 cartes par jour. Séries, séries animées, anime et films : complète ta collection, carte après carte.",
  applicationName: "ToonDex",
};

export const viewport: Viewport = {
  themeColor: "#0E0E12",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        <div className="backdrop" aria-hidden="true" />
        <Header />
        <main id="contenu" className="site-main">
          {children}
        </main>
        <footer className="site-footer">
          <p>
            ToonDex · Les titres et les informations des œuvres (année, pays, genre) sont cités à titre
            d’information. Les visuels des cartes sont des créations originales : aucune affiche ni image
            officielle. Les raretés sont des règles de jeu.
          </p>
        </footer>
      </body>
    </html>
  );
}
