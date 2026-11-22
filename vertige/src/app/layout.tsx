import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono, Six_Caps } from "next/font/google";
import { RevealObserver } from "@/components/layout/RevealObserver";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteNav } from "@/components/layout/SiteNav";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { TiltController } from "@/components/layout/TiltController";
import "./globals.css";

// Police d'affichage provisoire (logo, noms de paliers) en attendant la police définitive.
const display = Six_Caps({
  variable: "--font-six-caps",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const sans = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "VERTIGE — Du centime au milliard. Tout a un prix.",
    template: "%s · VERTIGE",
  },
  description:
    "L'encyclopédie visuelle de tout ce qui a un prix, classé du moins cher au plus cher : du grain de riz au PIB mondial, 19 ordres de grandeur sur une seule échelle.",
  applicationName: "VERTIGE",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "VERTIGE",
    title: "VERTIGE — Du centime au milliard. Tout a un prix.",
    description: "Du grain de riz au PIB mondial : 19 ordres de grandeur sur une seule échelle.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0B6BCB",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[70] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          Aller au contenu
        </a>
        <SiteNav />
        <main id="contenu">{children}</main>
        <SiteFooter />
        <SmoothScroll />
        <RevealObserver />
        <TiltController />
      </body>
    </html>
  );
}
