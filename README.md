# ReturnDesk

Live URL: https://returndesk-ashy.vercel.app/

A returns desk for a small online store. An agent can raise a return request, review it,
approve or reject it (refund / replacement / store credit), add notes, and close it.

The full code is in **plain JavaScript + React + Next.js App Router** (no TypeScript).
Backend is **Next.js route handlers**, database is **Supabase Postgres** (raw SQL with `pg`),
styling is **Tailwind**.

## Setup (from a clean machine)

1. Clone the repo. You need Node 20+:
   ```bash
   npm install
   ```
2. Create a free project in Supabase. Go to Project → Settings → Database → copy the connection string (URI, pooled port 6543).
3. Create `.env`:
   ```bash
   cp .env.example .env
   # In .env, put your password and host inside DATABASE_URL
   ```
4. Create tables and add seed data:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
5. Run it:
   ```bash
   npm run dev
   # Open http://localhost:3000
   ```

Deploy (Vercel): import the project, add `DATABASE_URL` (pooled URI) in Env. Before deploy,
run `npm run db:migrate` + `npm run db:seed` once from your laptop against Supabase.
The seed data stays loaded on deploy too.

## What is built (PDF mapping)

- Raise: customer + contact, order, item + qty, 5 reasons. The server creates the reference (`RET-XXXXXX`).
- Find: search (customer/order/reference) + status/reason filter + sort + paging — all in one SQL query
  (`WHERE ILIKE + COUNT(*) OVER() + LIMIT/OFFSET`). No filtering in the browser. Search has 350ms debounce.
- Work: full detail page + notes oldest-first, notes can be added anytime (there is no edit/delete API),
  edit before decision, soft-remove (the record stays in the DB).
- Interface: status badge, only legal buttons, loading/empty/error states, server refusal reason is shown, cards for 375px mobile.
- Seed: `scripts/seed.js` — 36 rows (8 open, 7 in_review, 7 approved, 7 rejected, 7 completed),
  each reason at least 7 times, half of the rows have notes. It uses `TRUNCATE` so it can run again.

## 5 business rules (enforced on server, `lib/rules.js` is the single source)

1. Flow: `open → in_review → approved → completed`, `in_review → rejected`. All other moves give `409 INVALID_TRANSITION`. No move from a final state.
2. Approval: approve without `refund/replacement/store_credit` is denied (`409 RESOLUTION_REQUIRED`).
   For refund, amount must be `>0` integer cents. For non-refund, amount is not allowed (`409 INVALID_REFUND`).
3. One live request per item: duplicate live `(order_number, item_sku)` is denied (`409 DUPLICATE_LIVE_REQUEST`).
   Both app check and a partial unique index exist for race safety. A new request is allowed after `rejected/completed`.
4. Locked: `PATCH` after `approved/rejected/completed` is denied (`409 LOCKED`). Notes are still allowed.
5. Removal: sets `deleted_at` (no hard delete). Hidden from list + `404` on GET. Only `open/rejected` can be removed (`409 CANNOT_REMOVE` otherwise).

Error shape is always: `{ error: { code, message, details? } }` — `400` validation, `404` missing/removed,
`409` rule-refusal. No error inside `200`, no HTML error, no `500` for expected cases.

## API

| Method | Path | Work |
|---|---|---|
| GET | `/api/returns?search=&status=&reason=&sort=created_at\|updated_at\|customer_name\|order_number\|reference\|status&order=asc\|desc&page=&pageSize=` | List + `{ data, page, pageSize, total, totalPages }` |
| POST | `/api/returns` | Create → `201 { data }` (Rule 3) |
| GET | `/api/returns/:id` | One + notes ASC (`:id` = UUID or reference) |
| PATCH | `/api/returns/:id` | Edit (Rule 4) |
| POST | `/api/returns/:id/status` `{ to, resolution?, refund_amount_cents? }` | Move (Rule 1+2) |
| POST | `/api/returns/:id/notes` `{ body }` | Note → `201` |
| DELETE | `/api/returns/:id` | Soft-remove (Rule 5) |
| GET | `/api/returns/summary` | Dashboard counts `{ total, byStatus, byReason }` (only live rows) |

## Design decisions (why)

- Route handlers (no separate Express): one Vercel deploy, allowed by PDF, frontend and backend in one repo.
- Raw SQL + `pg`: ORM is heavy for 2 tables, and the PDF wants to see the query — `WHERE/LIMIT` is clear in raw SQL.
- `lib/rules.js` + `lib/validate.js` as single source: the API enforces it, the frontend imports it only for gating (hiding a button is not enforcement).
- Reference `RET-XXXXXX`: easy to read, unique constraint + retry on collision.
- Detail `:id` accepts UUID + reference both: URL `/requests/RET-S001` looks nice, API stays flexible.
- Refund is stored in paise/cents (integer): to avoid float rounding. The UI takes ₹, sends `Math.round(rs*100)`.
- Plain JS validation (no zod): easy to defend in JS, fewer dependencies.

## Assumptions (asked to write in README by PDF)

- "Same item" = exact match of `(order_number, item_sku)`. If the name is different but SKU is same, it is the same item.
  Order number is unique per customer, so customer is not matched separately.
- Status flow: `open` to direct `rejected` is not allowed — it must first go to `in_review`.
  The PDF diagram was unclear, this is a reasonable choice (if the evaluator sees `409` on `open → rejected`, this is the reason).
- If `resolution` is sent on a non-approved move, it is ignored (no error). Resolution is checked only for `approved`.
- No auth — single shared desk (the PDF did not ask for login).
- `completed` rows show resolution (it came from approved).
- Sort whitelist has 6 columns (`created_at, updated_at, customer_name, order_number, reference, status`); `pageSize` max is 50.
- Time taken: ~10-12 hours (plan + code + seed + UI).

## What is left / next

- [x] Live deploy (Vercel) + Supabase with seed — URL is above, total 36 verified on `/api/returns`.
- [x] `npm run build` passes. Click-through tested with Supabase.
- [ ] Next: refund total dashboard, audit log, order-autocomplete. Core is solid first.

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run db:migrate` — runs `db/migrate.sql` (only tables/index, no seed)
- `npm run db:seed` — 36 rows + notes (uses `TRUNCATE`, can run again)
- `node scripts/apitest.js [baseUrl]` — end-to-end test for 5 rules (run `db:seed` again after it)
- `node scripts/verify.js` — quick check of seed counts
- `npm run lint`
