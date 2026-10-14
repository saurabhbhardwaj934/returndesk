const { query } = require("../../../../../lib/db");
const { json, fail, validation, notFound } = require("../../../../../lib/errors");
const { checkNote } = require("../../../../../lib/validate");

// POST /api/returns/:id/notes { body }
// Notes kabhi bhi likh sakte ho (decided/closed par bhi), edit/delete ka API hai hi nahi.
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const found = await query(
      "SELECT id, deleted_at FROM returns WHERE (id::text = $1 OR reference = $1) LIMIT 1",
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
    const errors = checkNote(body);
    if (Object.keys(errors).length > 0) {
      throw validation("Note galat hai.", errors);
    }
    const r = await query(
      "INSERT INTO notes (return_id, body) VALUES ($1, $2) RETURNING id, body, created_at",
      [row.id, body.body.trim()]
    );
    return json({ data: r.rows[0] }, 201);
  } catch (e) {
    return fail(e);
  }
}
