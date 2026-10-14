-- ReturnDesk schema. Khali database par seedha chalता है (idempotent).
-- Supabase / kisi bhi Postgres par kaam karta hai.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Statuses: open, in_review, approved, rejected, completed
-- Reasons: Damaged, Wrong Item, Size Issue, Not As Described, Changed Mind
-- Resolutions: refund, replacement, store_credit (sirf approved/completed par)

CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  order_number TEXT NOT NULL,
  item_sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL CHECK (reason IN ('Damaged', 'Wrong Item', 'Size Issue', 'Not As Described', 'Changed Mind')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'approved', 'rejected', 'completed')),
  resolution TEXT CHECK (resolution IS NULL OR resolution IN ('refund', 'replacement', 'store_credit')),
  refund_amount_cents INTEGER CHECK (refund_amount_cents IS NULL OR refund_amount_cents >= 0),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rule 3 (race-safe): ek order+item par sirf ek live request.
-- Live = deleted nahi AUR status rejected/completed me nahi.
CREATE UNIQUE INDEX IF NOT EXISTS returns_live_item_unique
  ON returns (order_number, item_sku)
  WHERE deleted_at IS NULL AND status NOT IN ('rejected', 'completed');

-- List page ke liye indexes (server-side search/filter/sort/paging isi par chalta hai).
CREATE INDEX IF NOT EXISTS returns_list_idx
  ON returns (deleted_at, status, reason, created_at DESC);
CREATE INDEX IF NOT EXISTS returns_search_idx
  ON returns (customer_name, order_number, reference);
CREATE INDEX IF NOT EXISTS returns_reference_idx ON returns (reference);
CREATE INDEX IF NOT EXISTS notes_return_idx ON notes (return_id, created_at ASC);
