import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import Starfield from "@/components/Starfield";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbmono" });
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: { default: "frieren", template: "%s · frieren" },
  description:
    "A self-hosted archive of one person's code — browse and clone everything, write nothing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${serif.variable}`}>
      <body className="relative min-h-screen">
        <Starfield />
        <header className="mx-auto flex max-w-5xl items-baseline justify-between px-6 pb-4 pt-6">
          <Link href="/" className="font-display text-2xl tracking-wide">
            <span className="text-frost">❄</span> frieren
          </Link>
          <span className="font-mono text-xs text-dim">a personal git archive</span>
        </header>
        <main className="mx-auto max-w-5xl px-6 pb-24 pt-6">{children}</main>
        <footer className="mx-auto max-w-5xl border-t border-line px-6 py-6 font-mono text-xs text-dim">
          one writer · world readers — served from the owner&apos;s own machine by{" "}
          <a
            href="https://github.com/justin06lee/frieren"
            className="text-fog hover:text-frost"
          >
            frieren
          </a>
        </footer>
      </body>
    </html>
  );
}
