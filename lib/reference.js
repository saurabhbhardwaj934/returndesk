// Human-readable unique reference generator (plain JavaScript).
// Format: RET-XXXXXX (6 chars, confuse hone wale 0/O, 1/I/L hataye hue).
// DB me UNIQUE constraint hai, collision ho to caller retry karta hai.

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateReference() {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return "RET-" + s;
}

module.exports = { generateReference };
