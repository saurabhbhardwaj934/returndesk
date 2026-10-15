"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REASONS } from "../../../lib/rules";

const CUSTOMER_FIELDS = [
  ["customer_name", "Customer name", "text", "Priya Sharma"],
  ["customer_email", "Customer email", "email", "priya@example.com"],
  ["customer_phone", "Phone (optional)", "text", "9876543210"],
];

const ORDER_FIELDS = [
  ["order_number", "Order number", "text", "ORD-1042"],
  ["item_sku", "Item SKU", "text", "TSH-BLK-M"],
  ["item_name", "Item name", "text", "Black Cotton T-Shirt (M)"],
  ["quantity", "Quantity", "number", "1"],
];

function Field({ label, error, children }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] font-semibold">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}

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
        setTopError((body.error && body.error.message) || "Could not save.");
        if (body.error && body.error.details) setFieldErrors(body.error.details);
        return;
      }
      router.push("/requests/" + body.data.reference);
    } catch {
      setTopError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rise mx-auto max-w-2xl">
      <a href="/" className="text-sm font-medium text-inksoft hover:text-pine-800 hover:underline">
        ← Requests
      </a>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.22em] text-gold-600">
        New entry
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
        New return request
      </h1>
      <p className="mt-1.5 text-sm text-inksoft">
        The system will create the reference — you do not need to type it.
      </p>

      {topError && (
        <div className="mt-4 rounded-2xl border border-rose-300 bg-[#fdf0f0] p-4 text-sm font-medium text-rose-900">
          {topError}
        </div>
      )}

      <form
        onSubmit={submit}
        className="mt-4 rounded-2xl border border-[#ddd2b8] bg-cream p-4 shadow-[0_10px_30px_-20px_rgba(28,23,16,0.4)] sm:p-6"
      >
        <h2 className="font-display text-base font-semibold">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-pine-900 text-xs font-bold text-cream">
            1
          </span>
          Customer
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {CUSTOMER_FIELDS.map(([key, label, type, ph]) => (
            <div key={key} className={key === "customer_name" ? "sm:col-span-2" : ""}>
              <Field label={label} error={fieldErrors[key]}>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={ph}
                  className="field"
                />
              </Field>
            </div>
          ))}
        </div>

        <h2 className="mt-6 font-display text-base font-semibold">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-pine-900 text-xs font-bold text-cream">
            2
          </span>
          Order &amp; item
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {ORDER_FIELDS.map(([key, label, type, ph]) => (
            <Field key={key} label={label} error={fieldErrors[key]}>
              <input
                type={type}
                min={type === "number" ? "1" : undefined}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={ph}
                className="field"
              />
            </Field>
          ))}
        </div>

        <h2 className="mt-6 font-display text-base font-semibold">
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-pine-900 text-xs font-bold text-cream">
            3
          </span>
          Reason
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => set("reason", r)}
              className={
                "rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all " +
                (form.reason === r
                  ? "border-pine-900 bg-pine-900 text-cream shadow"
                  : "border-[#d8cfb8] bg-[#fffdf8] hover:border-pine-700 hover:text-pine-800")
              }
            >
              {r}
            </button>
          ))}
        </div>
        {fieldErrors.reason && (
          <p className="mt-1 text-xs font-medium text-rose-700">{fieldErrors.reason}</p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[#e5dcc4] pt-4 sm:flex-row">
          <a
            href="/"
            className="rounded-full border border-[#d8cfb8] px-5 py-2.5 text-center text-sm font-semibold transition-colors hover:border-pine-700"
          >
            Cancel
          </a>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-pine-900 px-6 py-2.5 text-sm font-semibold text-cream shadow-[0_8px_20px_-8px_rgba(12,53,39,0.7)] transition-all hover:-translate-y-px hover:bg-pine-800 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {saving ? "Saving…" : "Raise request →"}
          </button>
        </div>
      </form>
    </div>
  );
}
