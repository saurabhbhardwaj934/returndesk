"use client";

import { useEffect, useState } from "react";
import { STATUS_LABELS, REASONS, STATUSES } from "../lib/rules";

const STATUS_PILL = {
  open: "bg-sky-100 text-sky-900",
  in_review: "bg-amber-100 text-amber-900",
  approved: "bg-violet-100 text-violet-900",
  rejected: "bg-rose-100 text-rose-900",
  completed: "bg-emerald-100 text-emerald-900",
};

const STATUS_DOT = {
  open: "bg-sky-500",
  in_review: "bg-amber-500",
  approved: "bg-violet-500",
  rejected: "bg-rose-500",
  completed: "bg-emerald-600",
};

function Pill({ status }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap " +
        (STATUS_PILL[status] || "bg-stone-200 text-stone-700")
      }
    >
      <span
        className={"h-1.5 w-1.5 rounded-full " + (STATUS_DOT[status] || "bg-stone-400")}
      />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function fmtDate(s) {
  try {
    return new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return s;
  }
}

export default function ListPage() {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [reason, setReason] = useState("all");
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search har keystroke par request NAHI bhejta — 350ms debounce.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(input.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      const q = new URLSearchParams({
        search,
        status,
        reason,
        sort,
        order,
        page: String(page),
        pageSize: "10",
      });
      try {
        const res = await fetch("/api/returns?" + q.toString());
        const body = await res.json();
        if (!alive) return;
        if (!res.ok) {
          setError((body.error && body.error.message) || "List load nahi hui.");
          setRows([]);
          setTotal(0);
          setTotalPages(0);
          return;
        }
        setRows(body.data || []);
        setTotal(body.total || 0);
        setTotalPages(body.totalPages || 0);
      } catch {
        if (alive) {
          setError("Network issue hai. Retry karo.");
          setRows([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [search, status, reason, sort, order, page]);

  return (
    <div>
      {/* Page head */}
      <div className="rise mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold-600">
            Support desk
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Return requests
          </h1>
          <p className="mt-1.5 text-sm text-inksoft">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d8cfb8] bg-cream px-2.5 py-0.5 font-semibold text-ink">
              {total} requests
            </span>
          </p>
        </div>
        <a
          href="/requests/new"
          className="rounded-full bg-pine-900 px-5 py-2.5 text-sm font-semibold text-cream shadow-[0_8px_20px_-8px_rgba(12,53,39,0.7)] transition-all hover:-translate-y-px hover:bg-pine-800"
        >
          + New request
        </a>
      </div>

      {/* Filter panel */}
      <div
        className="rise mb-4 rounded-2xl border border-[#ddd2b8] bg-cream p-3 shadow-[0_10px_30px_-20px_rgba(28,23,16,0.4)] sm:p-4"
        style={{ animationDelay: "60ms" }}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          <label className="relative block sm:col-span-2 lg:col-span-1">
            <svg
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#a89d83]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search customer, order, reference…"
              className="field pr-8 pl-9"
            />
            {input && (
              <button
                onClick={() => setInput("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full px-1 text-sm leading-none text-[#a89d83] hover:text-ink"
              >
                ×
              </button>
            )}
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="field cursor-pointer"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setPage(1);
            }}
            className="field cursor-pointer"
          >
            <option value="all">All reasons</option>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="field cursor-pointer"
            >
              <option value="created_at">Newest first</option>
              <option value="updated_at">Recently updated</option>
              <option value="customer_name">Customer A–Z</option>
              <option value="order_number">Order no.</option>
              <option value="reference">Reference</option>
            </select>
            <button
              onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
              className="shrink-0 rounded-xl border border-[#d8cfb8] bg-[#fffdf8] px-3.5 text-base transition-colors hover:border-pine-700 hover:text-pine-800"
              title="Sort order badlo"
            >
              {order === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
        {(search || status !== "all" || reason !== "all") && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-inksoft">Active:</span>
            {search && (
              <span className="rounded-full bg-pine-100 px-2 py-0.5 font-semibold text-pine-900">
                “{search}”
              </span>
            )}
            {status !== "all" && (
              <span className="rounded-full bg-pine-100 px-2 py-0.5 font-semibold text-pine-900">
                {STATUS_LABELS[status]}
              </span>
            )}
            {reason !== "all" && (
              <span className="rounded-full bg-pine-100 px-2 py-0.5 font-semibold text-pine-900">
                {reason}
              </span>
            )}
            <button
              onClick={() => {
                setInput("");
                setSearch("");
                setStatus("all");
                setReason("all");
                setPage(1);
              }}
              className="font-semibold text-gold-600 underline hover:text-ink"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div
          className="rise overflow-hidden rounded-2xl border border-[#ddd2b8] bg-cream p-4"
          style={{ animationDelay: "120ms" }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 border-b border-[#eee5cf] py-3 last:border-0">
              <div className="shimmer h-5 w-24 rounded-full" />
              <div className="shimmer h-5 flex-1 rounded-lg" />
              <div className="shimmer hidden h-5 w-20 rounded-full sm:block" />
            </div>
          ))}
          <p className="pt-1 text-xs text-inksoft">Loading requests…</p>
        </div>
      )}

      {!loading && error && (
        <div className="rise rounded-2xl border border-rose-300 bg-[#fdf0f0] p-5 text-sm text-rose-900">
          <p className="font-display text-lg font-semibold">Kuch gadbad hui</p>
          <p className="mt-1">{error}</p>
          <button
            className="mt-3 rounded-full bg-rose-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-rose-800"
            onClick={() => {
              setPage(1);
              setSearch(input.trim());
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="rise rounded-2xl border border-dashed border-[#c9bb97] bg-cream p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-100 font-display text-2xl text-gold-600">
            ?
          </div>
          <p className="mt-3 font-display text-xl font-semibold">Koi request nahi mili.</p>
          <p className="mt-1 text-sm text-inksoft">
            Search ya filter badal kar dekho, ya nayi request banao.
          </p>
          <a
            href="/requests/new"
            className="mt-4 inline-block rounded-full bg-pine-900 px-5 py-2 text-sm font-semibold text-cream hover:bg-pine-800"
          >
            + New request
          </a>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="rise" style={{ animationDelay: "120ms" }}>
          {/* Desktop table */}
          <div className="nice-scroll hidden overflow-x-auto rounded-2xl border border-[#ddd2b8] bg-cream shadow-[0_10px_30px_-20px_rgba(28,23,16,0.4)] md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#ddd2b8] bg-[#f1e9d5] text-[11px] font-bold uppercase tracking-[0.14em] text-inksoft">
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Order / Item</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.id}
                    className="rise border-b border-[#eee5cf] transition-colors last:border-0 hover:bg-[#f7f1e2]"
                    style={{ animationDelay: Math.min(i, 9) * 45 + "ms" }}
                  >
                    <td className="px-4 py-3">
                      <a
                        href={"/requests/" + r.reference}
                        className="font-ref text-[13px] font-semibold text-pine-800 hover:text-pine-700 hover:underline"
                      >
                        {r.reference}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{r.customer_name}</div>
                      <div className="text-xs text-inksoft">{r.customer_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-ref text-xs text-ink">{r.order_number}</div>
                      <div className="text-xs text-inksoft">
                        {r.item_name} × {r.quantity}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-md bg-[#f1e9d5] px-2 py-0.5 text-xs font-medium">
                        {r.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Pill status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-inksoft">
                      {fmtDate(r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards (375px friendly) */}
          <div className="grid gap-2.5 md:hidden">
            {rows.map((r, i) => (
              <a
                key={r.id}
                href={"/requests/" + r.reference}
                className="rise lift block rounded-2xl border border-[#ddd2b8] bg-cream p-3.5"
                style={{ animationDelay: Math.min(i, 9) * 45 + "ms" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-ref text-[13px] font-semibold text-pine-800">
                    {r.reference}
                  </span>
                  <Pill status={r.status} />
                </div>
                <div className="mt-1.5 font-display text-base font-semibold">
                  {r.customer_name}
                </div>
                <div className="font-ref text-xs text-inksoft">
                  {r.order_number} · {r.item_name} × {r.quantity}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-inksoft">
                  <span className="rounded-md bg-[#f1e9d5] px-1.5 py-0.5 font-medium">
                    {r.reason}
                  </span>
                  <span>{fmtDate(r.created_at)}</span>
                </div>
              </a>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-full border border-[#d8cfb8] bg-cream px-4 py-2 font-semibold transition-all hover:border-pine-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#d8cfb8]"
            >
              ← Prev
            </button>
            <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-inksoft">
              Page {page} of {Math.max(totalPages, 1)} · {total} total
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-full border border-[#d8cfb8] bg-cream px-4 py-2 font-semibold transition-all hover:border-pine-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#d8cfb8]"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
