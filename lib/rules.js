// All 5 business rules in one place (plain JavaScript).
// Both API and frontend import from here, so logic is not duplicated.
// Hiding a button is NOT enforcement — route handlers enforce using these functions.

const STATUSES = ["open", "in_review", "approved", "rejected", "completed"];

const REASONS = [
  "Damaged",
  "Wrong Item",
  "Size Issue",
  "Not As Described",
  "Changed Mind",
];

const RESOLUTIONS = ["refund", "replacement", "store_credit"];

// Rule 1: fixed lifecycle. Only these transitions are legal.
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

// Rule 5: only Open or Rejected can be removed.
function isRemovable(status) {
  return status === "open" || status === "rejected";
}

// Rule 1 check: is from -> to legal?
function transitionError(from, to) {
  if (!isValidStatus(from) || !isValidStatus(to)) {
    return "Status is invalid.";
  }
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    return (
      "This transition is not allowed: cannot go from " +
      (STATUS_LABELS[from] || from) +
      " to " +
      (STATUS_LABELS[to] || to) +
      "."
    );
  }
  return null;
}

// Rule 2 check: resolution + refund logic for Approved.
function approvalError(to, resolution, refundCents) {
  if (to !== "approved") return null;
  if (!resolution || !RESOLUTIONS.includes(resolution)) {
    return "Approval needs a resolution: refund, replacement or store_credit.";
  }
  if (resolution === "refund") {
    if (refundCents === null || refundCents === undefined || refundCents === "") {
      return "Refund needs a refund amount (> 0).";
    }
    const n = Number(refundCents);
    if (!Number.isInteger(n) || n <= 0) {
      return "Refund amount must be an integer above zero (in paise/cents).";
    }
    return null;
  }
  // If it is not a refund, no amount should be saved.
  if (
    refundCents !== null &&
    refundCents !== undefined &&
    refundCents !== "" &&
    Number(refundCents) !== 0
  ) {
    return "Refund amount is not allowed without a refund.";
  }
  return null;
}

// For frontend: which actions are legal in this status (display only,
// the server enforces the real check).
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
