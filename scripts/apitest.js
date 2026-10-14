// node scripts/apitest.js [baseUrl] — poore API + 5 rules ka end-to-end test.
// Test ke baad `npm run db:seed` dobara chalana taaki DB clean 36 par wapas aaye.
const BASE = process.argv[2] || "http://localhost:3100";
let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log("PASS " + name); }
  else { fail++; console.log("FAIL " + name + (extra ? " :: " + extra : "")); }
}
async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return { status: res.status, data };
}
(async () => {
  // 1. List defaults
  let r = await req("GET", "/api/returns?pageSize=5");
  check("list-200", r.status === 200, r.status);
  check("list-total-36", r.data && r.data.total === 36, JSON.stringify(r.data && r.data.total));
  check("list-shape", r.data && Array.isArray(r.data.data) && r.data.totalPages >= 1, "");

  // 2. Search + filter + sort + paging ek saath
  r = await req("GET", "/api/returns?search=RET-S00&status=open&reason=Damaged&sort=customer_name&order=asc&page=1&pageSize=5");
  check("combo-200", r.status === 200, r.status);
  const rows = (r.data && r.data.data) || [];
  check("combo-all-open", rows.every((x) => x.status === "open"), JSON.stringify(rows.map((x) => x.status)));
  check("combo-all-damaged", rows.every((x) => x.reason === "Damaged"), "");

  // ek approved + ek open row uthao
  r = await req("GET", "/api/returns?status=approved&pageSize=2");
  const approved = r.data.data[0];
  r = await req("GET", "/api/returns?status=open&pageSize=2");
  const openRow = r.data.data[0];
  check("have-approved", !!approved, "");
  check("have-open", !!openRow, "");

  // 3. Create valid
  const fresh = {
    customer_name: "Test User", customer_email: "test.user@example.com",
    order_number: "ORD-TEST-1", item_sku: "TEST-SKU-1", item_name: "Test Item",
    quantity: 2, reason: "Damaged",
  };
  r = await req("POST", "/api/returns", fresh);
  check("create-201", r.status === 201, r.status + " " + JSON.stringify(r.data));
  check("create-ref", r.data && r.data.data && r.data.data.reference.startsWith("RET-"), "");
  const newId = r.data && r.data.data && r.data.data.id;

  // 4. Rule 3 duplicate
  r = await req("POST", "/api/returns", fresh);
  check("dup-409", r.status === 409, r.status);
  check("dup-code", r.data && r.data.error && r.data.error.code === "DUPLICATE_LIVE_REQUEST", JSON.stringify(r.data));

  // 5. Rule 1 illegal transition
  r = await req("POST", "/api/returns/" + newId + "/status", { to: "completed" });
  check("trans-409", r.status === 409, r.status);
  check("trans-code", r.data && r.data.error && r.data.error.code === "INVALID_TRANSITION", JSON.stringify(r.data));

  // legal move open -> in_review
  r = await req("POST", "/api/returns/" + newId + "/status", { to: "in_review" });
  check("trans-ok", r.status === 200 && r.data.data.status === "in_review", JSON.stringify(r.data));

  // 6. Rule 2 approval checks
  r = await req("POST", "/api/returns/" + newId + "/status", { to: "approved", resolution: "refund", refund_amount_cents: 0 });
  check("refund0-409", r.status === 409, r.status);
  r = await req("POST", "/api/returns/" + newId + "/status", { to: "approved" });
  check("nores-409", r.status === 409 && r.data.error.code === "RESOLUTION_REQUIRED", JSON.stringify(r.data));
  r = await req("POST", "/api/returns/" + newId + "/status", { to: "approved", resolution: "replacement", refund_amount_cents: 100 });
  check("nonrefund-amt-409", r.status === 409, r.status);
  r = await req("POST", "/api/returns/" + newId + "/status", { to: "approved", resolution: "refund", refund_amount_cents: 19999 });
  check("approve-ok", r.status === 200 && r.data.data.resolution === "refund", JSON.stringify(r.data));

  // 7. Rule 4 locked (seed wala approved row)
  r = await req("PATCH", "/api/returns/" + approved.id, { customer_name: "Hacker" });
  check("locked-409", r.status === 409, r.status);
  check("locked-code", r.data && r.data.error && r.data.error.code === "LOCKED", JSON.stringify(r.data));

  // 8. Notes decided par bhi allowed
  r = await req("POST", "/api/returns/" + approved.id + "/notes", { body: "apitest note" });
  check("note-201", r.status === 201, r.status + " " + JSON.stringify(r.data));

  // 9. Rule 5 remove
  r = await req("DELETE", "/api/returns/" + approved.id, null);
  check("rm-approved-409", r.status === 409, r.status);
  check("rm-code", r.data && r.data.error && r.data.error.code === "CANNOT_REMOVE", JSON.stringify(r.data));
  // fresh (ab approved hai newId) -> naya open banao aur hatao
  const fresh2 = { ...fresh, order_number: "ORD-TEST-2", item_sku: "TEST-SKU-2" };
  let c = await req("POST", "/api/returns", fresh2);
  const delId = c.data.data.id;
  r = await req("DELETE", "/api/returns/" + delId, null);
  check("rm-open-200", r.status === 200, r.status);
  r = await req("GET", "/api/returns/" + delId);
  check("gone-404", r.status === 404, r.status);

  // 10. 404 shape
  r = await req("GET", "/api/returns/00000000-0000-0000-0000-000000000000");
  check("nf-404", r.status === 404 && r.data.error && r.data.error.code === "NOT_FOUND", JSON.stringify(r.data));

  // 11. Summary (dashboard cards)
  r = await req("GET", "/api/returns/summary");
  check("sum-200", r.status === 200, r.status);
  check("sum-total", r.data && typeof r.data.total === "number" && r.data.total >= 36, JSON.stringify(r.data));
  check("sum-statuses", r.data && ["open", "in_review", "approved", "rejected", "completed"].every((s) => typeof r.data.byStatus[s] === "number"), JSON.stringify(r.data && r.data.byStatus));

  console.log("\nRESULT pass=" + pass + " fail=" + fail);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("APITEST-ERROR", e.message); process.exit(1); });
