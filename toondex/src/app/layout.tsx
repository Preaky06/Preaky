import type { Metadata, Viewport } from "next";
import { Rubik, Sigmar } from "next/font/google";
import { Header } from "@/components/Header";
import { Wobble } from "@/components/Wobble";
import "./globals.css";

const display = Sigmar({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
});

const sans = Rubik({
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
  themeColor: "#3B4CFF",
  colorScheme: "light",
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
        <Header />
        <main id="contenu" className="site-main">
          {children}
        </main>
        <footer className="site-footer">
          <Wobble text="ToonDex" className="site-footer__logo" />
          <p>
            Les titres et les informations des œuvres (année, pays, genre) sont cités à titre d’information. Les
            personnages et visuels des cartes sont des créations originales de ToonDex : aucun personnage, affiche
            ni image officielle. Les raretés sont des règles de jeu.
          </p>
        </footer>
      </body>
    </html>
  );
}
