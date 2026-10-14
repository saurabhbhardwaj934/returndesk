"use client";

import { useEffect, useState } from "react";
import { STATUS_LABELS, REASONS, STATUSES } from "../lib/rules";

const STATUS_STYLES = {
  open: "bg-blue-100 text-blue-800",
  in_review: "bg-amber-100 text-amber-800",
  approved: "bg-purple-100 text-purple-800",
  rejected: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800",
};

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
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Return requests</h1>
          <p className="text-sm text-zinc-500">{total} requests</p>
        </div>
        <a
          href="/requests/new"
          className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + New request
        </a>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search customer, order, reference…"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black sm:col-span-2 lg:col-span-2"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
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
            className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
          >
            <option value="created_at">Newest</option>
            <option value="updated_at">Recently updated</option>
            <option value="customer_name">Customer A–Z</option>
            <option value="order_number">Order no.</option>
            <option value="reference">Reference</option>
          </select>
          <button
            onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
            className="rounded-lg border border-zinc-300 px-3 text-sm"
            title="Sort order badlo"
          >
            {order === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
          Loading requests…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}{" "}
          <button
            className="ml-2 underline"
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
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="font-medium">Koi request nahi mili.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Search ya filter badal kar dekho, ya nayi request banao.
          </p>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Order / Item</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <a href={"/requests/" + r.reference} className="font-mono font-bold hover:underline">
                        {r.reference}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.customer_name}</div>
                      <div className="text-xs text-zinc-500">{r.customer_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">{r.order_number}</div>
                      <div className="text-xs text-zinc-500">
                        {r.item_name} × {r.quantity}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">{r.reason}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "inline-block rounded-full px-2.5 py-1 text-xs font-bold " +
                          (STATUS_STYLES[r.status] || "bg-zinc-100")
                        }
                      >
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{fmtDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards (375px friendly) */}
          <div className="grid gap-2 md:hidden">
            {rows.map((r) => (
              <a
                key={r.id}
                href={"/requests/" + r.reference}
                className="rounded-xl border border-zinc-200 bg-white p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold">{r.reference}</span>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-bold " +
                      (STATUS_STYLES[r.status] || "bg-zinc-100")
                    }
                  >
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                </div>
                <div className="mt-1 text-sm font-medium">{r.customer_name}</div>
                <div className="text-xs text-zinc-500">
                  {r.order_number} · {r.item_name} × {r.quantity}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  {r.reason} · {fmtDate(r.created_at)}
                </div>
              </a>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-zinc-600">
              Page {page} of {Math.max(totalPages, 1)} ({total} total)
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
