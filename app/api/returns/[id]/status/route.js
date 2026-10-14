export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { query } = require("../../../../../lib/db");
const { json, fail, validation, notFound, conflict } = require("../../../../../lib/errors");
const { checkStatus } = require("../../../../../lib/validate");
const { transitionError, approvalError } = require("../../../../../lib/rules");

// POST /api/returns/:id/status { to, resolution?, refund_amount_cents? }
// Rule 1 (flow) + Rule 2 (approval) dono yahi enforce hote hain.
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const found = await query(
      "SELECT * FROM returns WHERE (id::text = $1 OR reference = $1) LIMIT 1",
      [id]
    );
    const row = found.rows[0];
    if (!row || row.deleted_at) {
      throw notFound("Ye request nahi mili.");
    }
    let body;
    try {
      body = await request.json();
    } catch {
      throw validation("Body JSON me bhejo.", null);
    }
    const shapeErrors = checkStatus(body);
    if (Object.keys(shapeErrors).length > 0) {
      throw validation("Status change galat hai.", shapeErrors);
    }
    const to = body.to;
    const tErr = transitionError(row.status, to);
    if (tErr) {
      throw conflict("INVALID_TRANSITION", tErr);
    }
    const aErr = approvalError(to, body.resolution, body.refund_amount_cents);
    if (aErr) {
      const code = !body.resolution && to === "approved" ? "RESOLUTION_REQUIRED" : "INVALID_REFUND";
      throw conflict(code, aErr);
    }
    let resolution = row.resolution;
    let refundCents = row.refund_amount_cents;
    if (to === "approved") {
      resolution = body.resolution;
      refundCents = body.resolution === "refund" ? Number(body.refund_amount_cents) : null;
    }
    const r = await query(
      `UPDATE returns SET status = $1, resolution = $2, refund_amount_cents = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [to, resolution, refundCents, row.id]
    );
    return json({ data: r.rows[0] });
  } catch (e) {
    return fail(e);
  }
}
