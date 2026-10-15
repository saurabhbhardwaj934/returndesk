// Input validation in one place (plain JavaScript, no library).
// Both API route handlers and frontend forms use this.
// Each function returns a { field: message } object, empty means all good.

const { REASONS, RESOLUTIONS, STATUSES } = require("./rules");

function isEmail(v) {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function normStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

// For POST /api/returns.
function checkCreate(b) {
  const e = {};
  const body = b || {};
  if (!normStr(body.customer_name)) e.customer_name = "Customer name is required.";
  if (!normStr(body.customer_email)) e.customer_email = "Customer email is required.";
  else if (!isEmail(body.customer_email)) e.customer_email = "Enter a valid email.";
  // Phone can be a string or a number (forms always send a string,
  // API tests may send a number). Only the length is checked.
  const phoneStr =
    body.customer_phone === undefined || body.customer_phone === null
      ? ""
      : String(body.customer_phone).trim();
  if (phoneStr.length > 30) {
    e.customer_phone = "Phone number is too long.";
  }
  if (!normStr(body.order_number)) e.order_number = "Order number is required.";
  if (!normStr(body.item_sku)) e.item_sku = "Item SKU is required.";
  if (!normStr(body.item_name)) e.item_name = "Item name is required.";
  const q = Number(body.quantity);
  if (!Number.isInteger(q) || q <= 0) e.quantity = "Quantity must be 1 or more.";
  if (q > 10000) e.quantity = "Quantity is too high.";
  if (!REASONS.includes(body.reason)) {
    e.reason = "Reason must be one of: " + REASONS.join(", ");
  }
  return e;
}

// For PATCH /api/returns/:id (only fields allowed before decision).
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
    e._ = "Give at least one field to update.";
    return e;
  }
  if ("customer_name" in body && !normStr(body.customer_name)) {
    e.customer_name = "Customer name cannot be empty.";
  }
  if ("customer_email" in body) {
    if (!normStr(body.customer_email)) e.customer_email = "Email cannot be empty.";
    else if (!isEmail(body.customer_email)) e.customer_email = "Enter a valid email.";
  }
  if ("order_number" in body && !normStr(body.order_number)) {
    e.order_number = "Order number cannot be empty.";
  }
  if ("item_sku" in body && !normStr(body.item_sku)) {
    e.item_sku = "Item SKU cannot be empty.";
  }
  if ("item_name" in body && !normStr(body.item_name)) {
    e.item_name = "Item name cannot be empty.";
  }
  if ("quantity" in body) {
    const q = Number(body.quantity);
    if (!Number.isInteger(q) || q <= 0) e.quantity = "Quantity must be 1 or more.";
  }
  if ("customer_phone" in body && body.customer_phone !== null) {
    const p = String(body.customer_phone).trim();
    if (p.length > 30) e.customer_phone = "Phone number is too long.";
  }
  if ("reason" in body && !REASONS.includes(body.reason)) {
    e.reason = "Reason must be one of: " + REASONS.join(", ");
  }
  return e;
}

// For POST .../status (basic shape; transition + approval are checked in rules.js).
function checkStatus(b) {
  const e = {};
  const body = b || {};
  if (!STATUSES.includes(body.to)) {
    e.to = "Target status must be one of: " + STATUSES.join(", ");
  }
  if (body.to === "approved") {
    if (body.resolution && !RESOLUTIONS.includes(body.resolution)) {
      e.resolution = "Resolution must be refund, replacement or store_credit.";
    }
  }
  return e;
}

// For POST .../notes.
function checkNote(b) {
  const e = {};
  const body = b || {};
  if (!normStr(body.body)) e.body = "Note cannot be empty.";
  else if (normStr(body.body).length > 2000) e.body = "Keep the note under 2000 characters.";
  return e;
}

// GET list query params: search + filter + sort + paging, all with a whitelist.
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
    errors.status = "Status is invalid.";
  }
  if (reason && reason !== "all" && !REASONS.includes(reason)) {
    errors.reason = "Reason is invalid.";
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
