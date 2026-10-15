const { query } = require("../../../../lib/db");
const { json, fail, validation, notFound, conflict } = require("../../../../lib/errors");
const { checkPatch } = require("../../../../lib/validate");
const { isDecided, isRemovable } = require("../../../../lib/rules");

// :id accepts both UUID and reference.
async function findLive(idOrRef) {
  const r = await query(
    `SELECT * FROM returns WHERE (id::text = $1 OR reference = $1) LIMIT 1`,
    [idOrRef]
  );
  return r.rows[0] || null;
}

// GET /api/returns/:id — full detail + notes (oldest first).
export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const row = await findLive(id);
    if (!row || row.deleted_at) {
      throw notFound("This request was not found (it may have been removed).");
    }
    const notes = await query(
      "SELECT id, body, created_at FROM notes WHERE return_id = $1 ORDER BY created_at ASC",
      [row.id]
    );
    return json({ data: { ...row, notes: notes.rows } });
  } catch (e) {
    return fail(e);
  }
}

// PATCH /api/returns/:id — Rule 4: no edit after decision.
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const row = await findLive(id);
    if (!row || row.deleted_at) {
      throw notFound("This request was not found.");
    }
    if (isDecided(row.status)) {
      throw conflict(
        "LOCKED",
        "This request is decided (" + row.status + "), customer/item details cannot be edited now. You can still add notes."
      );
    }
    let body;
    try {
      body = await request.json();
    } catch {
      throw validation("Send the body as JSON.", null);
    }
    const errors = checkPatch(body);
    if (Object.keys(errors).length > 0) {
      throw validation("Some fields are invalid.", errors);
    }
    const nextOrder = body.order_number ? body.order_number.trim() : row.order_number;
    const nextSku = body.item_sku ? body.item_sku.trim() : row.item_sku;
    // If order/item is changing, check Rule 3 again (excluding itself).
    if (nextOrder !== row.order_number || nextSku !== row.item_sku) {
      const dup = await query(
        `SELECT id FROM returns
         WHERE order_number = $1 AND item_sku = $2 AND id <> $3
           AND deleted_at IS NULL AND status NOT IN ('rejected','completed')
         LIMIT 1`,
        [nextOrder, nextSku, row.id]
      );
      if (dup.rows.length > 0) {
        throw conflict(
          "DUPLICATE_LIVE_REQUEST",
          "Another live request exists for this order + item, so this change is not allowed."
        );
      }
    }
    const sets = [];
    const vals = [];
    const push = (col, val) => {
      vals.push(val);
      sets.push(col + " = $" + vals.length);
    };
    if (body.customer_name !== undefined) push("customer_name", body.customer_name.trim());
    if (body.customer_email !== undefined) push("customer_email", body.customer_email.trim());
    if (body.customer_phone !== undefined) {
      // Convert to String and trim, so a number does not crash it.
      push(
        "customer_phone",
        body.customer_phone ? String(body.customer_phone).trim() || null : null
      );
    }
    if (body.order_number !== undefined) push("order_number", nextOrder);
    if (body.item_sku !== undefined) push("item_sku", nextSku);
    if (body.item_name !== undefined) push("item_name", body.item_name.trim());
    if (body.quantity !== undefined) push("quantity", Number(body.quantity));
    if (body.reason !== undefined) push("reason", body.reason);
    vals.push(row.id);
    const r = await query(
      `UPDATE returns SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    return json({ data: r.rows[0] });
  } catch (e) {
    return fail(e);
  }
}

// DELETE /api/returns/:id — Rule 5: soft remove, only open/rejected.
export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const row = await findLive(id);
    if (!row || row.deleted_at) {
      throw notFound("This request was not found.");
    }
    if (!isRemovable(row.status)) {
      throw conflict(
        "CANNOT_REMOVE",
        "Only Open or Rejected requests can be removed. This one is in " + row.status + "."
      );
    }
    const r = await query(
      "UPDATE returns SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *",
      [row.id]
    );
    return json({ data: r.rows[0] });
  } catch (e) {
    return fail(e);
  }
}
