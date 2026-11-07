// HMAC-SHA256 signing for session cookies: cookie = "<rawToken>.<signature>".
// The raw token is only trusted if the signature verifies (constant-time compare).
const crypto = require("crypto");
const config = require("../config");

function sign(rawToken) {
  return crypto.createHmac("sha256", config.cookieSecret).update(rawToken).digest("hex");
}

function signCookie(rawToken) {
  return `${rawToken}.${sign(rawToken)}`;
}

/** @returns {string|null} the raw token if the signature is valid */
function verifyCookie(signedToken) {
  if (!signedToken || typeof signedToken !== "string") return null;
  const dot = signedToken.lastIndexOf(".");
  if (dot <= 0) return null;
  const rawToken = signedToken.slice(0, dot);
  const signature = signedToken.slice(dot + 1);
  if (!/^[a-f0-9]{64}$/.test(signature)) return null;
  const expected = Buffer.from(sign(rawToken), "hex");
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual) ? rawToken : null;
}

module.exports = { signCookie, verifyCookie };
