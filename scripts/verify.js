const fs = require("fs");
const { Pool } = require("pg");
let url = "";
for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
  const t = line.trim();
  if (t.startsWith("DATABASE_URL=")) url = t.slice("DATABASE_URL=".length).trim();
}
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
(async () => {
  const r1 = await pool.query("SELECT reason, COUNT(*) n FROM returns GROUP BY reason ORDER BY reason");
  console.table(r1.rows);
  const r2 = await pool.query("SELECT COUNT(*) AS notes FROM notes");
  console.log("notes:", r2.rows[0].notes);
  const r3 = await pool.query("SELECT COUNT(*) AS c FROM returns WHERE resolution='refund' AND refund_amount_cents > 0");
  console.log("refund-ok:", r3.rows[0].c);
  const r4 = await pool.query("SELECT COUNT(*) AS c FROM returns WHERE deleted_at IS NOT NULL");
  console.log("deleted:", r4.rows[0].c);
  await pool.end();
})().catch((e) => { console.error("VERIFY-FAIL:", e.message); process.exit(1); });
