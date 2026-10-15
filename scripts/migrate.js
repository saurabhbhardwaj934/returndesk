// node scripts/migrate.js — runs db/migrate.sql on DATABASE_URL.
// Reads the .env file if present (no dotenv dependency).

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function loadEnv() {
  const p = path.join(process.cwd(), ".env");
  if (!fs.existsSync(p)) return;
  const lines = fs.readFileSync(p, "utf8").split("\n");
  for (const line of lines) {
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

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing. Create .env (see README).");
    process.exit(1);
  }
  const sql = fs.readFileSync(path.join(process.cwd(), "db", "migrate.sql"), "utf8");
  const url = process.env.DATABASE_URL;
  const ssl =
    url.includes("localhost") || url.includes("127.0.0.1") || process.env.PGSSLMODE === "disable"
      ? undefined
      : { rejectUnauthorized: false };
  const pool = new Pool({ connectionString: url, ssl });
  try {
    await pool.query(sql);
    console.log("Migrate OK: tables + indexes ready.");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Migrate FAILED:", e.message);
  process.exit(1);
});
