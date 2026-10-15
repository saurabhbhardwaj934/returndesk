// Human-readable unique reference generator (plain JavaScript).
// Format: RET-XXXXXX (6 chars, confusing 0/O, 1/I/L removed).
// The DB has a UNIQUE constraint, on collision the caller retries.

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateReference() {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return "RET-" + s;
}

module.exports = { generateReference };
