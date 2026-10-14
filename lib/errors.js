// Consistent API error shape (plain JavaScript).
// Har refusal JSON me: { error: { code, message, details? } }
// Kabhi 200 me error nahi, kabhi HTML error page nahi.

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
  return new ApiError(404, "NOT_FOUND", message || "Request nahi mili.");
}

function conflict(code, message, details) {
  return new ApiError(409, code, message, details);
}

function json(data, status) {
  return Response.json(data, { status: status || 200 });
}

function fail(err) {
  // Anticipated business-rule refusal -> uska sahi status + code.
  if (err instanceof ApiError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details) body.error.details = err.details;
    return Response.json(body, { status: err.status });
  }
  // Unique violation jo kahin bach gayi (race) -> 409 me badlo.
  if (err && err.code === "23505") {
    return Response.json(
      {
        error: {
          code: "DUPLICATE_LIVE_REQUEST",
          message:
            "Is order + item par ek live request pehle se hai. Purani close hone ke baad nayi bana sakte ho.",
        },
      },
      { status: 409 }
    );
  }
  // Database hi nahi judi -> 500 me saaf wajah (ye anticipated nahi, setup issue hai).
  console.error("Unexpected API error:", err);
  return Response.json(
    {
      error: {
        code: "INTERNAL",
        message: "Server me kuch gadbad hui. Thodi der baad try karo.",
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
