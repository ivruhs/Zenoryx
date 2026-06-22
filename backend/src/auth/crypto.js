/*
src/auth/crypto.js: The cryptographic engine. It signs raw database tokens with HMAC-SHA256 to create tamper-proof cookies, and verifies incoming cookies to ensure they were not forged.
*/

// signing and verifying session tokens using HMAC SHA256

const crypto = require("crypto");
const config = require("../config");

// signing a raw session token using HMAC SHA256.
// o/p is rawToken.signature

function signCookie(rawToken) {
  const hmac = crypto.createHmac("sha256", config.cookieSecret);
  hmac.update(rawToken);
  const signature = hmac.digest("hex");
  return `${rawToken}.${signature}`;
}

// verifying a signed session token using HMAC SHA256.
// if valid, return the rawToken, else return null
function verifyCookie(signedToken) {
  if (!signedToken || typeof signedToken !== "string") {
    return null;
  }
  const [rawToken, signature] = signedToken.split(".");
  if (!rawToken || !signature) {
    return null;
  }
  const hmac = crypto.createHmac("sha256", config.cookieSecret);
  hmac.update(rawToken);
  const expectedSignature = hmac.digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const actualBuffer = Buffer.from(signature, "hex");
  if (expectedBuffer.length !== actualBuffer.length) {
    return null;
  }
  if (crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    return rawToken;
  }
  return null;
}

module.exports = {
  signCookie,
  verifyCookie,
};
