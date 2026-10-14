import "./globals.css";
import { Suspense } from "react";
import { Fraunces, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import Sidebar from "./components/Sidebar";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const body = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const reff = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-reff",
  display: "swap",
});

export const metadata = {
  title: "ReturnDesk — Returns Desk",
  description: "Raise, review and resolve return requests.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${body.variable} ${reff.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
        <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
          <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:py-7">
            {children}
          </div>
          <footer className="mt-6 border-t border-[#ddd2b8] bg-cream/60">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-1 px-4 py-3 text-xs text-inksoft">
              <span>
                <span className="font-display font-semibold text-ink">ReturnDesk</span> —
                single shared support desk (no login).
              </span>
              <span className="font-ref text-[11px]">paper · pine · gold</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
