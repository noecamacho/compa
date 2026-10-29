import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-fredoka" });
const nunito = Nunito({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-nunito" });

export const metadata: Metadata = {
  metadataBase: new URL("https://compa.lol"),
  title: "Compa",
  description: "Conecta en el evento. Recuérdalo después.",
  openGraph: { title: "Compa", description: "Conecta en el evento. Recuérdalo después.", url: "https://compa.lol", siteName: "Compa", type: "website" },
  twitter: { card: "summary_large_image", title: "Compa", description: "Conecta en el evento. Recuérdalo después." },
};

export const viewport: Viewport = { themeColor: "#FFF6E5", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
