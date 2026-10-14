const { query } = require("../../../lib/db");
const { json, fail, validation, conflict } = require("../../../lib/errors");
const { checkCreate, parseListParams } = require("../../../lib/validate");
const { generateReference } = require("../../../lib/reference");

// GET /api/returns?search=&status=&reason=&sort=&order=&page=&pageSize=
// Saara filter/sort/paging SQL me hota hai, browser me nahi.
export async function GET(request) {
  try {
    const p = parseListParams(request.nextUrl.searchParams);
    if (Object.keys(p.errors).length > 0) {
      throw validation("Query params galat hain.", p.errors);
    }
    const where = ["r.deleted_at IS NULL"];
    const params = [];
    if (p.search) {
      params.push("%" + p.search + "%");
      const i = params.length;
      where.push(
        `(r.customer_name ILIKE $${i} OR r.customer_email ILIKE $${i} OR r.order_number ILIKE $${i} OR r.reference ILIKE $${i})`
      );
    }
    if (p.status) {
      params.push(p.status);
      where.push(`r.status = $${params.length}`);
    }
    if (p.reason) {
      params.push(p.reason);
      where.push(`r.reason = $${params.length}`);
    }
    params.push(p.pageSize);
    const limitN = params.length;
    params.push(p.offset);
    const offsetN = params.length;

    const sql = `
      SELECT r.*, COUNT(*) OVER() AS total_count
      FROM returns r
      WHERE ${where.join(" AND ")}
      ORDER BY ${p.sortSql} ${p.order}
      LIMIT $${limitN} OFFSET $${offsetN}
    `;
    const result = await query(sql, params);
    const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
    const data = result.rows.map((row) => {
      const { total_count, ...rest } = row;
      return rest;
    });
    return json({
      data,
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages: Math.ceil(total / p.pageSize),
    });
  } catch (e) {
    return fail(e);
  }
}

// POST /api/returns — nayi request. Reference server banata hai.
export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      throw validation("Body JSON me bhejo.", null);
    }
    const errors = checkCreate(body);
    if (Object.keys(errors).length > 0) {
      throw validation("Kuch fields galat hain.", errors);
    }
    const order_number = body.order_number.trim();
    const item_sku = body.item_sku.trim();

    // Rule 3: same order+item par live request pehle se hai to mana.
    const dup = await query(
      `SELECT id FROM returns
       WHERE order_number = $1 AND item_sku = $2
         AND deleted_at IS NULL AND status NOT IN ('rejected','completed')
       LIMIT 1`,
      [order_number, item_sku]
    );
    if (dup.rows.length > 0) {
      throw conflict(
        "DUPLICATE_LIVE_REQUEST",
        "Is order + item par ek live request pehle se hai. Purani close (Rejected/Completed) hone ke baad nayi bana sakte ho."
      );
    }

    // Reference collision ho to retry (max 5).
    let row = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const reference = generateReference();
      try {
        const r = await query(
          `INSERT INTO returns
            (reference, customer_name, customer_email, customer_phone, order_number,
             item_sku, item_name, quantity, reason)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           RETURNING *`,
          [
            reference,
            body.customer_name.trim(),
            body.customer_email.trim(),
            // Phone number bhi aa sakta hai, isliye String() lagaya (validation upar ho chuki).
            body.customer_phone ? String(body.customer_phone).trim() || null : null,
            order_number,
            item_sku,
            body.item_name.trim(),
            Number(body.quantity),
            body.reason,
          ]
        );
        row = r.rows[0];
        break;
      } catch (e) {
        // Reference takraya to dobara try, warna fail() sambhalega.
        if (e && e.code === "23505" && e.constraint === "returns_reference_key") {
          continue;
        }
        // Live duplicate race (partial unique index) -> 409.
        if (e && e.code === "23505" && e.constraint === "returns_live_item_unique") {
          throw conflict(
            "DUPLICATE_LIVE_REQUEST",
            "Is order + item par ek live request pehle se hai. Purani close hone ke baad nayi bana sakte ho."
          );
        }
        throw e;
      }
    }
    if (!row) {
      throw conflict("REFERENCE_COLLISION", "Reference banane me dikkat aayi, dobara try karo.");
    }
    return json({ data: row }, 201);
  } catch (e) {
    return fail(e);
  }
}
