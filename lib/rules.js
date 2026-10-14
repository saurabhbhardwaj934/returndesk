// Saare 5 business rules ek hi jagah (plain JavaScript).
// API aur frontend dono yahi import karte hain, taaki logic duplicate na ho.
// Button chhupana enforcement NAHI hai — asli rok route handlers me yahi functions lagate hain.

const STATUSES = ["open", "in_review", "approved", "rejected", "completed"];

const REASONS = [
  "Damaged",
  "Wrong Item",
  "Size Issue",
  "Not As Described",
  "Changed Mind",
];

const RESOLUTIONS = ["refund", "replacement", "store_credit"];

// Rule 1: fixed lifecycle. Sirf ye transitions legal hain.
const ALLOWED_TRANSITIONS = {
  open: ["in_review"],
  in_review: ["approved", "rejected"],
  approved: ["completed"],
  rejected: [],
  completed: [],
};

const STATUS_LABELS = {
  open: "Open",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
};

const FINAL_STATUSES = ["rejected", "completed"];
const DECIDED_STATUSES = ["approved", "rejected", "completed"];

function isValidStatus(s) {
  return STATUSES.includes(s);
}

function isDecided(status) {
  return DECIDED_STATUSES.includes(status);
}

// Rule 5: sirf Open ya Rejected hat sakta hai.
function isRemovable(status) {
  return status === "open" || status === "rejected";
}

// Rule 1 check: from -> to legal hai?
function transitionError(from, to) {
  if (!isValidStatus(from) || !isValidStatus(to)) {
    return "Status galat hai.";
  }
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    return (
      "Ye transition allowed nahi: " +
      (STATUS_LABELS[from] || from) +
      " se " +
      (STATUS_LABELS[to] || to) +
      " nahi ja sakte."
    );
  }
  return null;
}

// Rule 2 check: Approved ke liye resolution + refund logic.
function approvalError(to, resolution, refundCents) {
  if (to !== "approved") return null;
  if (!resolution || !RESOLUTIONS.includes(resolution)) {
    return "Approved karne ke liye resolution chahiye: refund, replacement ya store_credit.";
  }
  if (resolution === "refund") {
    if (refundCents === null || refundCents === undefined || refundCents === "") {
      return "Refund ke liye refund amount (> 0) chahiye.";
    }
    const n = Number(refundCents);
    if (!Number.isInteger(n) || n <= 0) {
      return "Refund amount zero se bada integer (paise/cents me) hona chahiye.";
    }
    return null;
  }
  // refund nahi hai to amount record nahi hona chahiye.
  if (
    refundCents !== null &&
    refundCents !== undefined &&
    refundCents !== "" &&
    Number(refundCents) !== 0
  ) {
    return "Refund ke bina koi refund amount record nahi ho sakta.";
  }
  return null;
}

// Frontend ke liye: is status me kaunsi actions legal hain (sirf dikhane ke liye,
// asli rok server lagata hai).
function legalActions(status) {
  return {
    canEdit: status === "open" || status === "in_review",
    canRemove: isRemovable(status),
    nextStatuses: ALLOWED_TRANSITIONS[status] || [],
  };
}

module.exports = {
  STATUSES,
  REASONS,
  RESOLUTIONS,
  ALLOWED_TRANSITIONS,
  STATUS_LABELS,
  FINAL_STATUSES,
  DECIDED_STATUSES,
  isValidStatus,
  isDecided,
  isRemovable,
  transitionError,
  approvalError,
  legalActions,
};
