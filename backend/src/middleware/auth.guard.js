// Verifies the signed session cookie, loads the session + user, attaches req.user.
const prisma = require("../prisma/client");
const { verifyCookie } = require("../auth/crypto");

const SESSION_COOKIE = "session";

async function protect(req, res, next) {
  const rawToken = verifyCookie(req.cookies?.[SESSION_COOKIE]);
  if (!rawToken) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken: rawToken },
    include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
  });

  if (!session) {
    return res.status(401).json({ error: "Session has expired or been revoked." });
  }
  if (session.expiresAt < new Date()) {
    await prisma.session.deleteMany({ where: { sessionToken: rawToken } });
    return res.status(401).json({ error: "Session expired. Please sign in again." });
  }

  req.user = session.user;
  req.sessionToken = rawToken;
  return next();
}

module.exports = { protect, SESSION_COOKIE };
