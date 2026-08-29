import type { Metadata } from "next";
import { Poppins, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-code" });

export const metadata: Metadata = {
  title: { default: "frieren", template: "%s · frieren" },
  description:
    "A self-hosted git archive. Guests browse and clone the public repositories; the owner sees everything.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 md:px-6">{children}</main>
        <footer className="mt-8 border-t border-hair">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-6 text-xs text-mute md:px-6">
            <span className="text-faint">© frieren</span>
            <Link href="/" className="hover:text-link">
              Repositories
            </Link>
            <Link href="/settings" className="hover:text-link">
              Settings
            </Link>
            <a
              href="https://github.com/justin06lee/frieren"
              className="hover:text-link"
              target="_blank"
              rel="noreferrer"
            >
              Source
            </a>
            <span className="ml-auto text-faint">
              Self-hosted on the owner&apos;s own hardware
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
