import "./globals.css";

export const metadata = {
  title: "ReturnDesk — Returns Desk",
  description: "Raise, review and resolve return requests.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-100 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
            <a href="/" className="text-lg font-bold tracking-tight">
              ReturnDesk
            </a>
            <nav className="flex items-center gap-3 text-sm">
              <a href="/" className="font-medium text-zinc-700 hover:text-black">
                Requests
              </a>
              <a
                href="/requests/new"
                className="rounded-full bg-black px-4 py-1.5 font-medium text-white hover:bg-zinc-800"
              >
                New request
              </a>
            </nav>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</div>
        <footer className="border-t border-zinc-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-3 text-xs text-zinc-500">
            ReturnDesk — single shared support desk (no login).
          </div>
        </footer>
      </body>
    </html>
  );
}
