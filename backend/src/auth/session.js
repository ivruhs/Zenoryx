// Server-side session store (Postgres). Revocation = deleting the row.
const crypto = require("crypto");
const prisma = require("../prisma/client");

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function createSession(userId, userAgent = "Unknown") {
  const rawToken = crypto.randomBytes(48).toString("hex");
  await prisma.session.create({
    data: {
      sessionToken: rawToken,
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      userAgent: String(userAgent).slice(0, 300),
    },
  });
  // Opportunistic cleanup of this user's expired sessions (no cron needed).
  prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } }).catch(() => {});
  return rawToken;
}

/** Idempotent: deleting an already-deleted session is not an error. */
async function deleteSession(rawToken) {
  await prisma.session.deleteMany({ where: { sessionToken: rawToken } });
}

module.exports = { createSession, deleteSession, SESSION_TTL_MS };
