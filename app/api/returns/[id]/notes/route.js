const { query } = require("../../../../../lib/db");
const { json, fail, validation, notFound } = require("../../../../../lib/errors");
const { checkNote } = require("../../../../../lib/validate");

// POST /api/returns/:id/notes { body }
// Notes can be added anytime (even when decided/closed), there is no edit/delete API.
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const found = await query(
      "SELECT id, deleted_at FROM returns WHERE (id::text = $1 OR reference = $1) LIMIT 1",
      [id]
    );
    const row = found.rows[0];
    if (!row || row.deleted_at) {
      throw notFound("This request was not found.");
    }
    let body;
    try {
      body = await request.json();
    } catch {
      throw validation("Send the body as JSON.", null);
    }
    const errors = checkNote(body);
    if (Object.keys(errors).length > 0) {
      throw validation("Note is invalid.", errors);
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
