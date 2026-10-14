// Single shared pg Pool for the whole app (plain JavaScript).
// Next.js dev me hot-reload par naya Pool na bane, isliye globalThis me rakhte hain.

const { Pool } = require("pg");

function buildSsl() {
  const url = process.env.DATABASE_URL || "";
  // Local postgres (localhost) ko ssl nahi chahiye, Supabase/hosted ko chahiye.
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    return undefined;
  }
  if (process.env.PGSSLMODE === "disable") {
    return undefined;
  }
  return { rejectUnauthorized: false };
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL missing hai. .env me Supabase connection string dalo (README dekho)."
    );
  }
  if (!globalThis.__returndesk_pool) {
    globalThis.__returndesk_pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: buildSsl(),
      max: 10,
    });
  }
  return globalThis.__returndesk_pool;
}

function query(text, params) {
  return getPool().query(text, params);
}

module.exports = { getPool, query };
