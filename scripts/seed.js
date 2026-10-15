// node scripts/seed.js — adds 36 requests to an empty DB.
// Covers every status (5) x every reason (5), notes on half the rows.
// Clears tables first so running again does not create duplicates.

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function loadEnv() {
  const p = path.join(process.cwd(), ".env");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const FIRST = [
  "Aarav", "Priya", "Rohan", "Sneha", "Amit", "Kavya", "Arjun", "Divya",
  "Rahul", "Pooja", "Vikram", "Ananya", "Karan", "Meera", "Sahil", "Ritu",
  "Nikhil", "Shreya", "Aditya", "Naina", "Varun", "Ishita", "Manav", "Tara",
];
const LAST = ["Sharma", "Patel", "Singh", "Gupta", "Mehta", "Nair", "Khan", "Das"];
const ITEMS = [
  ["TSH-BLK-M", "Black Cotton T-Shirt (M)"],
  ["TSH-WHT-L", "White Cotton T-Shirt (L)"],
  ["JNS-BLU-32", "Blue Denim Jeans (32)"],
  ["SHO-RUN-9", "Running Shoes (UK 9)"],
  ["SHO-RUN-10", "Running Shoes (UK 10)"],
  ["JKT-WIN-XL", "Winter Jacket (XL)"],
  ["KUR-RED-S", "Red Kurta (S)"],
  ["SAR-SLK-01", "Silk Saree (Maroon)"],
  ["WCH-ANLG-2", "Analog Watch"],
  ["BAG-LAP-15", "Laptop Backpack 15inch"],
  ["MUG-CER-03", "Ceramic Coffee Mug"],
  ["BOT-STL-1L", "Steel Bottle 1L"],
];
const REASONS = ["Damaged", "Wrong Item", "Size Issue", "Not As Described", "Changed Mind"];
// status plan: 8 open, 7 in_review, 7 approved, 7 rejected, 7 completed = 36
const STATUS_PLAN = [
  "open", "open", "open", "open", "open", "open", "open", "open",
  "in_review", "in_review", "in_review", "in_review", "in_review", "in_review", "in_review",
  "approved", "approved", "approved", "approved", "approved", "approved", "approved",
  "rejected", "rejected", "rejected", "rejected", "rejected", "rejected", "rejected",
  "completed", "completed", "completed", "completed", "completed", "completed", "completed",
];

const NOTE_TEXTS = [
  "Customer sent a photo, the box was broken.",
  "Spoke to the courier, will check again.",
  "Sent the size chart, customer ordered L instead of M.",
  "Forwarded to the refund team.",
  "Replacement is available in stock.",
  "Customer confirmed on the call.",
  "Customer agreed to store credit.",
];

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing. Create .env (see README).");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  const ssl =
    url.includes("localhost") || url.includes("127.0.0.1") || process.env.PGSSLMODE === "disable"
      ? undefined
      : { rejectUnauthorized: false };
  const pool = new Pool({ connectionString: url, ssl });
  try {
    await pool.query("TRUNCATE notes, returns RESTART IDENTITY CASCADE");
    for (let i = 0; i < STATUS_PLAN.length; i++) {
      const status = STATUS_PLAN[i];
      const reason = REASONS[i % REASONS.length];
      const fn = FIRST[i % FIRST.length];
      const ln = LAST[Math.floor(i / 3) % LAST.length];
      const item = ITEMS[i % ITEMS.length];
      const n = i + 1;
      const reference = "RET-S" + String(n).padStart(3, "0");
      const order_number = "ORD-" + (1000 + (n * 37) % 9000);
      const quantity = (n % 3) + 1;
      const daysAgo = (n * 2) % 60;
      let resolution = null;
      let refundCents = null;
      if (status === "approved" || status === "completed") {
        const pick = n % 3;
        if (pick === 0) {
          resolution = "refund";
          refundCents = 49900 + (n * 137) % 400000; // in paise
        } else if (pick === 1) {
          resolution = "replacement";
        } else {
          resolution = "store_credit";
        }
      }
      const r = await pool.query(
        `INSERT INTO returns
          (reference, customer_name, customer_email, customer_phone, order_number,
           item_sku, item_name, quantity, reason, status, resolution, refund_amount_cents, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, NOW() - ($13 || ' days')::interval, NOW() - ($13 || ' days')::interval)
         RETURNING id`,
        [
          reference,
          fn + " " + ln,
          fn.toLowerCase() + "." + ln.toLowerCase() + n + "@example.com",
          "98765" + String(10000 + n),
          order_number,
          item[0],
          item[1],
          quantity,
          reason,
          status,
          resolution,
          refundCents,
          String(daysAgo),
        ]
      );
      const id = r.rows[0].id;
      // Notes on half the rows (1-2 notes).
      if (n % 2 === 0) {
        await pool.query("INSERT INTO notes (return_id, body) VALUES ($1, $2)", [
          id,
          NOTE_TEXTS[n % NOTE_TEXTS.length],
        ]);
      }
      if (n % 5 === 0) {
        await pool.query("INSERT INTO notes (return_id, body) VALUES ($1, $2)", [
          id,
          "Agent reviewed it and moved it forward.",
        ]);
      }
    }
    const c = await pool.query("SELECT status, COUNT(*) n FROM returns GROUP BY status ORDER BY status");
    console.log("Seed OK: 36 requests.");
    console.table(c.rows);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Seed FAILED:", e.message);
  process.exit(1);
});
