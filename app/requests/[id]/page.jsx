"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { STATUS_LABELS, ALLOWED_TRANSITIONS, REASONS } from "../../../lib/rules";

const STATUS_STYLES = {
  open: "bg-blue-100 text-blue-800",
  in_review: "bg-amber-100 text-amber-800",
  approved: "bg-purple-100 text-purple-800",
  rejected: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800",
};

function money(cents) {
  if (cents === null || cents === undefined) return "—";
  return "₹" + (Number(cents) / 100).toFixed(2);
}

export default function DetailPage() {
  return (
    <Suspense fallback={<div className="rounded-xl border bg-white p-6 text-sm text-zinc-500">Loading…</div>}>
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
        setError((body.error && body.error.message) || "Load nahi hui.");
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
      setError("Network issue hai.");
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
        setError((body.error && body.error.message) || "Action fail hui.");
        return false;
      }
      setMsg(okMsg || "Ho gaya.");
      await load();
      return true;
    } catch {
      setError("Network issue hai.");
      return false;
    }
  }

  if (loading) {
    return <div className="rounded-xl border bg-white p-6 text-sm text-zinc-500">Loading…</div>;
  }
  if (!row) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {error || "Nahi mili."} <a href="/" className="ml-2 underline">List par wapas</a>
      </div>
    );
  }

  const nexts = ALLOWED_TRANSITIONS[row.status] || [];
  const canEdit = row.status === "open" || row.status === "in_review";
  const canRemove = row.status === "open" || row.status === "rejected";

  return (
    <div className="mx-auto max-w-3xl">
      <a href="/" className="text-sm text-zinc-500 hover:underline">← Requests</a>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-mono text-2xl font-bold">{row.reference}</h1>
        <span className={"rounded-full px-3 py-1 text-sm font-bold " + (STATUS_STYLES[row.status] || "bg-zinc-100")}>
          {STATUS_LABELS[row.status]}
        </span>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}
      {msg && (
        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{msg}</div>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 text-sm">
          <h2 className="mb-2 font-bold">Customer</h2>
          <p>{row.customer_name}</p>
          <p className="text-zinc-500">{row.customer_email}</p>
          <p className="text-zinc-500">{row.customer_phone || "—"}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-sm">
          <h2 className="mb-2 font-bold">Order / Item</h2>
          <p className="font-mono">{row.order_number}</p>
          <p>{row.item_name} × {row.quantity}</p>
          <p className="font-mono text-xs text-zinc-500">{row.item_sku}</p>
          <p className="mt-1">Wajah: <b>{row.reason}</b></p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-sm md:col-span-2">
          <h2 className="mb-2 font-bold">Resolution</h2>
          <p>Resolution: <b>{row.resolution || "—"}</b> · Refund: <b>{money(row.refund_amount_cents)}</b></p>
        </div>
      </div>

      {/* Status actions — sirf legal transitions */}
      <div className="mt-3 rounded-xl border bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Actions</h2>
        {nexts.length === 0 && <p className="text-sm text-zinc-500">Ye final hai, aage koi move nahi.</p>}
        <div className="flex flex-wrap gap-2">
          {nexts.map((to) => {
            if (to === "approved") {
              return (
                <button key={to} onClick={() => setShowApprove(!showApprove)} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white">
                  Approve…
                </button>
              );
            }
            return (
              <button
                key={to}
                onClick={() =>
                  callApi("/api/returns/" + encodeURIComponent(id) + "/status", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ to }),
                  }, "Status badal gaya.")
                }
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
              >
                {to === "in_review" ? "Move to In Review" : to === "rejected" ? "Reject" : "Complete"}
              </button>
            );
          })}
          {canRemove && (
            <button
              onClick={async () => {
                if (!confirm("Hatana pakka? List se gayab hogi, DB me rahegi.")) return;
                const ok = await callApi("/api/returns/" + encodeURIComponent(id), { method: "DELETE" }, "Hata di.");
                if (ok) router.push("/");
              }}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700"
            >
              Remove
            </button>
          )}
        </div>
        {showApprove && (
          <div className="mt-3 rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="rounded-lg border px-3 py-2">
                <option value="refund">Refund</option>
                <option value="replacement">Replacement</option>
                <option value="store_credit">Store Credit</option>
              </select>
              {resolution === "refund" && (
                <input value={refundRs} onChange={(e) => setRefundRs(e.target.value)} placeholder="Amount ₹ (jaise 499.00)" className="rounded-lg border px-3 py-2" />
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
                className="rounded-lg bg-purple-600 px-4 py-2 text-white"
              >
                Confirm approve
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Refund hai to amount ₹ me do (paise me convert hoga). Bina refund ke amount mana hai.</p>
          </div>
        )}
      </div>

      {/* Edit — decided ke baad band */}
      <div className="mt-3 rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Details sudharo</h2>
          {canEdit ? (
            <button onClick={() => setEditing(!editing)} className="text-sm underline">{editing ? "Close" : "Edit"}</button>
          ) : (
            <span className="text-xs text-zinc-500">Decided — ab edit band (notes likh sakte ho).</span>
          )}
        </div>
        {editing && canEdit && (
          <div className="mt-2 grid gap-2 text-sm">
            {["customer_name", "customer_email", "customer_phone", "order_number", "item_sku", "item_name", "quantity"].map((k) => (
              <input key={k} value={editForm[k] || ""} onChange={(e) => setEditForm({ ...editForm, [k]: e.target.value })} placeholder={k} className="rounded-lg border px-3 py-2" />
            ))}
            <select value={editForm.reason} onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })} className="rounded-lg border px-3 py-2">
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button
              onClick={() =>
                callApi("/api/returns/" + encodeURIComponent(id), {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...editForm, quantity: Number(editForm.quantity) }),
                }, "Save ho gaya.")
              }
              className="rounded-lg bg-black px-4 py-2 text-white"
            >
              Save
            </button>
          </div>
        )}
      </div>

      {/* Notes — hamesha likh sakte ho */}
      <div className="mt-3 rounded-xl border bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Notes ({(row.notes || []).length})</h2>
        {(row.notes || []).length === 0 && <p className="text-sm text-zinc-500">Abhi koi note nahi.</p>}
        <div className="grid gap-2">
          {(row.notes || []).map((n) => (
            <div key={n.id} className="rounded-lg bg-zinc-50 p-3 text-sm">
              <p>{n.body}</p>
              <p className="mt-1 text-xs text-zinc-500">{new Date(n.created_at).toLocaleString("en-IN")}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note likho…" className="w-full rounded-lg border px-3 py-2 text-sm" />
          <button
            onClick={async () => {
              const ok = await callApi("/api/returns/" + encodeURIComponent(id) + "/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: note }),
              }, "Note jud gaya.");
              if (ok) setNote("");
            }}
            className="rounded-lg bg-black px-4 py-2 text-sm text-white"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
