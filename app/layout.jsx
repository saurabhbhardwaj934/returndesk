import "./globals.css";
import { Fraunces, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";

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
        <header className="bg-pine-950 text-[#f4efe4] shadow-[0_2px_20px_-8px_rgba(8,37,28,0.7)]">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <a href="/" className="group flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500 font-display text-xl font-bold text-pine-950 shadow-inner transition-transform group-hover:-rotate-6">
                R
              </span>
              <span className="leading-tight">
                <span className="block font-display text-lg font-semibold tracking-tight">
                  ReturnDesk
                </span>
                <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-[#b9c9bd]">
                  Returns desk
                </span>
              </span>
            </a>
            <nav className="flex items-center gap-2 text-sm sm:gap-3">
              <a
                href="/"
                className="rounded-full px-3 py-1.5 font-medium text-[#d9e4da] transition-colors hover:bg-white/10 hover:text-white"
              >
                Requests
              </a>
              <a
                href="/requests/new"
                className="rounded-full bg-gold-500 px-4 py-1.5 font-semibold text-pine-950 shadow transition-all hover:-translate-y-px hover:bg-[#d9ab4e]"
              >
                + New request
              </a>
            </nav>
          </div>
          <div className="h-[3px] bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600" />
        </header>
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
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
      </body>
    </html>
  );
}
