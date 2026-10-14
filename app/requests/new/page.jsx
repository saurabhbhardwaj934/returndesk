"use client";

const { useState } = require("react");
const { useRouter } = require("next/navigation");
const { REASONS } = require("../../../lib/rules");

const FIELDS = [
  ["customer_name", "Customer naam", "text", "Priya Sharma"],
  ["customer_email", "Customer email", "email", "priya@example.com"],
  ["customer_phone", "Phone (optional)", "text", "9876543210"],
  ["order_number", "Order number", "text", "ORD-1042"],
  ["item_sku", "Item SKU", "text", "TSH-BLK-M"],
  ["item_name", "Item naam", "text", "Black Cotton T-Shirt (M)"],
  ["quantity", "Quantity", "number", "1"],
];

export default function NewPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    order_number: "",
    item_sku: "",
    item_name: "",
    quantity: "1",
    reason: "Damaged",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [topError, setTopError] = useState("");
  const [saving, setSaving] = useState(false);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setTopError("");
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, quantity: Number(form.quantity) }),
      });
      const body = await res.json();
      if (!res.ok) {
        setTopError((body.error && body.error.message) || "Save nahi hua.");
        if (body.error && body.error.details) setFieldErrors(body.error.details);
        return;
      }
      router.push("/requests/" + body.data.reference);
    } catch {
      setTopError("Network issue hai. Dobara try karo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Nayi return request</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Reference system khud banayega, tumhe type nahi karna.
      </p>
      {topError && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {topError}
        </div>
      )}
      <form onSubmit={submit} className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
        {FIELDS.map(([key, label, type, ph]) => (
          <div key={key} className="mb-3">
            <label className="mb-1 block text-sm font-medium">{label}</label>
            <input
              type={type}
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
              placeholder={ph}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
            />
            {fieldErrors[key] && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors[key]}</p>
            )}
          </div>
        ))}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Wajah (reason)</label>
          <select
            value={form.reason}
            onChange={(e) => set("reason", e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {fieldErrors.reason && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.reason}</p>
          )}
        </div>
        <div className="flex gap-2">
          <a
            href="/"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
          >
            Cancel
          </a>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Raise request"}
          </button>
        </div>
      </form>
    </div>
  );
}
