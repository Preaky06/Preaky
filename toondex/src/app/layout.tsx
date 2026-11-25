import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import { CardFx } from "@/components/CardFx";
import { Header } from "@/components/Header";
import "./globals.css";

// Archivo variable : graisse et largeur réglables (titres élargis façon affiche).
const display = Archivo({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ToonDex · Cartes de personnages de séries, anime et films",
    template: "%s · ToonDex",
  },
  description:
    "Un paquet de 5 cartes par jour. Les personnages de tes séries, anime et films, de la commune à la secrète en or.",
  applicationName: "ToonDex",
};

export const viewport: Viewport = {
  themeColor: "#17181C",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        <CardFx />
        <Header />
        <main id="contenu" className="site-main">
          {children}
        </main>
        <footer className="site-footer">
          <span className="logo-name">ToonDex</span>
          <p>
            Les personnages, leurs images et les œuvres appartiennent à leurs ayants droit. Images : TVMaze, AniList,
            Disney API (Fandom) et Wikipédia, source indiquée sur chaque fiche. Site non commercial. Les raretés sont
            des règles de jeu.
          </p>
        </footer>
      </body>
    </html>
  );
}
