const { query } = require("../../../../lib/db");
const { json, fail, validation, notFound, conflict } = require("../../../../lib/errors");
const { checkPatch } = require("../../../../lib/validate");
const { isDecided, isRemovable } = require("../../../../lib/rules");

// :id me UUID ya reference dono chalte hain.
async function findLive(idOrRef) {
  const r = await query(
    `SELECT * FROM returns WHERE (id::text = $1 OR reference = $1) LIMIT 1`,
    [idOrRef]
  );
  return r.rows[0] || null;
}

// GET /api/returns/:id — poori detail + notes (purane se naye).
export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const row = await findLive(id);
    if (!row || row.deleted_at) {
      throw notFound("Ye request nahi mili (hatayi hui ho sakti hai).");
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

// PATCH /api/returns/:id — Rule 4: decided ke baad edit mana.
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const row = await findLive(id);
    if (!row || row.deleted_at) {
      throw notFound("Ye request nahi mili.");
    }
    if (isDecided(row.status)) {
      throw conflict(
        "LOCKED",
        "Ye request decided hai (" + row.status + "), ab customer/item details edit nahi ho sakte. Notes ab bhi likh sakte ho."
      );
    }
    let body;
    try {
      body = await request.json();
    } catch {
      throw validation("Body JSON me bhejo.", null);
    }
    const errors = checkPatch(body);
    if (Object.keys(errors).length > 0) {
      throw validation("Kuch fields galat hain.", errors);
    }
    const nextOrder = body.order_number ? body.order_number.trim() : row.order_number;
    const nextSku = body.item_sku ? body.item_sku.trim() : row.item_sku;
    // Agar order/item badal raha hai to Rule 3 dobara check (khud ko chhod kar).
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
          "Is order + item par ek aur live request hai, isliye ye change nahi ho sakta."
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
      push("customer_phone", body.customer_phone ? body.customer_phone.trim() : null);
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

// DELETE /api/returns/:id — Rule 5: soft remove, sirf open/rejected.
export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const row = await findLive(id);
    if (!row || row.deleted_at) {
      throw notFound("Ye request nahi mili.");
    }
    if (!isRemovable(row.status)) {
      throw conflict(
        "CANNOT_REMOVE",
        "Sirf Open ya Rejected request hatayi ja sakti hai. Ye " + row.status + " me hai."
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
