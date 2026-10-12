import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { appUrl } from "@/lib/env";
import "./globals.css";

const instrument = localFont({
  src: [
    { path: "../fonts/instrument-serif-latin-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/instrument-serif-latin-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument",
  display: "swap",
});

const hanken = localFont({
  src: "../fonts/hanken-grotesk-latin-wght-normal.woff2",
  variable: "--font-hanken",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Confiança Assessoria Acadêmica — orientação, revisão e normalização",
    template: "%s | Confiança Assessoria Acadêmica",
  },
  description:
    "Orientação, revisão e suporte acadêmico para você desenvolver seu trabalho com mais segurança e organização.",
  applicationName: "Confiança Assessoria Acadêmica",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Confiança Assessoria Acadêmica",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0B5139",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${instrument.variable} ${hanken.variable}`}>
      <body className="min-h-dvh">
        {children}
        {process.env.NODE_ENV === "development" && (
          <style>{`#devtools-indicator,[data-nextjs-toast]{display:none!important}`}</style>
        )}
      </body>
    </html>
  );
}
