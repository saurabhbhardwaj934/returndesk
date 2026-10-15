"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { STATUS_LABELS, ALLOWED_TRANSITIONS, REASONS } from "../../../lib/rules";

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

function money(cents) {
  if (cents === null || cents === undefined) return "—";
  return "₹" + (Number(cents) / 100).toFixed(2);
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-[#ddd2b8] bg-cream p-4 shadow-[0_10px_30px_-24px_rgba(28,23,16,0.5)] sm:p-5">
      <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gold-600">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function DetailPage() {
  return (
    <Suspense fallback={<div className="rounded-2xl border border-[#ddd2b8] bg-cream p-6 text-sm text-inksoft">Loading…</div>}>
      <DetailInner />
    </Suspense>
  );
}

function DetailInner() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showApprove, setShowApprove] = useState(false);
  const [resolution, setResolution] = useState("refund");
  const [refundRs, setRefundRs] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/returns/" + encodeURIComponent(id));
      const body = await res.json();
      if (!res.ok) {
        setError((body.error && body.error.message) || "Could not load it.");
        setRow(null);
        return;
      }
      setRow(body.data);
      setEditForm({
        customer_name: body.data.customer_name,
        customer_email: body.data.customer_email,
        customer_phone: body.data.customer_phone || "",
        order_number: body.data.order_number,
        item_sku: body.data.item_sku,
        item_name: body.data.item_name,
        quantity: String(body.data.quantity),
        reason: body.data.reason,
      });
    } catch {
      setError("Network error. Please retry.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function callApi(url, options, okMsg) {
    setMsg("");
    setError("");
    try {
      const res = await fetch(url, options);
      const body = await res.json();
      if (!res.ok) {
        setError((body.error && body.error.message) || "Action failed.");
        return false;
      }
      setMsg(okMsg || "Done.");
      await load();
      return true;
    } catch {
      setError("Network error. Please retry.");
      return false;
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="shimmer h-8 w-48 rounded-lg" />
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="shimmer h-32 rounded-2xl" />
          <div className="shimmer h-32 rounded-2xl" />
        </div>
        <div className="shimmer mt-3 h-40 rounded-2xl" />
      </div>
    );
  }
  if (!row) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-rose-300 bg-[#fdf0f0] p-6 text-sm text-rose-900">
        <p className="font-display text-xl font-semibold">Request not found</p>
        <p className="mt-1">{error || "It may have been removed."}</p>
        <a href="/" className="mt-3 inline-block rounded-full bg-rose-900 px-4 py-1.5 font-semibold text-white">
          ← Back to list
        </a>
      </div>
    );
  }

  const nexts = ALLOWED_TRANSITIONS[row.status] || [];
  const canEdit = row.status === "open" || row.status === "in_review";
  const canRemove = row.status === "open" || row.status === "rejected";

  return (
    <div className="rise mx-auto max-w-3xl">
      <a href="/" className="text-sm font-medium text-inksoft hover:text-pine-800 hover:underline">
        ← Requests
      </a>

      {/* Header */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-pine-950 p-4 text-[#f4efe4] sm:p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold-500">
            Return request
          </p>
          <h1 className="mt-0.5 font-ref text-2xl font-semibold tracking-tight sm:text-3xl">
            {row.reference}
          </h1>
          <p className="mt-1 text-[13px] text-[#b9c9bd]">
            {row.customer_name} · <span className="font-ref">{row.order_number}</span>
          </p>
        </div>
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold " +
            (STATUS_PILL[row.status] || "bg-stone-200 text-stone-700")
          }
        >
          <span className={"h-2 w-2 rounded-full " + (STATUS_DOT[row.status] || "bg-stone-400")} />
          {STATUS_LABELS[row.status]}
        </span>
      </div>

      {error && (
        <div className="mt-3 rounded-2xl border border-rose-300 bg-[#fdf0f0] p-3.5 text-sm font-medium text-rose-900">
          {error}
        </div>
      )}
      {msg && (
        <div className="mt-3 rounded-2xl border border-emerald-300 bg-[#ecf9f0] p-3.5 text-sm font-medium text-emerald-900">
          {msg}
        </div>
      )}

      {/* Info */}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Card title="Customer">
          <p className="font-display text-lg font-semibold">{row.customer_name}</p>
          <p className="mt-0.5 text-sm text-inksoft">{row.customer_email}</p>
          <p className="text-sm text-inksoft">{row.customer_phone || "—"}</p>
        </Card>
        <Card title="Order & item">
          <p className="font-ref text-sm font-semibold">{row.order_number}</p>
          <p className="mt-0.5 text-sm">
            {row.item_name} <span className="font-bold">× {row.quantity}</span>
          </p>
          <p className="font-ref text-xs text-inksoft">{row.item_sku}</p>
          <p className="mt-2 inline-block rounded-md bg-[#f1e9d5] px-2 py-0.5 text-xs font-semibold">
            {row.reason}
          </p>
        </Card>
        <div className="md:col-span-2">
          <Card title="Resolution">
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
              <p>
                Resolution:{" "}
                <b className="capitalize">{row.resolution ? row.resolution.replace("_", " ") : "—"}</b>
              </p>
              <p>
                Refund: <b className="font-ref">{money(row.refund_amount_cents)}</b>
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Status actions — only legal transitions */}
      <div className="mt-3">
        <Card title="Actions">
          {nexts.length === 0 && (
            <p className="text-sm text-inksoft">This is final — no further moves.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {nexts.map((to) => {
              if (to === "approved") {
                return (
                  <button
                    key={to}
                    onClick={() => setShowApprove(!showApprove)}
                    className="rounded-full bg-violet-700 px-5 py-2 text-sm font-semibold text-white shadow transition-all hover:-translate-y-px hover:bg-violet-600"
                  >
                    Approve…
                  </button>
                );
              }
              const style =
                to === "rejected"
                  ? "border border-rose-400 text-rose-800 hover:bg-rose-50"
                  : to === "completed"
                    ? "bg-emerald-700 text-white hover:bg-emerald-600"
                    : "bg-pine-900 text-cream hover:bg-pine-800";
              return (
                <button
                  key={to}
                  onClick={() =>
                    callApi("/api/returns/" + encodeURIComponent(id) + "/status", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ to }),
                    }, "Status updated.")
                  }
                  className={"rounded-full px-5 py-2 text-sm font-semibold shadow transition-all hover:-translate-y-px " + style}
                >
                  {to === "in_review" ? "Move to In Review →" : to === "rejected" ? "Reject" : "Complete ✓"}
                </button>
              );
            })}
            {canRemove && (
              <button
                onClick={async () => {
                  if (!confirm("Are you sure? It will hide from the list but stay in the DB.")) return;
                  const ok = await callApi("/api/returns/" + encodeURIComponent(id), { method: "DELETE" }, "Removed.");
                  if (ok) router.push("/");
                }}
                className="rounded-full border border-dashed border-rose-400 px-5 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50"
              >
                Remove
              </button>
            )}
          </div>
          {showApprove && (
            <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="field max-w-[180px] cursor-pointer"
                >
                  <option value="refund">Refund</option>
                  <option value="replacement">Replacement</option>
                  <option value="store_credit">Store Credit</option>
                </select>
                {resolution === "refund" && (
                  <input
                    value={refundRs}
                    onChange={(e) => setRefundRs(e.target.value)}
                    placeholder="Amount ₹ (e.g. 499.00)"
                    inputMode="decimal"
                    className="field max-w-[200px]"
                  />
                )}
                <button
                  onClick={() => {
                    const payload = { to: "approved", resolution };
                    if (resolution === "refund") {
                      const cents = Math.round(Number(refundRs) * 100);
                      payload.refund_amount_cents = cents;
                    }
                    setShowApprove(false);
                    callApi("/api/returns/" + encodeURIComponent(id) + "/status", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    }, "Approved.");
                  }}
                  className="rounded-full bg-violet-700 px-5 py-2 font-semibold text-white hover:bg-violet-600"
                >
                  Confirm approve
                </button>
              </div>
              <p className="mt-1.5 text-xs text-inksoft">
                For refund, give the amount in ₹ (it converts to paise). Amount is not allowed without a refund.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Edit — closed after decision */}
      <div className="mt-3">
        <Card title="Fix details">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] text-inksoft">
              {canEdit
                ? "You can fix it before the decision."
                : "Decided — editing is closed (you can still add notes)."}
            </p>
            {canEdit && (
              <button
                onClick={() => setEditing(!editing)}
                className="shrink-0 rounded-full border border-[#d8cfb8] px-3.5 py-1 text-[13px] font-semibold hover:border-pine-700"
              >
                {editing ? "Close" : "Edit"}
              </button>
            )}
          </div>
          {editing && canEdit && (
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {["customer_name", "customer_email", "customer_phone", "order_number", "item_sku", "item_name", "quantity"].map((k) => (
                <input
                  key={k}
                  value={editForm[k] || ""}
                  onChange={(e) => setEditForm({ ...editForm, [k]: e.target.value })}
                  placeholder={k}
                  className="field"
                />
              ))}
              <select
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                className="field cursor-pointer sm:col-span-2"
              >
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button
                onClick={() =>
                  callApi("/api/returns/" + encodeURIComponent(id), {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...editForm, quantity: Number(editForm.quantity) }),
                  }, "Saved.")
                }
                className="rounded-full bg-pine-900 px-5 py-2 font-semibold text-cream hover:bg-pine-800 sm:col-span-2"
              >
                Save changes
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* Notes — you can always write */}
      <div className="mt-3">
        <Card title={"Notes · " + (row.notes || []).length}>
          {(row.notes || []).length === 0 && (
            <p className="text-sm text-inksoft">No notes yet.</p>
          )}
          <div className="relative ml-1.5 grid gap-3 border-l-2 border-[#e0d5b8] pl-4">
            {(row.notes || []).map((n) => (
              <div key={n.id} className="relative">
                <span className="absolute top-1 -left-[22px] h-2.5 w-2.5 rounded-full bg-gold-500 ring-4 ring-[#f3ead2]" />
                <p className="text-sm">{n.body}</p>
                <p className="mt-0.5 text-xs text-inksoft">
                  {new Date(n.created_at).toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write a note…"
              className="field flex-1"
            />
            <button
              onClick={async () => {
                const ok = await callApi("/api/returns/" + encodeURIComponent(id) + "/notes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ body: note }),
                }, "Note added.");
                if (ok) setNote("");
              }}
              className="shrink-0 rounded-full bg-pine-900 px-5 py-2 text-sm font-semibold text-cream hover:bg-pine-800"
            >
              Add note
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
