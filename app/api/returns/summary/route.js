const { query } = require("../../../../lib/db");
const { json, fail } = require("../../../../lib/errors");

// GET /api/returns/summary — dashboard stat cards ke liye live counts.
// Sirf non-deleted rows ginata hai (soft-removed list me nahi hote).
export async function GET() {
  try {
    const byStatusQ = await query(
      "SELECT status, COUNT(*) AS n FROM returns WHERE deleted_at IS NULL GROUP BY status",
      []
    );
    const byReasonQ = await query(
      "SELECT reason, COUNT(*) AS n FROM returns WHERE deleted_at IS NULL GROUP BY reason",
      []
    );
    const totalQ = await query(
      "SELECT COUNT(*) AS n FROM returns WHERE deleted_at IS NULL",
      []
    );
    const byStatus = {};
    for (const r of byStatusQ.rows) byStatus[r.status] = Number(r.n);
    const byReason = {};
    for (const r of byReasonQ.rows) byReason[r.reason] = Number(r.n);
    return json({
      total: Number(totalQ.rows[0].n),
      byStatus,
      byReason,
    });
  } catch (e) {
    return fail(e);
  }
}
