// Input validation ek hi jagah (plain JavaScript, koi library nahi).
// API route handlers aur frontend form dono yahi use karte hain.
// Har function { field: message } object deta hai, khaali = sab sahi.

const { REASONS, RESOLUTIONS, STATUSES } = require("./rules");

function isEmail(v) {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function normStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

// POST /api/returns ke liye.
function checkCreate(b) {
  const e = {};
  const body = b || {};
  if (!normStr(body.customer_name)) e.customer_name = "Customer naam chahiye.";
  if (!normStr(body.customer_email)) e.customer_email = "Customer email chahiye.";
  else if (!isEmail(body.customer_email)) e.customer_email = "Email sahi likho.";
  // Phone string ya number dono chalega (form se hamesha string aata hai,
  // API test se number aa sakta hai). Sirf length check hoti hai.
  const phoneStr =
    body.customer_phone === undefined || body.customer_phone === null
      ? ""
      : String(body.customer_phone).trim();
  if (phoneStr.length > 30) {
    e.customer_phone = "Phone bahut lamba hai.";
  }
  if (!normStr(body.order_number)) e.order_number = "Order number chahiye.";
  if (!normStr(body.item_sku)) e.item_sku = "Item SKU chahiye.";
  if (!normStr(body.item_name)) e.item_name = "Item naam chahiye.";
  const q = Number(body.quantity);
  if (!Number.isInteger(q) || q <= 0) e.quantity = "Quantity 1 ya zyada honi chahiye.";
  if (q > 10000) e.quantity = "Quantity bahut zyada hai.";
  if (!REASONS.includes(body.reason)) {
    e.reason = "Reason inme se ek ho: " + REASONS.join(", ");
  }
  return e;
}

// PATCH /api/returns/:id ke liye (sirf faisle se pehle wale fields).
const PATCH_FIELDS = [
  "customer_name",
  "customer_email",
  "customer_phone",
  "order_number",
  "item_sku",
  "item_name",
  "quantity",
  "reason",
];

function checkPatch(b) {
  const e = {};
  const body = b || {};
  const keys = Object.keys(body).filter((k) => PATCH_FIELDS.includes(k));
  if (keys.length === 0) {
    e._ = "Kuch badalne ke liye kam se kam ek field do.";
    return e;
  }
  if ("customer_name" in body && !normStr(body.customer_name)) {
    e.customer_name = "Customer naam khaali nahi ho sakta.";
  }
  if ("customer_email" in body) {
    if (!normStr(body.customer_email)) e.customer_email = "Email khaali nahi ho sakta.";
    else if (!isEmail(body.customer_email)) e.customer_email = "Email sahi likho.";
  }
  if ("order_number" in body && !normStr(body.order_number)) {
    e.order_number = "Order number khaali nahi ho sakta.";
  }
  if ("item_sku" in body && !normStr(body.item_sku)) {
    e.item_sku = "Item SKU khaali nahi ho sakta.";
  }
  if ("item_name" in body && !normStr(body.item_name)) {
    e.item_name = "Item naam khaali nahi ho sakta.";
  }
  if ("quantity" in body) {
    const q = Number(body.quantity);
    if (!Number.isInteger(q) || q <= 0) e.quantity = "Quantity 1 ya zyada honi chahiye.";
  }
  if ("customer_phone" in body && body.customer_phone !== null) {
    const p = String(body.customer_phone).trim();
    if (p.length > 30) e.customer_phone = "Phone bahut lamba hai.";
  }
  if ("reason" in body && !REASONS.includes(body.reason)) {
    e.reason = "Reason inme se ek ho: " + REASONS.join(", ");
  }
  return e;
}

// POST .../status ke liye (basic shape; transition + approval rules.js dekhta hai).
function checkStatus(b) {
  const e = {};
  const body = b || {};
  if (!STATUSES.includes(body.to)) {
    e.to = "Target status inme se ek ho: " + STATUSES.join(", ");
  }
  if (body.to === "approved") {
    if (body.resolution && !RESOLUTIONS.includes(body.resolution)) {
      e.resolution = "Resolution refund, replacement ya store_credit ho.";
    }
  }
  return e;
}

// POST .../notes ke liye.
function checkNote(b) {
  const e = {};
  const body = b || {};
  if (!normStr(body.body)) e.body = "Note khaali nahi ho sakta.";
  else if (normStr(body.body).length > 2000) e.body = "Note 2000 characters se chhota rakho.";
  return e;
}

// GET list query params: search + filter + sort + paging, sab whitelist ke saath.
const SORTS = {
  created_at: "r.created_at",
  updated_at: "r.updated_at",
  customer_name: "r.customer_name",
  order_number: "r.order_number",
  status: "r.status",
  reference: "r.reference",
};

function parseListParams(sp) {
  const get = (k) => (sp && typeof sp.get === "function" ? sp.get(k) : sp[k]);
  const search = normStr(get("search")).slice(0, 100);
  const status = normStr(get("status"));
  const reason = normStr(get("reason"));
  const sortKey = SORTS[normStr(get("sort"))] ? normStr(get("sort")) : "created_at";
  const order = normStr(get("order")).toLowerCase() === "asc" ? "ASC" : "DESC";
  let page = parseInt(get("page"), 10);
  let pageSize = parseInt(get("pageSize"), 10);
  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(pageSize) || pageSize < 1) pageSize = 10;
  if (pageSize > 50) pageSize = 50;
  const errors = {};
  if (status && status !== "all" && !STATUSES.includes(status)) {
    errors.status = "Status galat hai.";
  }
  if (reason && reason !== "all" && !REASONS.includes(reason)) {
    errors.reason = "Reason galat hai.";
  }
  return {
    search,
    status: !status || status === "all" ? null : status,
    reason: !reason || reason === "all" ? null : reason,
    sortKey,
    sortSql: SORTS[sortKey],
    order,
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    errors,
  };
}

module.exports = {
  REASONS,
  RESOLUTIONS,
  STATUSES,
  checkCreate,
  checkPatch,
  checkStatus,
  checkNote,
  parseListParams,
  isEmail,
};
