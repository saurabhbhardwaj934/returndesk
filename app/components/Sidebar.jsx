"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { STATUS_LABELS, STATUSES } from "../../lib/rules";

const DOT = {
  open: "bg-sky-400",
  in_review: "bg-amber-400",
  approved: "bg-violet-400",
  rejected: "bg-rose-400",
  completed: "bg-emerald-400",
};

function NavContent({ counts, onNavigate }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isNew = pathname === "/requests/new";
  const linkBase =
    "flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors";
  const idle = "text-[#c9d6cb] hover:bg-white/10 hover:text-white";
  const active = "bg-gold-500 font-semibold text-pine-950 shadow";
  return (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5 px-1 pt-1">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold-500 font-display text-2xl font-bold text-pine-950">
          R
        </span>
        <span className="leading-tight">
          <span className="block font-display text-xl font-semibold tracking-tight text-white">
            ReturnDesk
          </span>
          <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-[#8fa895]">
            Returns console
          </span>
        </span>
      </Link>

      <p className="mt-6 mb-1.5 px-3.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8fa895]">
        Overview
      </p>
      <nav className="grid gap-1">
        <Link href="/" onClick={onNavigate} className={linkBase + " " + (isHome ? active : idle)}>
          <span className="flex items-center gap-2.5">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>
            Dashboard
          </span>
          <span
            className={
              "rounded-full px-2 py-0.5 font-ref text-xs " +
              (isHome ? "bg-pine-950/15 text-pine-950" : "bg-white/10 text-[#d9e4da]")
            }
          >
            {counts.total}
          </span>
        </Link>
        <Link
          href="/requests/new"
          onClick={onNavigate}
          className={linkBase + " " + (isNew ? active : idle)}
        >
          <span className="flex items-center gap-2.5">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            New request
          </span>
        </Link>
      </nav>

      <p className="mt-6 mb-1.5 px-3.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8fa895]">
        By status
      </p>
      <nav className="grid gap-1">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={"/?status=" + s}
            onClick={onNavigate}
            className={linkBase + " " + idle}
          >
            <span className="flex items-center gap-2.5">
              <span className={"h-2 w-2 rounded-full " + (DOT[s] || "bg-stone-400")} />
              {STATUS_LABELS[s]}
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 font-ref text-xs text-[#d9e4da]">
              {counts.byStatus[s] || 0}
            </span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl bg-white/5 p-3.5 text-xs leading-relaxed text-[#a9bfae]">
        <p className="font-bold text-[#d9e4da]">Desk rule</p>
        <p className="mt-0.5">Rejected &amp; Completed are final — no moves from there.</p>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState({ total: "–", byStatus: {} });

  useEffect(() => {
    let alive = true;
    fetch("/api/returns/summary")
      .then((r) => r.json())
      .then((b) => {
        if (alive && typeof b.total === "number") {
          setCounts({ total: b.total, byStatus: b.byStatus || {} });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      {/* Mobile topbar */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-pine-950 px-4 py-2.5 text-white lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500 font-display text-lg font-bold text-pine-950">
            R
          </span>
          <span className="font-display text-lg font-semibold">ReturnDesk</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/requests/new"
            className="rounded-full bg-gold-500 px-3.5 py-1.5 text-[13px] font-bold text-pine-950"
          >
            + New
          </Link>
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 hover:bg-white/10"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={
          "fixed inset-0 z-40 transition-opacity lg:hidden " +
          (open ? "opacity-100" : "pointer-events-none opacity-0")
        }
      >
        <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
        <aside
          className={
            "absolute top-0 left-0 h-full w-72 bg-pine-950 p-4 shadow-2xl transition-transform duration-200 " +
            (open ? "translate-x-0" : "-translate-x-full")
          }
        >
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute top-3 right-3 rounded-lg p-2 text-[#c9d6cb] hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
          <NavContent counts={counts} onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-pine-950 p-4 lg:block">
        <div className="h-[3px] rounded-full bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600" />
        <div className="mt-3 h-[calc(100%-15px)]">
          <NavContent counts={counts} onNavigate={() => {}} />
        </div>
      </aside>
    </>
  );
}
