// Single shared pg Pool for the whole app (plain JavaScript).
// Stored in globalThis so hot-reload in Next.js dev does not create a new Pool.

const { Pool } = require("pg");

function buildSsl() {
  const url = process.env.DATABASE_URL || "";
  // Local postgres (localhost) does not need ssl, Supabase/hosted does.
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
      "DATABASE_URL is missing. Add the Supabase connection string in .env (see README)."
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
