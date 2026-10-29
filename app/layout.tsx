import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/LocaleProvider";
import { copyFor } from "@/lib/copy";
import { requestLocale } from "@/lib/server/locale";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-fredoka" });
const nunito = Nunito({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-nunito" });

export async function generateMetadata(): Promise<Metadata> {
  const description = copyFor(await requestLocale()).meta.description;
  return {
    metadataBase: new URL("https://compa.lol"),
    title: "Compa",
    description,
    openGraph: { title: "Compa", description, url: "https://compa.lol", siteName: "Compa", type: "website" },
    twitter: { card: "summary_large_image", title: "Compa", description },
  };
}

export const viewport: Viewport = { themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF6E5" },
    { media: "(prefers-color-scheme: dark)", color: "#1E1B2E" },
  ], width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await requestLocale();
  return (
    <html lang={locale} className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="min-h-dvh">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
