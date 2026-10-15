// Consistent API error shape (plain JavaScript).
// Every refusal is JSON: { error: { code, message, details? } }
// Never an error inside 200, never an HTML error page.

class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function badRequest(message, details) {
  return new ApiError(400, "BAD_REQUEST", message, details);
}

function validation(message, details) {
  return new ApiError(400, "VALIDATION", message, details);
}

function notFound(message) {
  return new ApiError(404, "NOT_FOUND", message || "Request not found.");
}

function conflict(code, message, details) {
  return new ApiError(409, code, message, details);
}

function json(data, status) {
  return Response.json(data, { status: status || 200 });
}

function fail(err) {
  // Expected business-rule refusal -> its correct status + code.
  if (err instanceof ApiError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details) body.error.details = err.details;
    return Response.json(body, { status: err.status });
  }
  // Leftover unique violation (race) -> convert to 409.
  if (err && err.code === "23505") {
    return Response.json(
      {
        error: {
          code: "DUPLICATE_LIVE_REQUEST",
          message:
            "A live request already exists for this order + item. You can create a new one after the old one is closed.",
        },
      },
      { status: 409 }
    );
  }
  // Database is not connected -> clear 500 reason (not expected, it is a setup issue).
  console.error("Unexpected API error:", err);
  return Response.json(
    {
      error: {
        code: "INTERNAL",
        message: "Something went wrong on the server. Please try again later.",
      },
    },
    { status: 500 }
  );
}

module.exports = {
  ApiError,
  badRequest,
  validation,
  notFound,
  conflict,
  json,
  fail,
};
