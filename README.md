# ReturnDesk

Live URL: https://returndesk-ashy.vercel.app/

Chhote online store ka returns desk. Agent return request raise karta hai, review karta hai,
approve/reject karta hai (refund / replacement / store credit), notes likhta hai, aur close karta hai.

Poora code **plain JavaScript + React + Next.js App Router** me hai (TypeScript nahi),
backend **Next.js route handlers**, DB **Supabase Postgres** (`pg` raw SQL), styling **Tailwind**.

## Setup (clean machine se)

1. Repo clone karo, Node 20+ chahiye:
   ```bash
   npm install
   ```
2. Supabase me free project banao. Project → Settings → Database → Connection string (URI, pooled port 6543) copy karo.
3. `.env` banao:
   ```bash
   cp .env.example .env
   # .env me DATABASE_URL me apna password + host dalo
   ```
4. Tables banao + seed dalo:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
5. Chalao:
   ```bash
   npm run dev
   # http://localhost:3000 kholo
   ```

Deploy (Vercel): project import karo, Env me `DATABASE_URL` (pooled URI) dalo, deploy se pehle ek baar
apne laptop se `npm run db:migrate` + `npm run db:seed` Supabase par chala do. Seed deploy par bhi loaded rahega.

## Kya bana hai (PDF mapping)

- Raise: customer + contact, order, item + qty, 5 reasons. Reference (`RET-XXXXXX`) server banata hai.
- Find: search (customer/order/reference) + status/reason filter + sort + paging — sab ek SQL query me
  (`WHERE ILIKE + COUNT(*) OVER() + LIMIT/OFFSET`). Browser me filter nahi hota. Search 350ms debounce.
- Work: detail par sab + notes purane-se-naye, note kabhi bhi (edit/delete API hai hi nahi),
  faisle se pehle edit, soft-remove (record DB me rehta hai).
- Interface: status badge, sirf legal buttons, loading/empty/error states, server refusal ki wajah dikhti hai, 375px mobile par cards.
- Seed: `scripts/seed.js` — 36 rows (8 open, 7 in_review, 7 approved, 7 rejected, 7 completed),
  har reason kam se kam 7 baar, aadhi rows par notes. `TRUNCATE` karke dobara chal sakta hai.

## 5 business rules (server par enforce, `lib/rules.js` single source)

1. Flow: `open → in_review → approved → completed`, `in_review → rejected`. Baaki sab `409 INVALID_TRANSITION`. Final se koi move nahi.
2. Approval: bina `refund/replacement/store_credit` ke approve mana (`409 RESOLUTION_REQUIRED`).
   Refund hai to amount `>0` integer cents me chahiye, refund nahi hai to amount mana (`409 INVALID_REFUND`).
3. One live per item: `(order_number, item_sku)` par live duplicate mana (`409 DUPLICATE_LIVE_REQUEST`).
   App check + race ke liye partial unique index dono hain. `rejected/completed` ke baad nayi allowed.
4. Locked: `approved/rejected/completed` ke baad PATCH mana (`409 LOCKED`). Notes phir bhi allowed.
5. Removal: `deleted_at` lagta hai (hard delete nahi). List se gayab + GET par `404`. Sirf `open/rejected` (`409 CANNOT_REMOVE` warna).

Error shape hamesha: `{ error: { code, message, details? } }` — `400` validation, `404` missing/hatayi,
`409` rule-refusal. `200` me error nahi, HTML error nahi, anticipated par `500` nahi.

## API

| Method | Path | Kaam |
|---|---|---|
| GET | `/api/returns?search=&status=&reason=&sort=created_at\|updated_at\|customer_name\|order_number&order=asc\|desc&page=&pageSize=` | List + `{ data, page, pageSize, total, totalPages }` |
| POST | `/api/returns` | Create → `201 { data }` (Rule 3) |
| GET | `/api/returns/:id` | Ek + notes ASC (`:id` = UUID ya reference) |
| PATCH | `/api/returns/:id` | Edit (Rule 4) |
| POST | `/api/returns/:id/status` `{ to, resolution?, refund_amount_cents? }` | Move (Rule 1+2) |
| POST | `/api/returns/:id/notes` `{ body }` | Note → `201` |
| DELETE | `/api/returns/:id` | Soft-remove (Rule 5) |

## Design decisions (kyu)

- Route handlers (alag Express nahi): ek Vercel deploy, PDF me allowed, frontend-backend ek repo.
- Raw SQL + `pg`: 2 tables ke liye ORM bhari padta, aur PDF query dekhna chahta hai — raw SQL me `WHERE/LIMIT` saaf dikhta hai.
- `lib/rules.js` + `lib/validate.js` single source: API enforce karta hai, frontend sirf gating ke liye import karta hai (button chhupana ≠ enforcement).
- Reference `RET-XXXXXX`: human-readable, unique constraint + collision retry.
- Detail `:id` me UUID + reference dono: URL `/requests/RET-S001` sundar, API flexible.
- Refund paise/cents (integer) me store: float rounding se bachne ke liye. UI ₹ me leta hai, `Math.round(rs*100)` bhejta hai.
- Plain JS validation (zod nahi): owner JS me defend kar sake, dependency kam.

## Assumptions (README me likhna PDF me bola hai)

- "Same item" = `(order_number, item_sku)` exact match. Naam alag ho par SKU same to same item.
- Auth nahi hai — single shared desk (PDF me login manga hi nahi).
- `completed` rows par resolution dikhta hai (approved se aaya hai).
- Sort whitelist me 5 columns; `pageSize` max 50.
- Time roughly: ~10-12 hours (plan + code + seed + UI).

## Kya adhura / next

- [ ] Live deploy URL (Vercel) + Supabase seed-loaded — ye step baaki hai, upar URL dalna hai.
- [ ] `npm run build` DB ke bina pass hota hai (pages static nahi, API `force-dynamic`), par Supabase se jodkar click-through test karna baaki.
- [ ] Next: refund total dashboard, audit log, order-autocomplete. Pehle deploy pakka karna hai.

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run db:migrate` — `db/migrate.sql` chalata hai
- `npm run db:seed` — 36 rows + notes
- `npm run lint`
